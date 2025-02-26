import io
from PyPDF2 import PdfReader
from fastapi import HTTPException, UploadFile

from app.models import db_models
from .embedding_service import get_embedding
from app.models.db_models import PDFDocument, PDFChunk, DocumentChunk
from sqlalchemy.orm import Session
import json
import logging

logger = logging.getLogger(__name__)

async def process_pdf_and_store(file: UploadFile, user_id: int, db: Session):
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
        pdf_document_db = PDFDocument(user_id=user_id, filename=file.filename)
        db.add(pdf_document_db)
        db.commit()
        db.refresh(pdf_document_db) # Get the generated ID

        chunks = chunk_text_into_segments(sanitized_text) # Implement chunking function

        for index, chunk_text in enumerate(chunks):
            embedding = get_embedding(chunk_text) # Generate embedding for each chunk
            neon_chunk_id = await store_chunk_to_neondb(chunk_text, embedding, pdf_document_db.id, user_id, file.filename, index, db) # Function to store to NeonDB, returns ID if needed

            # Store PDFChunk metadata in PostgreSQL, linking to PDFDocument and NeonDB ID
            pdf_chunk_metadata = PDFChunk(
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
async def get_neon_chunks_by_pdf_document_id(pdf_document_id: int, db: Session):
    """Retrieves NeonDB chunk texts associated with a PDF Document ID (example, adjust as needed)."""

    try:
        #  This is a simplified example, you'll likely need a way to link PDFDocument ID to NeonDB chunks
        #  If you stored NeonDB chunk IDs in PostgreSQL (PDFChunk), you can query based on those.
        #  For now, this is just a placeholder - adjust based on your actual data linking strategy.
        results = await db.execute(
            db.select(DocumentChunk).limit(10) # Placeholder limit, adjust filter as needed
        )
        return [row['chunk_text'] for row in results] # Placeholder return

    except Exception as e:
        logger.error(f"Error retrieving NeonDB chunks: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving NeonDB chunks: {str(e)}")

async def list_user_pdfs_handler(current_user: db_models.User, db: Session) -> list[dict]:
    """Handler for listing user PDFs, offloaded from route."""
    pdfs = await db.execute(
        db.select(db_models.PDFDocument)
        .filter(db_models.PDFDocument.user_id == current_user.id)
    )
    pdfs = pdfs.scalars().all()
    return [{"id": pdf.id, "filename": pdf.filename, "upload_date": pdf.upload_date} for pdf in pdfs]
