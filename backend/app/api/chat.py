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
from app.services import chat_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/stream", response_class=StreamingResponse)
async def chat_stream_endpoint(
    chat_req: ChatRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: db_models.User = Depends(auth.get_current_user)
):
    """Chat stream endpoint - now calling the handler."""
    return await chat_service.chat_stream_handler(chat_req, request, db, current_user) # Call the handler


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