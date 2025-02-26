import os
import io
import json
import time
from PyPDF2 import PdfReader
import requests
from fastapi import FastAPI, File, HTTPException,  UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
from tavily import TavilyClient
import asyncpg
from supabase import create_client, client
from dotenv import load_dotenv


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or list the domains you want to allow
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------
# Environment Variables
# ----------------------------

# Load environment variables from .env file
load_dotenv()

# Now access environment variables without default values
NEOND_DB_HOST = os.environ.get("NEOND_DB_HOST")
NEOND_DB_NAME = os.environ.get("NEOND_DB_NAME")
NEOND_DB_USER = os.environ.get("NEOND_DB_USER")
NEOND_DB_PASSWORD = os.environ.get("NEOND_DB_PASSWORD")

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

JINAAI_API_KEY = os.environ.get("JINAAI_API_KEY")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
GOOGLE_VERTEX_API_KEY = os.environ.get("GOOGLE_VERTEX_API_KEY")


# ----------------------------
# Database Connection Helpers
# ----------------------------
async def get_neon_connection():
    try:
        connection = await asyncpg.connect(
            user=NEOND_DB_USER,
            password=NEOND_DB_PASSWORD,
            database=NEOND_DB_NAME,
            host=NEOND_DB_HOST
        )
        return connection
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection error: {str(e)}")

async def get_log_connection():
    try:
        connection = await asyncpg.connect(POSTGRES_LOG_DB_URL)
        return connection
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Log database connection error: {str(e)}")

# ----------------------------
# Pydantic Models
# ----------------------------
class ChatRequest(BaseModel):
    query: str
    isSearchMode: bool

class ChatResponse(BaseModel):
    answer: str
    search: str
    duration: float

class PDFUpload(BaseModel):
    file: UploadFile 


# ----------------------------
# Embedding Generation
# ----------------------------

