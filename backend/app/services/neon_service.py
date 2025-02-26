import asyncpg
import json
from fastapi import HTTPException
from app.core.config import settings

async def get_neon_connection():
    try:
        connection = await asyncpg.connect(
            user=settings.NEOND_DB_USER,
            password=settings.NEOND_DB_PASSWORD,
            database=settings.NEOND_DB_NAME,
            host=settings.NEOND_DB_HOST
        )
        return connection
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection error: {str(e)}")

async def search_neon_chunks(query_embedding: list, top_n: int = 5):
    """
    Searches NeonDB for similar chunks.
    Now returns chunk_text and a potential ID (if you store one in NeonDB, adjust query if needed).
    """
    conn = await get_neon_connection()
    try:
        search_query = """
            SELECT chunk_text -- , chunk_id  -- If you have chunk_id in NeonDB
            FROM document_chunks -- Ensure this table exists in NeonDB
            ORDER BY embedding <=> $1
            LIMIT $2;
        """
        results = await conn.fetch(search_query, json.dumps(query_embedding), top_n)
        return [row['chunk_text'] for row in results] # Or return more if needed

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching NeonDB: {str(e)}")
    finally:
        await conn.close()