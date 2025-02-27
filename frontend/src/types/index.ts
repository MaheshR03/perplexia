// User types
export interface User {
  id: number;
  email: string;
  username: string;
}

// Chat types
export interface Message {
  id: number;
  content: string;
  is_user_message: boolean;
  created_at: string;
}

export interface ChatSession {
  id: number;
  name: string;
  created_at: string;
  message_count: number;
  messages?: Message[];
}

export interface ChatRequest {
  query: string;
  isSearchMode: boolean;
  chat_session_id?: number | null;
}

export interface MetadataResponse {
  search: string;
  duration: number;
  chat_session_id: number;
}

// PDF types
export interface PDFDocument {
  id: number;
  filename: string;
  upload_date: string;
}

export interface PDFUploadResponse {
  message: string;
  pdf_document_id: number;
}

// API response types
export interface ApiResponse<T> {
  data: T;
  error?: string;
}
