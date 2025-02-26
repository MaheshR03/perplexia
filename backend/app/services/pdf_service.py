import io
from PyPDF2 import PdfReader
from fastapi import HTTPException, UploadFile
from .embedding_service import get_embedding
from .neon_service import get_neon_connection
import json
import logging

logger = logging.getLogger(__name__)

async def process_pdf_and_store(file: UploadFile, user_id: int, db): # Added db dependency and user_id
    """Processes PDF, generates embeddings, stores in NeonDB and metadata in PostgreSQL."""
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    try:
        pdf_bytes = await file.read()
        pdf_stream = io.BytesIO(pdf_bytes)
        reader = PdfReader(pdf_stream)
        text = "\n".join([page.extract_text() or "" for page in reader.pages])
        sanitized_text = text.replace('\x00', '')

        if not sanitized_text.strip():
            raise HTTPException(status_code=400, detail="No text found in the PDF.")

        # Store PDF Document metadata first in PostgreSQL
        pdf_document_db = db_models.PDFDocument(user_id=user_id, filename=file.filename)
        db.add(pdf_document_db)
        db.commit()
        db.refresh(pdf_document_db) # Get the generated ID

        chunks = chunk_text_into_segments(sanitized_text) # Implement chunking function

        for index, chunk_text in enumerate(chunks):
            embedding = get_embedding(chunk_text) # Generate embedding for each chunk
            neon_chunk_id = await store_chunk_to_neondb(chunk_text, embedding) # Function to store to NeonDB, returns ID if needed

            # Store PDFChunk metadata in PostgreSQL, linking to PDFDocument and NeonDB ID
            pdf_chunk_metadata = db_models.PDFChunk(
                pdf_document_id=pdf_document_db.id,
                chunk_index=index,
                neon_db_chunk_id=neon_chunk_id # Store NeonDB ID here
            )
            db.add(pdf_chunk_metadata)

        db.commit() # Commit all chunk metadata at once

        return {"message": "PDF uploaded and processed successfully!", "pdf_document_id": pdf_document_db.id}

    except Exception as e:
        db.rollback() # Rollback in case of any error
        logger.error(f"Error processing PDF: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")


async def store_chunk_to_neondb(chunk_text, embedding):
    """Stores a text chunk and its embedding in NeonDB. Returns a chunk ID if needed."""
    conn = await get_neon_connection()
    try:
        query = """
            INSERT INTO document_chunks (chunk_text, embedding)
            VALUES ($1, $2)
            RETURNING id; -- Assuming 'id' is the primary key and you want to return it
        """ # Modify if your NeonDB schema is different, and if you want to retrieve an ID
        result = await conn.fetchrow(query, chunk_text, json.dumps(embedding))
        await conn.close()
        if result and 'id' in result: # Adjust key name if your ID column is named differently
            return str(result['id']) # Or result['chunk_id'] etc., convert to string for storage
        return None # Or generate a UUID here if NeonDB doesn't auto-generate and return IDs

    except Exception as e:
        await conn.close()
        raise HTTPException(status_code=500, detail=f"Database error storing chunk to NeonDB: {str(e)}")


def chunk_text_into_segments(text, max_chunk_size=512, overlap=50):
    """
    More sophisticated text chunking with overlap for better context preservation.

    Args:
        text (str): The text to chunk
        max_chunk_size (int): Maximum size of each chunk
        overlap (int): Number of characters to overlap between chunks

    Returns:
        list: List of text chunks
    """
    if not text:
        return []

    # First, split by paragraphs
    paragraphs = [p for p in text.split('\n\n') if p.strip()]

    chunks = []
    current_chunk = ""

    for paragraph in paragraphs:
        # If adding this paragraph keeps us under the limit, add it
        if len(current_chunk) + len(paragraph) < max_chunk_size:
            current_chunk += paragraph + "\n\n"
        else:
            # If current chunk has content, add it to chunks
            if current_chunk:
                chunks.append(current_chunk.strip())

            # If paragraph is larger than max_chunk_size, split it
            if len(paragraph) > max_chunk_size:
                words = paragraph.split()
                current_chunk = ""

                for word in words:
                    if len(current_chunk) + len(word) + 1 < max_chunk_size:
                        current_chunk += word + " "
                    else:
                        chunks.append(current_chunk.strip()) # Add overlap by taking the last few words
                        overlap_text = " ".join(current_chunk.split()[-overlap:]) if overlap > 0 else ""
                        current_chunk = overlap_text + " " + word + " "
            else:
                current_chunk = paragraph + "\n\n"

    # Add the last chunk if it has content
    if current_chunk.strip():
        chunks.append(current_chunk.strip())

    return chunks


# Example function to retrieve chunks from NeonDB based on PDF Document ID (you'll need to adjust based on how you link them)
async def get_neon_chunks_by_pdf_document_id(pdf_document_id: int):
    """Retrieves NeonDB chunk texts associated with a PDF Document ID (example, adjust as needed)."""
    conn = await get_neon_connection()
    try:
        #  This is a simplified example, you'll likely need a way to link PDFDocument ID to NeonDB chunks
        #  If you stored NeonDB chunk IDs in PostgreSQL (PDFChunk), you can query based on those.
        #  For now, this is just a placeholder - adjust based on your actual data linking strategy.
        search_query = """
            SELECT chunk_text
            FROM document_chunks -- Assuming document_chunks table
            LIMIT 10; -- Placeholder, adjust the query to filter by PDFDocument ID or related metadata
        """ # You'll need to modify this query significantly based on your linking strategy
        results = await conn.fetch(search_query) # Placeholder query
        return [row['chunk_text'] for row in results] # Placeholder return

    except Exception as e:
        logger.error(f"Error retrieving NeonDB chunks: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving NeonDB chunks: {str(e)}")
    finally:
        await conn.close()