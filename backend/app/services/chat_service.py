from fastapi import HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import time
import json
from app.services import neon_service, tavily_service, gemini_service, embedding_service
from app.models import db_models
import logging

logger = logging.getLogger(__name__)

async def chat_stream_handler(chat_req, request: Request, db: Session, current_user: db_models.User) -> StreamingResponse:
    """Handles the chat stream logic, offloaded from the route."""
    query = chat_req.query
    start_time = time.time()
    chat_session_id = chat_req.chat_session_id

    # Get or create chat session (logic remains the same as in your route)
    if chat_session_id:
        session_result = await db.execute(db.select(db_models.ChatSession).filter(db_models.ChatSession.id == chat_session_id, db_models.ChatSession.user_id == current_user.id))
        chat_session = session_result.scalar_one_or_none()
        if not chat_session:
            raise HTTPException(status_code=404, detail="Chat session not found or not owned by user")
    else:
        chat_session = db_models.ChatSession(user_id=current_user.id)
        db.add(chat_session)
        await db.commit()
        db.refresh(chat_session)
        chat_session_id = chat_session.id

    query_embedding = embedding_service.get_embedding(query)
    retrieved_chunks = await neon_service.search_neon_chunks(db, query_embedding, top_n=5)  # Pass db session to neon_service

    pdf_context = "\n".join(retrieved_chunks) if retrieved_chunks else "No relevant PDFs found."
    tavily_context = ""
    if chat_req.isSearchMode:
        tavily_info = tavily_service.fetch_tavily_data(query)
        tavily_context = json.dumps(tavily_info) if isinstance(tavily_info, dict) else str(tavily_info)
        if not tavily_context:
            tavily_context = "No additional web info found."

    prompt = f"""
    You are a helpful assistant. Use the context provided to answer the user question at the end.

    **Document Context:**
    {pdf_context}

    **Chat History:**
    {chat_history_str}

    **User Question:** {query}"""

    async def sse_generator():
        # 1. Send metadata
        duration = time.time() - start_time
        metadata = {"search": tavily_context, "duration": duration, "chat_session_id": chat_session_id}
        yield f"data: {json.dumps({'type': 'metadata', 'data': metadata})}\n\n"

        full_answer = ""
        buffer = []
        buffer_size = 5

        async for chunk in gemini_service.generate_response_with_gemini_streaming(prompt):
            if await request.is_disconnected():
                logger.info("Client disconnected, stopping stream.")
                break
            chunk_data = json.loads(chunk.removeprefix("data: ").removesuffix("\n\n"))
            chunk_text = chunk_data.get('text', '')
            full_answer += chunk_text

            buffer.append(chunk)

            if len(buffer) >= buffer_size:
                for buffered_chunk in buffer:
                    yield buffered_chunk
                buffer = []

        for buffered_chunk in buffer:
            yield buffered_chunk

        user_message = db_models.ChatMessage(
            session_id=chat_session_id, user_id=current_user.id, content=query, is_user_message=True
        )
        bot_message = db_models.ChatMessage(
            session_id=chat_session_id, user_id=None, content=full_answer, is_user_message=False
        )
        db.add_all([user_message, bot_message])
        await db.commit()

    return StreamingResponse(sse_generator(), media_type="text/event-stream")

    # --- Helper function (moved from route to handler) ---
    async def get_chat_history_str(db: Session, chat_session_id: int) -> str:
        """Retrieves and formats chat history as a string."""
        chat_history = []
        if chat_session_id:
            messages_result = await db.execute(
                db.select(db_models.ChatMessage)
                .filter(db_models.ChatMessage.session_id == chat_session_id)
                .order_by(db_models.ChatMessage.created_at.desc()).limit(10)
            )
            messages = messages_result.scalars().all()
            messages = list(reversed(messages))
            for msg in messages:
                role = "user" if msg.is_user_message else "assistant"
                chat_history.append(f"{role}: {msg.content}")
        return "\n".join(chat_history) if chat_history else "No previous messages in this chat."

async def get_chat_history_str(db: Session, chat_session_id: int) -> str: # Helper function outside handler
    """Retrieves and formats chat history as a string."""
    chat_history = []
    if chat_session_id:
        messages_result = await db.execute(
            db.select(db_models.ChatMessage)
            .filter(db_models.ChatMessage.session_id == chat_session_id)
            .order_by(db_models.ChatMessage.created_at.desc()).limit(10)
        )
        messages = messages_result.scalars().all()
        messages = list(reversed(messages))
        for msg in messages:
            role = "user" if msg.is_user_message else "assistant"
            chat_history.append(f"{role}: {msg.content}")
        return "\n".join(chat_history) if chat_history else "No previous messages in this chat."