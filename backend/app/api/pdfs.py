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

# ... (Add more PDF management endpoints)