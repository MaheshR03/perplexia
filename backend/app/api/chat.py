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
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/stream", response_class=StreamingResponse) # Updated endpoint path and response class
async def chat_stream_endpoint(chat_req: ChatRequest, request: Request, db: Session = Depends(get_db), current_user: db_models.User = Depends(auth.get_current_user)): # Added auth and db dependencies
    """Handles chat queries and streams responses with SSE."""
    query = chat_req.query
    start_time = time.time()
    chat_session_id = chat_req.chat_session_id # Get session ID from request

    # Get or create chat session
    if chat_session_id:
        session_result = await db.execute(db.select(db_models.ChatSession).filter(db_models.ChatSession.id == chat_session_id, db_models.ChatSession.user_id == current_user.id)) # Async DB query
        chat_session = session_result.scalar_one_or_none() # Get single scalar result or None
        if not chat_session:
            raise HTTPException(status_code=404, detail="Chat session not found or not owned by user")
    else:
        chat_session = db_models.ChatSession(user_id=current_user.id) # Create new session
        db.add(chat_session)
        await db.commit()
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
    
    # Get recent chat history (last 10 messages)
    chat_history = []
    if chat_session_id:
        messages_result = await db.execute( # Async DB query
            db.select(db_models.ChatMessage)
            .filter(db_models.ChatMessage.session_id == chat_session_id)
            .order_by(db_models.ChatMessage.created_at.desc()).limit(10)
        )
        messages = messages_result.scalars().all() # Get scalar results

        # Reverse to get correct chronological order
        messages = list(reversed(messages))

        for msg in messages:
            role = "user" if msg.is_user_message else "assistant"
            chat_history.append(f"{role}: {msg.content}")

    # Get chat history formatted as string
    chat_history_str = "\n".join(chat_history) if chat_history else "No previous messages in this chat."

    prompt = f"""
    You are a helpful assistant. Use the context provided to answer the user question at the end.

    **Document Context:**
    {pdf_context}

    **Chat History:**
    {chat_history_str}

    **User Question:** {query}"""

    async def sse_generator():
        # 1. Send metadata (tavily_context, duration) as a single SSE event
        duration = time.time() - start_time
        metadata = {
            "search": tavily_context,
            "duration": duration,
            "chat_session_id": chat_session_id
        }
        yield f"data: {json.dumps({'type': 'metadata', 'data': metadata})}\n\n"

        full_answer = ""
        buffer = []  # Buffer for batching messages
        buffer_size = 5  # Number of chunks to buffer before sending

        async for chunk in gemini_service.generate_response_with_gemini_streaming(prompt):
            if await request.is_disconnected(): # Check if client disconnected
                logger.info("Client disconnected, stopping stream.")
                break
            chunk_data = json.loads(chunk.removeprefix("data: ").removesuffix("\n\n")) # Extract JSON from SSE string
            chunk_text = chunk_data.get('text', '')
            full_answer += chunk_text

            buffer.append(chunk)

            # Send buffered chunks when buffer is full
            if len(buffer) >= buffer_size:
                for buffered_chunk in buffer:
                    yield buffered_chunk
                buffer = []

        # Send any remaining buffered chunks
        for buffered_chunk in buffer:
            yield buffered_chunk

         # Store chat messages in DB after streaming is complete (or in chunks if needed)
        user_message = db_models.ChatMessage(
            session_id=chat_session_id, user_id=current_user.id, content=query, is_user_message=True
        )
        bot_message = db_models.ChatMessage(
            session_id=chat_session_id, user_id=None, content=full_answer, is_user_message=False
        ) # Bot message, user_id can be None or a system user ID
        db.add_all([user_message, bot_message]) # Add both messages to session
        await db.commit() # Async commit

    return StreamingResponse(sse_generator(), media_type="text/event-stream")

@router.get("/sessions", response_model=list[dict]) # ADD THIS ENDPOINT
async def list_chat_sessions(db: Session = Depends(get_db), current_user: db_models.User = Depends(auth.get_current_user)):
    """Lists all chat sessions for the current user."""
    sessions = await db.execute(db.select(db_models.ChatSession).filter(db_models.ChatSession.user_id == current_user.id)) # Async DB query
    sessions = sessions.scalars().all() # Get scalar results
    return [{
        "id": session.id,
        "name": session.name,
        "created_at": session.created_at,
        "message_count": len(session.messages)
    } for session in sessions]

@router.get("/sessions/{session_id}", response_model=dict) # ADD THIS ENDPOINT
async def get_chat_session(session_id: int, db: Session = Depends(get_db), current_user: db_models.User = Depends(auth.get_current_user)):
    """Gets details of a specific chat session including messages."""
    session_result = await db.execute( # Async DB query
        db.select(db_models.ChatSession)
        .filter(db_models.ChatSession.id == session_id, db_models.ChatSession.user_id == current_user.id)
    )
    session = session_result.scalar_one_or_none() # Get single scalar result or None

    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    messages_result = await db.execute( # Async DB query
        db.select(db_models.ChatMessage)
        .filter(db_models.ChatMessage.session_id == session_id)
        .order_by(db_models.ChatMessage.created_at)
    )
    messages = messages_result.scalars().all() # Get scalar results

    return {
        "id": session.id,
        "name": session.name,
        "created_at": session.created_at,
        "messages": [{
            "id": msg.id,
            "content": msg.content,
            "is_user_message": msg.is_user_message,
            "created_at": msg.created_at
        } for msg in messages]
    }

@router.put("/sessions/{session_id}", response_model=dict) # ADD THIS ENDPOINT
async def update_chat_session(
    session_id: int,
    session_data: dict,
    db: Session = Depends(get_db),
    current_user: db_models.User = Depends(auth.get_current_user)
):
    """Updates chat session properties (e.g., name)."""
    session_result = await db.execute( # Async DB query
        db.select(db_models.ChatSession)
        .filter(db_models.ChatSession.id == session_id, db_models.ChatSession.user_id == current_user.id)
    )
    session = session_result.scalar_one_or_none() # Get single scalar result or None

    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    if "name" in session_data:
        session.name = session_data["name"]

    await db.commit() # Async commit

    return {"id": session.id, "name": session.name, "created_at": session.created_at}

@router.delete("/sessions/{session_id}", response_model=dict) # ADD THIS ENDPOINT
async def delete_chat_session(session_id: int, db: Session = Depends(get_db), current_user: db_models.User = Depends(auth.get_current_user)):
    """Deletes a chat session and all its messages."""
    session_result = await db.execute( # Async DB query
        db.select(db_models.ChatSession)
        .filter(db_models.ChatSession.id == session_id, db_models.ChatSession.user_id == current_user.id)
    )
    session = session_result.scalar_one_or_none() # Get single scalar result or None

    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    # Delete all messages in the session - Async delete
    await db.execute(
        db.delete(db_models.ChatMessage)
        .where(db_models.ChatMessage.session_id == session_id)
    )

    # Delete session-PDF associations if you added those - Async delete
    await db.execute(
        db.delete(db_models.ChatSessionPDF)
        .where(db_models.ChatSessionPDF.chat_session_id == session_id)
    )

    # Delete the session itself - Async delete
    await db.delete(session)
    await db.commit() # Async commit

    return {"message": "Chat session and all associated messages deleted successfully"}