def get_embedding(text: str) -> list:
    """
    Generates an embedding for the input text using Jina AI's Embedding API.
    Uses the "jina-embeddings-v2-base-en" model for document retrieval.
    """
    # Jina AI API endpoint
    url = "https://api.jina.ai/v1/embeddings"
    
    # Request headers
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {JINAAI_API_KEY}"
    }
    
    # API request payload
    payload = {
        "input": [text],  # Single text input wrapped in a list
        "model": "jina-embeddings-v2-base-en"  # Specify the embedding model
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()  # Raise an error if the request fails
        data = response.json()
        
        # Extract embeddings from the API response
        if "data" in data and data["data"]:
            return data["data"][0]["embedding"]  # Return the embedding vector (list of floats)
        else:
            raise HTTPException(status_code=500, detail="No embeddings returned from Jina AI API.")
    
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Jina AI API request failed: {str(e)}")

# ----------------------------
# NeonDB Vector Retrieval
# ----------------------------
async def search_neon_chunks(query_embedding: list, top_n: int = 5):
    """
    Searches the NeonDB vector table (assumed to be named 'document_chunks')
    for the top_n most similar text chunks.
    The table should have at least the columns: chunk_text and embedding (pgvector type).
    """
    conn = await get_neon_connection()  # Get the async connection

    try:
        # The operator <=> computes the cosine distance between vectors.
        search_query = """
            SELECT chunk_text
            FROM document_chunks
            ORDER BY embedding <=> $1
            LIMIT $2;
        """
        
        # Fetch the results using asyncpg's `fetch` method, which is asynchronous
        results = await conn.fetch(search_query, json.dumps(query_embedding), top_n)

        # Return the chunk texts from the results
        return [row['chunk_text'] for row in results]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching NeonDB: {str(e)}")

    finally:
        await conn.close() 

# ----------------------------
# Tavilly API Integration
# ----------------------------
def fetch_tavilly_data(query: str) -> str:
    """
    Fetch extra topical information from Tavilly.
    """
    try:
        response = TavillyClient.search(
            query=query,
        )
        print(response)
        return response
    except Exception as e:
        print(f"Error fetching Tavilly data: {e}")
    return ""

# ----------------------------
# Gemini API Call
# ----------------------------
def generate_response_with_gemini(prompt: str) -> str:
    """
    Calls Google Gemini 2.0 Flash API using the official Python SDK.
    """
    model = genai.GenerativeModel("gemini-2.0-flash")

    response = model.generate_content(
        prompt,
        stream=True,
        generation_config={
            "temperature": 0.3,
            "max_output_tokens": 1024,
            "response_mime_type": "text/plain"
        },
        safety_settings=[  # Optional: Adjust safety settings
            {"category": "harm_category_hate_speech", "threshold": "block_none"},
            {"category": "harm_category_sexual", "threshold": "block_none"},
            {"category": "harm_category_dangerous", "threshold": "block_none"},
        ]
    )

    # Extract response text
    return response.text if response.text else "No response generated."

# ----------------------------
# PDF Upload Endpoint
# ----------------------------
@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    """
    Accepts a PDF file, extracts text using PyPDF2, generates embeddings, and stores it in NeonDB.
    """
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    try:
        # Read the PDF file as bytes
        pdf_bytes = await file.read()

        # Convert bytes to a file-like object using BytesIO
        pdf_stream = io.BytesIO(pdf_bytes)

        # Create a PDF reader object
        reader = PdfReader(pdf_stream)

        # Extract text from all pages
        text = "\n".join([page.extract_text() or "" for page in reader.pages])

        # Sanitize the text by removing null bytes (invalid UTF-8 sequences)
        sanitized_text = text.replace('\x00', '')

        if not sanitized_text.strip():
            raise HTTPException(status_code=400, detail="No text found in the PDF.")

        # Generate embedding (ensure this function exists)
        embedding = get_embedding(sanitized_text)

        # Store text and embedding in NeonDB using asyncpg
        try:
            conn = await get_neon_connection()  # Use asyncpg for async DB calls
            query = """
                INSERT INTO document_chunks (chunk_text, embedding) 
                VALUES ($1, $2);
            """
            await conn.execute(query, sanitized_text, json.dumps(embedding))  # Store embedding as JSON
            await conn.close()  # Close the connection asynchronously
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

        return {"message": "PDF uploaded and stored successfully!"}

    except Exception as e:
        print(f"error: {str(e)}") 
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")
    
# ----------------------------
# Chat Endpoint
# ----------------------------
@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(chat_req: ChatRequest):
    print(chat_req)
    """
    Handles chat queries by retrieving context from stored PDFs in NeonDB.
    Optionally supplements the response with Tavilly data if isSearchMode is False.
    """
    query = chat_req.query
    start_time = time.time()

    # 1. Generate embedding for the query
    query_embedding = get_embedding(query)

    # 2. Retrieve similar text chunks from NeonDB (only from stored PDFs)
    retrieved_chunks = await search_neon_chunks(query_embedding, top_n=5)
    pdf_context = "\n".join(retrieved_chunks) if retrieved_chunks else "No relevant PDFs found."

    tavily_context = ""
    if chat_req.isSearchMode:
        # In search mode, supplement with Tavilly data
        tavily_info = fetch_tavilly_data(query)
        # Convert tavily_info to a string even if it's a dict
        if isinstance(tavily_info, dict):
            tavily_context = json.dumps(tavily_info)
        else:
            tavily_context = str(tavily_info)
        if not tavily_context:
            tavily_context = "No additional web info found."

    print(tavily_context, chat_req.isSearchMode)
    # 5. Construct the final prompt for Gemini
    prompt = f"""
    You are answering a user query based on multiple sources:

    PDF Context:
    {pdf_context}

    {'Web Search Context:\n' + tavily_context if tavily_context else ''}

    Now, answer the question as accurately as possible:
    {query}
    """

    print("Prompt:", prompt)
    
    async def sse_generator():
        # 1. Send metadata (tavily_context, duration) as a single SSE event
        duration = time.time() - start_time # Calculate duration here, before streaming answer
        metadata = {"search": tavily_context, "duration": duration}
        yield f"data: {json.dumps({'type': 'metadata', 'data': metadata})}\n\n"

        # 2. Stream the answer from Gemini as SSE events
        async for chunk in generate_response_with_gemini(prompt):
            yield chunk

    return ChatResponse(
        sse_generator(),
        media_type="text/event-stream"
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)