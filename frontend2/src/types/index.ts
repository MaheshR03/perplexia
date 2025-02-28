export interface Message {
  id: number;
  content: string;
  is_user_message: boolean;
  created_at: string;
}

export interface ChatSession {
  id: number;
  name: string;
  messages: Message[];
}

export interface ChatRequest {
  query: string;
  isSearchMode: boolean;
  chat_session_id?: number | null;
}

export interface MetadataResponse {
  search?: string;
  chat_session_id?: number;
}

export interface PDFDocument {
  id: number;
  name: string;
  url: string;
  created_at: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
}
