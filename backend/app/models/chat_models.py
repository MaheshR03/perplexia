from pydantic import BaseModel

class ChatRequest(BaseModel):
    query: str
    isSearchMode: bool
    chat_session_id: int = None # Optional, to continue existing chat session

class ChatResponse(BaseModel): # Adjust if needed, SSE streaming changes this
    answer: str
    search: str
    duration: float

class PDFUpload(BaseModel):
    file: UploadFile