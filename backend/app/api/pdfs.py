from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services import pdf_service
from app.models import db_models
from app.api import auth # Import your auth dependency/function

router = APIRouter()

@router.post("/upload", response_model=dict) # Adjust response model if needed
async def upload_pdf_for_user(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: db_models.User = Depends(auth.get_current_user)): # Add auth dependency
    """Uploads a PDF and associates it with the logged-in user."""
    return await pdf_service.process_pdf_and_store(file, current_user.id, db) # Pass user_id to service

# Add endpoints for listing PDFs, deleting PDFs, adding/removing from chats, etc.
# Example:
@router.get("/list", response_model=list[dict]) # Adjust response model as needed
async def list_user_pdfs(db: Session = Depends(get_db), current_user: db_models.User = Depends(auth.get_current_user)):
    """Lists PDFs uploaded by the current user."""
    pdfs = db.query(db_models.PDFDocument).filter(db_models.PDFDocument.user_id == current_user.id).all()
    return [{"id": pdf.id, "filename": pdf.filename, "upload_date": pdf.upload_date} for pdf in pdfs]

@router.post("/sessions/{session_id}/add_pdf/{pdf_id}", response_model=dict) # ADD THIS ENDPOINT
async def add_pdf_to_session(
    session_id: int,
    pdf_id: int,
    db: Session = Depends(get_db),
    current_user: db_models.User = Depends(auth.get_current_user)
):
    """Adds a PDF to a chat session context."""
    # Verify the session belongs to the user
    session_result = await db.execute( # Async DB query
        db.select(db_models.ChatSession)
        .filter(db_models.ChatSession.id == session_id, db_models.ChatSession.user_id == current_user.id)
    )
    session = session_result.scalar_one_or_none() # Get single scalar result or None

    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    # Verify the PDF belongs to the user
    pdf_result = await db.execute( # Async DB query
        db.select(db_models.PDFDocument)
        .filter(db_models.PDFDocument.id == pdf_id, db_models.PDFDocument.user_id == current_user.id)
    )
    pdf = pdf_result.scalar_one_or_none() # Get single scalar result or None

    if not pdf:
        raise HTTPException(status_code=404, detail="PDF document not found")

    # Check if association already exists
    existing_result = await db.execute( # Async DB query
        db.select(db_models.ChatSessionPDF)
        .filter(db_models.ChatSessionPDF.chat_session_id == session_id, db_models.ChatSessionPDF.pdf_document_id == pdf_id)
    )
    existing = existing_result.scalar_one_or_none() # Get single scalar result or None

    if existing:
        return {"message": "PDF already added to this session"}

    # Create the association
    session_pdf = db_models.ChatSessionPDF(chat_session_id=session_id, pdf_document_id=pdf_id)
    db.add(session_pdf)
    await db.commit() # Async commit

    return {"message": "PDF added to chat session successfully"}

@router.delete("/sessions/{session_id}/remove_pdf/{pdf_id}", response_model=dict) # ADD THIS ENDPOINT
async def remove_pdf_from_session(
    session_id: int,
    pdf_id: int,
    db: Session = Depends(get_db),
    current_user: db_models.User = Depends(auth.get_current_user)
):
    """Removes a PDF from a chat session context."""
    # Verify the session belongs to the user
    session_result = await db.execute( # Async DB query
        db.select(db_models.ChatSession)
        .filter(db_models.ChatSession.id == session_id, db_models.ChatSession.user_id == current_user.id)
    )
    session = session_result.scalar_one_or_none() # Get single scalar result or None

    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    # Delete the association - Async delete
    delete_result = await db.execute(
        db.delete(db_models.ChatSessionPDF)
        .where(db_models.ChatSessionPDF.chat_session_id == session_id)
        .where(db_models.ChatSessionPDF.pdf_document_id == pdf_id)
    )

    if delete_result.rowcount == 0: # Check if any rows were deleted
        raise HTTPException(status_code=404, detail="PDF not associated with this session")

    await db.commit() # Async commit

    return {"message": "PDF removed from chat session successfully"}

@router.get("/sessions/{session_id}/pdfs", response_model=list[dict]) # ADD THIS ENDPOINT
async def list_session_pdfs(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: db_models.User = Depends(auth.get_current_user)
):
    """Lists all PDFs associated with a chat session."""
    # Verify the session belongs to the user
    session_result = await db.execute( # Async DB query
        db.select(db_models.ChatSession)
        .filter(db_models.ChatSession.id == session_id, db_models.ChatSession.user_id == current_user.id)
    )
    session = session_result.scalar_one_or_none() # Get single scalar result or None
    if not session:
       raise HTTPException(status_code=404, detail="Chat session not found")

    # Get all PDFs associated with the session - Async query with join
    pdfs_result = await db.execute(
        db.select(db_models.PDFDocument).
        join(db_models.ChatSessionPDF,
             db_models.ChatSessionPDF.pdf_document_id == db_models.PDFDocument.id).
        filter(db_models.ChatSessionPDF.chat_session_id == session_id)
    )
    pdfs = pdfs_result.scalars().all() # Get scalar results

    return [{
        "id": pdf.id,
        "filename": pdf.filename,
        "upload_date": pdf.upload_date
    } for pdf in pdfs]