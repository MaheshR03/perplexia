from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import StreamingResponse
import time
import json
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.chat_models import ChatRequest
from app.services import neon_service, tavily_service, gemini_service, embedding_service
from app.models import db_models
from app.api import auth # Import your auth dependency/function
import asyncio

router = APIRouter()

@router.post("/stream", response_class=StreamingResponse) # Updated endpoint path and response class
async def chat_stream_endpoint(chat_req: ChatRequest, request: Request, db: Session = Depends(get_db), current_user: db_models.User = Depends(auth.get_current_user)): # Added auth and db dependencies
    """Handles chat queries and streams responses with SSE."""
    query = chat_req.query
    start_time = time.time()
    chat_session_id = chat_req.chat_session_id # Get session ID from request

    # Get or create chat session
    if chat_session_id:
        chat_session = db.query(db_models.ChatSession).filter(db_models.ChatSession.id == chat_session_id, db_models.ChatSession.user_id == current_user.id).first()
        if not chat_session:
            raise HTTPException(status_code=404, detail="Chat session not found or not owned by user")
    else:
        chat_session = db_models.ChatSession(user_id=current_user.id) # Create new session
        db.add(chat_session)
        db.commit()
        db.refresh(chat_session)
        chat_session_id = chat_session.id # Get new session ID


    query_embedding = embedding_service.get_embedding(query)
    retrieved_chunks = await neon_service.search_neon_chunks(query_embedding, top_n=5) # Adjust search if needed to filter by user/PDFs

    pdf_context = "\n".join(retrieved_chunks) if retrieved_chunks else "No relevant PDFs found."
    tavily_context = ""
    if chat_req.isSearchMode:
        tavily_info = tavily_service.fetch_tavily_data(query)
        tavily_context = json.dumps(tavily_info) if isinstance(tavily_info, dict) else str(tavily_info)
        if not tavily_context:
            tavily_context = "No additional web info found."

    prompt = f"""
    You are answering a user query based on provided document context and optional web search results.

    Document Context:
    {pdf_context}

    {'Web Search Results:\n' + tavily_context if tavily_context else ''}

    Question: {query}
    """

    async def sse_generator():
        # 1. Send metadata (tavily_context, duration) as a single SSE event
        duration = time.time() - start_time
        metadata = {"search": tavily_context, "duration": duration, "chat_session_id": chat_session_id} # Send session ID back
        yield f"data: {json.dumps({'type': 'metadata', 'data': metadata})}\n\n"

        full_answer = "" # To store complete answer for DB logging

        async for chunk in gemini_service.generate_response_with_gemini_streaming(prompt):
            if await request.is_disconnected(): # Check if client disconnected
                print("Client disconnected, stopping stream.")
                break
            chunk_data = json.loads(chunk.removeprefix("data: ").removesuffix("\n\n")) # Extract JSON from SSE string
            chunk_text = chunk_data.get('text', '')
            full_answer += chunk_text # Append to full answer
            yield chunk # Yield the SSE chunk

        # Store chat messages in DB after streaming is complete (or in chunks if needed)
        user_message = db_models.ChatMessage(session_id=chat_session_id, user_id=current_user.id, content=query, is_user_message=True)
        bot_message = db_models.ChatMessage(session_id=chat_session_id, user_id=None, content=full_answer, is_user_message=False) # Bot message, user_id can be None or a system user ID
        db.add_all([user_message, bot_message])
        db.commit()

    return StreamingResponse(sse_generator(), media_type="text/event-stream")