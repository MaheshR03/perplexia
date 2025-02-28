import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Message, ChatSession, ChatRequest, MetadataResponse } from "@/types";
import { useSSE } from "./useSSE";
import { chatApi } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export function useChat(initialSessionId?: number) {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const sseConnectionRef = useRef<EventSource | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(
    initialSessionId || null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchResults, setSearchResults] = useState<string>("");
  const [currentMessage, setCurrentMessage] = useState("");
  const [messageCount, setMessageCount] = useState(0);
  const [sseUrl, setSSEUrl] = useState<string | null>(null);

  const {
    isConnected,
    error,
    disconnect: disconnectSSE,
    connection,
  } = useSSE(sseUrl, {
    onOpen: () => {
      console.log("SSE connection opened");
    },
    onMetadata: (metadata: MetadataResponse) => {
      console.log("Received metadata:", metadata);
      if (metadata.search) {
        setSearchResults(metadata.search);
      }
      if (metadata.chat_session_id && !currentSessionId) {
        setCurrentSessionId(metadata.chat_session_id);
      }
    },
    onMessage: (text: string) => {
      console.log("Received message chunk:", text);
      setCurrentMessage((prev) => prev + text);
    },
    onClose: () => {
      console.log("SSE connection closed");
      setIsLoading(false);
      if (currentMessage) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            content: currentMessage,
            is_user_message: false,
            created_at: new Date().toISOString(),
          },
        ]);
        setCurrentMessage("");
      }
      setSSEUrl(null);
    },
    onError: (event) => {
      console.error("SSE connection error", event);
      setIsLoading(false);
      setSSEUrl(null);
      toast("Error", {
        description: "There was an error connecting to the server.",
      });
    },
  });

  useEffect(() => {
    sseConnectionRef.current = connection;
  }, [connection]);

  useEffect(() => {
    return () => {
      if (sseConnectionRef.current) {
        sseConnectionRef.current.close();
        sseConnectionRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      loadSessions();
    }
  }, [isAuthenticated, authLoading]);

  useEffect(() => {
    if (currentSessionId && isAuthenticated) {
      loadSessionMessages(currentSessionId);
    }
  }, [currentSessionId, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated && messageCount >= 5) {
      toast("Message limit reached", {
        description: "Please sign in to continue chatting.",
      });
    }
  }, [messageCount, isAuthenticated]);

  const loadSessions = async () => {
    try {
      const { data, error } = await chatApi.getSessions();
      if (error) throw new Error(error);
      setSessions(data);
    } catch (error) {
      console.error("Failed to load sessions:", error);
      toast("Error", {
        description: "Failed to load chat sessions.",
      });
    }
  };

  const loadSessionMessages = async (sessionId: number) => {
    try {
      const { data, error } = await chatApi.getSession(sessionId);
      if (error) throw new Error(error);
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error("Failed to load session messages:", error);
      toast("Error", {
        description: "Failed to load chat messages.",
      });
    }
  };

  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim() || isLoading) return;

      console.log("Sending message:", message);

      if (sseConnectionRef.current) {
        sseConnectionRef.current.close();
        sseConnectionRef.current = null;
      }
      disconnectSSE();
      setSSEUrl(null);

      const userMessage: Message = {
        id: Date.now(),
        content: message,
        is_user_message: true,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setMessageCount((prev) => prev + 1);
      setIsLoading(true);
      setSearchResults("");
      setCurrentMessage("");

      const chatRequest: ChatRequest = {
        query: message,
        isSearchMode,
        chat_session_id: currentSessionId,
      };

      try {
        const apiBaseUrl =
          import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

        await fetch(`${apiBaseUrl}/chat/stream`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("clerk-token")}`,
          },
          body: JSON.stringify(chatRequest),
        });

        setSSEUrl(`${apiBaseUrl}/chat/stream`);
      } catch (error) {
        console.error("Failed to start chat stream:", error);
        setIsLoading(false);
        toast("Error", {
          description: "Failed to connect to chat service.",
        });
      }
    },
    [currentSessionId, isSearchMode, isLoading, disconnectSSE]
  );

  const createNewChat = useCallback(() => {
    if (sseConnectionRef.current) {
      sseConnectionRef.current.close();
      sseConnectionRef.current = null;
    }
    disconnectSSE();
    setSSEUrl(null);

    setCurrentSessionId(null);
    setMessages([]);
    setSearchResults("");
    navigate({ to: "/" });
  }, [disconnectSSE, navigate]);

  const switchSession = useCallback(
    (sessionId: number) => {
      if (isLoading) return;

      if (sseConnectionRef.current) {
        sseConnectionRef.current.close();
        sseConnectionRef.current = null;
      }
      disconnectSSE();
      setSSEUrl(null);

      setCurrentSessionId(sessionId);
      setMessages([]);
      setSearchResults("");
      navigate({ to: `/chat/${sessionId}` });
    },
    [disconnectSSE, navigate, isLoading]
  );

  const renameSession = async (sessionId: number, name: string) => {
    try {
      const { data, error } = await chatApi.updateSession(sessionId, { name });
      if (error) throw new Error(error);

      setSessions((prev) =>
        prev.map((session) =>
          session.id === sessionId ? { ...session, name } : session
        )
      );

      toast("Success", {
        description: "Chat renamed successfully.",
      });
    } catch (error) {
      console.error("Failed to rename session:", error);
      toast("Error", {
        description: "Failed to rename chat.",
      });
    }
  };

  const deleteSession = async (sessionId: number) => {
    try {
      const { data, error } = await chatApi.deleteSession(sessionId);
      if (error) throw new Error(error);

      setSessions((prev) => prev.filter((session) => session.id !== sessionId));

      if (currentSessionId === sessionId) {
        createNewChat();
      }

      toast("Success", {
        description: "Chat deleted successfully.",
      });
    } catch (error) {
      console.error("Failed to delete session:", error);
      toast("Error", {
        description: "Failed to delete chat.",
      });
    }
  };

  return {
    messages,
    sessions,
    currentSessionId,
    isLoading,
    isSearchMode,
    searchResults,
    currentMessage,
    messageCount,
    sendMessage,
    setIsSearchMode,
    createNewChat,
    switchSession,
    renameSession,
    deleteSession,
  };
}
