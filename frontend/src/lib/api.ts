import axios, { AxiosError, AxiosRequestConfig } from "axios";
import {
  ApiResponse,
  ChatRequest,
  ChatSession,
  PDFDocument,
  User,
} from "@/types";

// Create an axios instance with defaults
const api = axios.create({
  baseURL: "http://127.0.0.1:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor for authentication
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("clerk-token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Generic API request function with error handling
async function apiRequest<T>(
  config: AxiosRequestConfig
): Promise<ApiResponse<T>> {
  try {
    const response = await api(config);
    return { data: response.data };
  } catch (error) {
    const axiosError = error as AxiosError;
    const errorDetail = axiosError.response?.data as Record<string, unknown>;
    return {
      data: {} as T,
      error: (errorDetail?.detail as string) || "An error occurred",
    };
  }
}

// Chat API
export const chatApi = {
  // Make the POST request to initiate streaming
  postChatStream: async (request: ChatRequest) => {
    return await apiRequest<any>({
      method: "POST",
      url: "/chat/stream",
      data: request,
      // Important: Set responseType to ensure proper SSE handling
      responseType: "text",
    });
  },

  // Return URL string for SSE connection
  getChatStreamURL: (): string => {
    // The POST endpoint for chat streaming
    return `/chat/stream`;
  },

  // Get all chat sessions
  getSessions: () =>
    apiRequest<ChatSession[]>({
      method: "GET",
      url: "/chat/sessions",
    }),

  getSession: (sessionId: number) =>
    apiRequest<ChatSession>({
      method: "GET",
      url: `/chat/sessions/${sessionId}`,
    }),

  updateSession: (sessionId: number, data: { name: string }) =>
    apiRequest<ChatSession>({
      method: "PUT",
      url: `/chat/sessions/${sessionId}`,
      data,
    }),

  deleteSession: (sessionId: number) =>
    apiRequest<{ message: string }>({
      method: "DELETE",
      url: `/chat/sessions/${sessionId}`,
    }),
};

// PDF API
export const pdfApi = {
  // Upload a PDF
  uploadPDF: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    return apiRequest<{ message: string; pdf_document_id: number }>({
      method: "POST",
      url: "/pdfs/upload",
      headers: {
        "Content-Type": "multipart/form-data",
      },
      data: formData,
    });
  },

  // List all user PDFs
  listPDFs: () =>
    apiRequest<PDFDocument[]>({
      method: "GET",
      url: "/pdfs/list",
    }),

  // Add a PDF to a chat session
  addPDFToSession: (sessionId: number, pdfId: number) =>
    apiRequest<{ message: string }>({
      method: "POST",
      url: `/pdfs/sessions/${sessionId}/add_pdf/${pdfId}`,
    }),

  // Remove a PDF from a chat session
  removePDFFromSession: (sessionId: number, pdfId: number) =>
    apiRequest<{ message: string }>({
      method: "DELETE",
      url: `/pdfs/sessions/${sessionId}/remove_pdf/${pdfId}`,
    }),

  // Get all PDFs in a session
  getSessionPDFs: (sessionId: number) =>
    apiRequest<PDFDocument[]>({
      method: "GET",
      url: `/pdfs/sessions/${sessionId}/pdfs`,
    }),
};

// Auth API
export const authApi = {
  // Get current user
  getCurrentUser: async (token?: string) => {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Add Authorization header if token is provided
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("127:0:0:1/8000/auth/me", {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          data: null,
          error: errorData.message || "Failed to fetch user data",
        };
      }

      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      const err = error as Error;
      return { data: null, error: err.message || "An error occurred" };
    }
  },
};

export default api;
