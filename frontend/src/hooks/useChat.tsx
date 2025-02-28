// src/hooks/useChat.tsx
import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { chatApi } from "../lib/api";
import { ChatMessage, ChatSession } from "../types";
import { useAuth } from "./useAuth";

export function useChat(sessionId?: number) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const reader = useRef<ReadableStreamDefaultReader | null>(null);
  const abortController = useRef<AbortController | null>(null);

  // Function to fetch chat sessions
  const fetchSessions = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const { data } = await chatApi.getChatSessions();
      setSessions(data);
    } catch (error) {
      console.error("Failed to fetch chat sessions:", error);
    }
  }, [isAuthenticated]);

  // Function to fetch a specific chat session
  const fetchSession = useCallback(
    async (id: number) => {
      if (!isAuthenticated) return;

      try {
        setIsLoading(true);
        const { data } = await chatApi.getChatSession(id);
        setCurrentSession(data);
        setMessages(data.messages || []);
      } catch (error) {
        console.error(`Failed to fetch chat session ${id}:`, error);
      } finally {
        setIsLoading(false);
      }
    },
    [isAuthenticated]
  );

  // Load session data when sessionId changes
  useEffect(() => {
    if (sessionId) {
      fetchSession(sessionId);
    } else {
      setMessages([]);
      setCurrentSession(null);
    }
  }, [sessionId, fetchSession]);

  // Load sessions on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchSessions();
    }
  }, [isAuthenticated, fetchSessions]);

  // Send a message and process streaming response
  // Updated sendMessage using fetch for streaming response
  const sendMessage = useCallback(
    async (message: string, contextPdfs: number[] = []) => {
      try {
        setIsLoading(true);

        // Cancel any ongoing streaming request
        if (abortController.current) {
          abortController.current.abort();
        }

        // Create a new AbortController for this request
        abortController.current = new AbortController();

        // Add user message to the UI immediately
        const userMessage: ChatMessage = {
          id: Date.now(),
          content: message,
          is_user_message: true,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, userMessage]);
        setMessageCount((prev) => prev + 1);

        // Prepare placeholder for assistant message
        const assistantMessage: ChatMessage = {
          id: Date.now() + 1,
          content: "",
          is_user_message: false,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // Check if login is required (after 5 messages for non‑authenticated users)
        if (!isAuthenticated && messageCount >= 4) {
          navigate({ to: "/login" });
          return;
        }

        // Use fetch to send the POST request with streaming enabled
        const response = await fetch(
          `${
            import.meta.env.VITE_API_URL || "http://localhost:8000"
          }/chat/stream`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("clerk-token")}`,
            },
            body: JSON.stringify({
              message,
              session_id: sessionId,
              context_pdfs: contextPdfs.length > 0 ? contextPdfs : undefined,
            }),
            signal: abortController.current.signal,
          }
        );

        // Process the streaming response
        const reader = response.body?.getReader();
        let accumulatedContent = "";
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const text = new TextDecoder().decode(value);
            accumulatedContent += text;
            // Update the assistant message with the accumulated content
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessage.id
                  ? { ...msg, content: accumulatedContent }
                  : msg
              )
            );
          }
        }

        // Refresh sessions list to show updated message count or new session
        fetchSessions();
      } catch (error) {
        console.error("Error sending message:", error);
      } finally {
        setIsLoading(false);
        abortController.current = null;
      }
    },
    [isAuthenticated, messageCount, sessionId, navigate, fetchSessions]
  );
  // Create a new chat session
  const createSession = useCallback(
    async (name: string = "New Chat") => {
      if (!isAuthenticated) return null;

      try {
        // The first message will automatically create a session
        // We'll get the session ID from the response
        // For now, navigate to the main chat page
        navigate({ to: "/chat" });
        return null;
      } catch (error) {
        console.error("Failed to create chat session:", error);
        return null;
      }
    },
    [isAuthenticated, navigate]
  );

  // Delete a chat session
  const deleteSession = useCallback(
    async (id: number) => {
      if (!isAuthenticated) return;

      try {
        await chatApi.deleteChatSession(id);
        setSessions((prev) => prev.filter((session) => session.id !== id));

        if (currentSession?.id === id) {
          navigate({ to: "/chat" });
        }
      } catch (error) {
        console.error(`Failed to delete chat session ${id}:`, error);
      }
    },
    [isAuthenticated, currentSession, navigate]
  );

  // Rename a chat session
  const renameSession = useCallback(
    async (id: number, name: string) => {
      if (!isAuthenticated) return;

      try {
        await chatApi.updateChatSession(id, { name });
        setSessions((prev) =>
          prev.map((session) =>
            session.id === id ? { ...session, name } : session
          )
        );

        if (currentSession?.id === id) {
          setCurrentSession((prev) => (prev ? { ...prev, name } : null));
        }
      } catch (error) {
        console.error(`Failed to rename chat session ${id}:`, error);
      }
    },
    [isAuthenticated, currentSession]
  );

  return {
    messages,
    sessions,
    currentSession,
    isLoading,
    messageCount,
    sendMessage,
    createSession,
    deleteSession,
    renameSession,
    fetchSessions,
    fetchSession,
  };
}
