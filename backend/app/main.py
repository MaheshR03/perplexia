from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from sqlalchemy import text
from app.api import chat, pdfs, auth  # Import API routers
from app.core.database import engine, Base, neon_engine, NeonBase 
import logging 

logging.basicConfig(level=logging.INFO) 
logger = logging.getLogger(__name__) 

async def lifespan(app: FastAPI):
    # Create Supabase tables (common tables) if they don't exist
    async with engine.begin() as conn:
        # FIX: Pass the function directly without lambda
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Supabase tables verified/created")

    # Create NeonDB tables (vector‑specific models) if they don't exist
    async with neon_engine.begin() as neon_conn:
        try:
            # Install pgvector
            await neon_conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            logger.info("pgvector extension created or already exists")
            
            # Create helper function for vector conversion
            await neon_conn.execute(text("""
                CREATE OR REPLACE FUNCTION array_to_vector(float[]) RETURNS vector
                AS $$ SELECT $1::vector $$ LANGUAGE SQL IMMUTABLE STRICT;
            """))
            logger.info("Vector conversion function created")
            
            # Create tables with proper vector support
            await neon_conn.run_sync(NeonBase.metadata.create_all)
            logger.info("Neon tables verified/created")
            
        except Exception as e:
            logger.error(f"Error setting up Neon database: {str(e)}")
    logger.info("Neon tables verified/created")
    
    yield  # This is where the app runs
    
    # Shutdown: Add any cleanup code here
    logger.info("Shutting down application")

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, prefix="/chat", tags=["Chat"])
app.include_router(pdfs.router, prefix="/pdf", tags=["Pdf"])
app.include_router(auth.router, prefix="/auth", tags=["Auth"]) 

@app.get("/health")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)