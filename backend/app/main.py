from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import chat, pdfs, auth  # Import API routers
from app.core.database import engine, Base
import logging 

logging.basicConfig(level=logging.INFO) 
logger = logging.getLogger(__name__) 

import asyncio

Base.metadata.create_all(bind=engine) # Create database tables on startup

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, prefix="/chat", tags=["Chat"])
app.include_router(pdfs.router, prefix="/pdfs", tags=["PDFs"])
app.include_router(auth.router, prefix="/auth", tags=["Auth"]) # If you have auth related endpoints

@app.get("/health")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)