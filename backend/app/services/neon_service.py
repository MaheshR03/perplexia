import asyncpg
import json
from fastapi import HTTPException
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

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
        logger.error(f"Error searching NeonDB: {str(e)}", exc_info=True)
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
            SELECT chunk_text, metadata
            FROM document_chunks
             ORDER BY embedding <=> $1
             LIMIT $2;
         """
        # Base query without filters
        if not pdf_ids and not user_id:
            search_query = """
                SELECT chunk_text, metadata
                FROM document_chunks
                ORDER BY embedding <=> $1
                LIMIT $2;
            """
            results = await conn.fetch(search_query, json.dumps(query_embedding), top_n)

        # Query with PDF filter
        elif pdf_ids:
            pdf_ids_str = ','.join(str(id) for id in pdf_ids)
            search_query = """
                SELECT chunk_text, metadata
                FROM document_chunks
                WHERE metadata->>'pdf_document_id' = ANY($3::text[])
                ORDER BY embedding <=> $1
                LIMIT $2;
            """
            results = await conn.fetch(
                search_query,
                json.dumps(query_embedding),
                top_n,
                [str(id) for id in pdf_ids]
            )

        # Query with user filter (adjust if you store user_id directly in document_chunks metadata)
        elif user_id:
            # ASSUMPTION: You store 'user_id' in the metadata of document_chunks
            search_query = """
                SELECT chunk_text, metadata
                FROM document_chunks
                WHERE metadata->>'user_id' = $3
                ORDER BY embedding <=> $1
                LIMIT $2;
            """
            results = await conn.fetch(
                search_query,
                json.dumps(query_embedding),
                top_n,
                str(user_id) # Assuming user_id is stored as string in metadata
            )
        else: # Base query if no filters are provided
            search_query = """
                SELECT chunk_text, metadata
                FROM document_chunks
                ORDER BY embedding <=> $1
                LIMIT $2;
            """
            results = await conn.fetch(search_query, json.dumps(query_embedding), top_n)

        # Process results
        chunks = []
        for row in results:
            chunk_text = row['chunk_text']
            metadata = json.loads(row['metadata']) if row['metadata'] else {}

            # Optionally include metadata in the results - adjust as needed
            source = metadata.get('filename', 'Unknown Source') # Example: filename from metadata
            page = metadata.get('page', 'Unknown Page') # Example: page number from metadata (if you store it)
            formatted_chunk = f"[Source: {source}, Page: {page}]\n{chunk_text}" # Example formatting
            chunks.append(formatted_chunk)

        results = await conn.fetch(search_query, json.dumps(query_embedding), top_n)
        return [row['chunk_text'] for row in results] # Or return more if needed

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching NeonDB: {str(e)}")
    finally:
        await conn.close()