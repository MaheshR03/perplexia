// src/lib/api.ts
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("clerk-token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// API endpoints
export const chatApi = {
  // Chat sessions
  getChatSessions: () => api.get("/chat/sessions"),
  getChatSession: (sessionId: number) => api.get(`/chat/sessions/${sessionId}`),
  createChatSession: (data: { name: string }) =>
    api.post("/chat/sessions", data),
  updateChatSession: (sessionId: number, data: { name: string }) =>
    api.put(`/chat/sessions/${sessionId}`, data),
  deleteChatSession: (sessionId: number) =>
    api.delete(`/chat/sessions/${sessionId}`),
};

export const pdfApi = {
  uploadPdf: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/pdf/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
  listPdfs: () => api.get("/pdf/list"),
  addPdfToSession: (sessionId: number, pdfId: number) =>
    api.post(`/pdf/sessions/${sessionId}/add_pdf/${pdfId}`),
  removePdfFromSession: (sessionId: number, pdfId: number) =>
    api.delete(`/pdf/sessions/${sessionId}/remove_pdf/${pdfId}`),
  listSessionPdfs: (sessionId: number) =>
    api.get(`/pdf/sessions/${sessionId}/pdfs`),
};

export const userApi = {
  getCurrentUser: async () => {
    try {
      const response = await api.get("/auth/me");
      return { data: response.data }; // Return object with data property
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
      return { data: null }; // Return object with null data
    }
  },
  updateProfile: (userData: { username?: string; email?: string }) =>
    api.put("/auth/profile", userData),
};

export default api;
