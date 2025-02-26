import json
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.db_models import DocumentChunk
import logging

logger = logging.getLogger(__name__)

async def search_neon_chunks(db: Session, query_embedding: list, top_n: int = 5):
    """
    Searches NeonDB for similar chunks using SQLAlchemy ORM.
    """
    try:
        results = db.query(DocumentChunk).order_by(DocumentChunk.embedding.op('<=>')(query_embedding)).limit(top_n).all()

        chunks = []
        for row in results:
            chunk_text = row.chunk_text
            metadata = json.loads(row.document_metadata) if row.metadata else {}

            source = metadata.get('filename', 'Unknown Source')
            page = metadata.get('page', 'Unknown Page')
            formatted_chunk = f"[Source: {source}, Page: {page}]\n{chunk_text}"
            chunks.append(formatted_chunk)

        return chunks

    except Exception as e:
        logger.error(f"Error searching NeonDB: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error searching NeonDB: {str(e)}")
