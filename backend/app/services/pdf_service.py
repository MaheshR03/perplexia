import io
from PyPDF2 import PdfReader
from fastapi import HTTPException, UploadFile

from app.models import db_models
from app.models.db_models import PDFDocument, PDFChunk, DocumentChunk
from sqlalchemy.orm import Session
import json
import logging
from sqlalchemy import select

from app.services import embedding_service
from app.services import neon_service

logger = logging.getLogger(__name__)

async def process_pdf_and_store(file: UploadFile, user_id: int, db: Session):
    """Processes PDF, generates embeddings, stores in NeonDB and metadata in PostgreSQL."""
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    try:
        # Reset file pointer and read the content
        await file.seek(0)
        pdf_bytes = await file.read()
        
        # Basic validation that it's a PDF
        if not pdf_bytes.startswith(b'%PDF'):
            raise HTTPException(status_code=400, detail="Invalid PDF format")
            
        pdf_stream = io.BytesIO(pdf_bytes)
        reader = PdfReader(pdf_stream)
        
        # Extract text from each page
        text_parts = []
        for page in reader.pages:
            try:
                text = page.extract_text() or ""
                text_parts.append(text)
            except Exception as e:
                logger.warning(f"Error extracting text from page: {str(e)}")
                
        text = "\n".join(text_parts)
        sanitized_text = text.replace('\x00', '')

        if not sanitized_text.strip():
            raise HTTPException(status_code=400, detail="No text found in the PDF")

        # Store PDF Document metadata in PostgreSQL
        pdf_document_db = db_models.PDFDocument(
            user_id=user_id, 
            filename=file.filename,
            file_size=len(pdf_bytes),
            page_count=len(reader.pages)
        )
        db.add(pdf_document_db)
        await db.commit()
        await db.refresh(pdf_document_db)
        
        # Process text into chunks and generate embeddings
        chunks = chunk_text_into_segments(sanitized_text)
        chunk_ids = []
        
        for index, chunk_text in enumerate(chunks):
            try:
                embedding = embedding_service.get_embedding(chunk_text)
                neon_chunk_id = await neon_service.store_chunk_to_neondb(
                    chunk_text, embedding, pdf_document_db.id, user_id, file.filename, index, db
                )
                
                # Store PDFChunk metadata
                pdf_chunk_metadata = db_models.PDFChunk(
                    pdf_document_id=pdf_document_db.id,
                    chunk_index=index,
                    neon_db_chunk_id=neon_chunk_id
                )
                db.add(pdf_chunk_metadata)
                chunk_ids.append(neon_chunk_id)
            except Exception as e:
                logger.error(f"Error processing chunk {index}: {str(e)}")
                
        await db.commit()
        
        # Return a consistent response with all fields the frontend expects
        return {
            "id": pdf_document_db.id,
            "filename": file.filename,
            "upload_date": pdf_document_db.upload_date,
            "page_count": len(reader.pages),
            "chunk_count": len(chunk_ids),
            "message": "PDF uploaded and processed successfully!"
        }
    except HTTPException as he:
        await db.rollback()
        raise he
    except Exception as e:
        await db.rollback()
        logger.error(f"Error processing PDF: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")


async def store_chunk_to_neondb(chunk_text, embedding, pdf_document_id, user_id, filename, chunk_index, db: Session):
    """Stores a text chunk and its embedding in NeonDB using SQLAlchemy ORM. Returns a chunk ID if needed."""
    try:
        metadata = { # Construct metadata JSON
            "pdf_document_id": str(pdf_document_id), # Store IDs as strings for easier querying in SQL
            "user_id": str(user_id),
            "filename": filename,
            "chunk_index": str(chunk_index) 
        }

        document_chunk = DocumentChunk(
            chunk_text=chunk_text,
            embedding=embedding,
            document_metadata=json.dumps(metadata)
        )
        db.add(document_chunk)
        db.commit()
        db.refresh(document_chunk)

        return str(document_chunk.id) # Return the ID of the stored chunk

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error storing chunk to NeonDB: {str(e)}")


def chunk_text_into_segments(text: str, max_chunk_size: int = 1000, overlap: int = 200) -> list[str]:
    """Split text into overlapping chunks of specified size."""
    if not text:
        return []
        
    # Remove excessive whitespace and normalize
    text = " ".join(text.split())
    
    chunks = []
    start = 0
    text_length = len(text)
    
    while start < text_length:
        # Calculate end with overlap
        end = min(start + max_chunk_size, text_length)
        
        # If not at the end of text, try to find a good break point
        if end < text_length:
            # Look for sentence end (.!?) or paragraph break within last 200 chars
            last_period = max(
                text.rfind('. ', end - overlap, end),
                text.rfind('! ', end - overlap, end),
                text.rfind('? ', end - overlap, end),
                text.rfind('\n', end - overlap, end)
            )
            
            if last_period != -1:
                end = last_period + 1  # Include the period
        
        chunks.append(text[start:end])
        
        # Move start with overlap if not at the end
        if end < text_length:
            start = end - overlap if end > overlap else end
        else:
            start = end
            
    return chunks


async def get_neon_chunks_by_pdf_document_id(pdf_document_id: int, db: Session):
    """Retrieves NeonDB chunk texts associated with a given PDF Document ID."""

    try:
        # 1. Find all chunk records in PDFChunk for the given PDF document
        pdf_chunk_rows = await db.execute(
            select(db_models.PDFChunk).where(db_models.PDFChunk.pdf_document_id == pdf_document_id)
        )
        pdf_chunks = pdf_chunk_rows.scalars().all()
        if not pdf_chunks:
            return []  # No chunks found for this PDF

        # 2. Gather the NeonDB chunk IDs
        chunk_ids = [chunk.neon_db_chunk_id for chunk in pdf_chunks]

        # 3. Fetch the corresponding DocumentChunk rows from NeonDB
        results = await db.execute(
            select(db_models.DocumentChunk)
            .where(db_models.DocumentChunk.id.in_(chunk_ids))
        )
        document_chunks = results.scalars().all()

        # 4. Return the chunk_text fields
        return [chunk.chunk_text for chunk in document_chunks]

    except Exception as e:
        logger.error(f"Error retrieving NeonDB chunks: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving NeonDB chunks: {str(e)}")

async def list_user_pdfs_handler(current_user: db_models.User, db: Session) -> list[dict]:
    """Handler for listing user PDFs, offloaded from route."""
    pdfs = await db.execute(
        select(db_models.PDFDocument)
        .filter(db_models.PDFDocument.user_id == current_user.id)
    )
    pdfs = pdfs.scalars().all()
    return [{"id": pdf.id, "filename": pdf.filename, "upload_date": pdf.upload_date} for pdf in pdfs]
