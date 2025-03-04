import asyncio
import sys
import os
import logging
from sqlalchemy import text

# Add parent directory to path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.core.database import neon_engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def setup_pgvector():
    """Install pgvector extension and prepare database for vector operations."""
    try:
        # Connect to NeonDB
        logger.info("Connecting to NeonDB...")
        async with neon_engine.begin() as conn:
            # Check if pgvector is already installed
            result = await conn.execute(text("SELECT * FROM pg_extension WHERE extname = 'vector'"))
            if result.fetchone():
                logger.info("pgvector extension is already installed")
            else:
                logger.info("Installing pgvector extension...")
                await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
                logger.info("pgvector extension installed successfully")
            
            # Create a function to convert array to vector
            logger.info("Creating array_to_vector conversion function...")
            await conn.execute(text("""
                CREATE OR REPLACE FUNCTION array_to_vector(float[]) RETURNS vector
                AS $$ SELECT $1::vector $$ LANGUAGE SQL IMMUTABLE STRICT;
            """))
            
            # Check if document_chunks table exists
            logger.info("Checking document_chunks table...")
            result = await conn.execute(text(
                "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'document_chunks')"
            ))
            table_exists = result.scalar()
            
            if table_exists:
                # Alter existing table to use vector type
                logger.info("Converting document_chunks.embedding to vector type...")
                try:
                    # Check if it's already vector type
                    result = await conn.execute(text(
                        "SELECT data_type FROM information_schema.columns "
                        "WHERE table_name = 'document_chunks' AND column_name = 'embedding'"
                    ))
                    column_type = result.scalar()
                    
                    if column_type != 'USER-DEFINED' and 'vector' not in str(column_type).lower():
                        # Add a temporary column
                        await conn.execute(text(
                            "ALTER TABLE document_chunks ADD COLUMN embedding_vector vector"
                        ))
                        
                        # Convert data
                        await conn.execute(text(
                            "UPDATE document_chunks SET embedding_vector = array_to_vector(embedding)"
                        ))
                        
                        # Drop old column and rename new one
                        await conn.execute(text(
                            "ALTER TABLE document_chunks DROP COLUMN embedding"
                        ))
                        await conn.execute(text(
                            "ALTER TABLE document_chunks RENAME COLUMN embedding_vector TO embedding"
                        ))
                        
                        logger.info("Successfully converted embedding column to vector type")
                    else:
                        logger.info("Column is already using vector type")
                        
                except Exception as e:
                    logger.error(f"Error converting column type: {str(e)}")
            else:
                logger.info("document_chunks table doesn't exist yet, it will be created with proper types")
                
        logger.info("Vector setup completed successfully")
        
    except Exception as e:
        logger.error(f"Error setting up pgvector: {str(e)}")
        raise

if __name__ == "__main__":
    asyncio.run(setup_pgvector())