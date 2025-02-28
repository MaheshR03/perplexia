import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Message, ChatSession, ChatRequest, MetadataResponse } from "@/types";
import { useSSE } from "./useSSE";
import { chatApi } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export function useChat(initialSessionId?: number) {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

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

  // SSE hook for streaming responses
  const {
    isConnected,
    error,
    disconnect: disconnectSSE,
  } = useSSE(sseUrl, {
    onMetadata: (metadata: MetadataResponse) => {
      if (metadata.search) {
        setSearchResults(metadata.search);
      }
      if (metadata.chat_session_id && !currentSessionId) {
        setCurrentSessionId(metadata.chat_session_id);
      }
    },
    onMessage: (text: string) => {
      setCurrentMessage((prev) => prev + text);
    },
    onClose: () => {
      setIsLoading(false);
      if (currentMessage) {
        // Add the completed assistant message to the list
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
    },
    onError: (event) => {
      setIsLoading(false);
      toast("SSE Error", {
        description: "There was an error streaming the response.",
      });
    },
  });

  // Load sessions if authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      loadSessions();
    }
  }, [isAuthenticated, authLoading]);

  // Load messages for current session
  useEffect(() => {
    if (currentSessionId && isAuthenticated) {
      loadSessionMessages(currentSessionId);
    }
  }, [currentSessionId, isAuthenticated]);

  // Check message limit for unauthenticated users
  useEffect(() => {
    if (!isAuthenticated && messageCount >= 5) {
      toast("Message limit reached", {
        description: "Please sign in to continue chatting.",
      });
    }
  }, [messageCount, isAuthenticated, navigate]);

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
    (message: string) => {
      if (!message.trim() || isLoading) return;

      // Add user message immediately
      const userMessage: Message = {
        id: Date.now(),
        content: message,
        is_user_message: true,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setMessageCount((prev) => prev + 1);
      setIsLoading(true);
      setSearchResults(""); // Clear previous search results
      setCurrentMessage(""); // Clear current message in case of interruptions

      // Prepare chat request
      const chatRequest: ChatRequest = {
        query: message,
        isSearchMode,
        chat_session_id: currentSessionId,
      };

      // Set SSE URL to trigger connection
      const url =
        "http://127.0.0.1:8000" + chatApi.getChatStreamURL(chatRequest);
      setSSEUrl(url);
    },
    [currentSessionId, isSearchMode, isLoading]
  );

  const createNewChat = useCallback(async () => {
    disconnectSSE(); // Disconnect existing SSE if any
    setCurrentSessionId(null);
    setMessages([]);
    setSearchResults("");
    navigate({ to: "/chat" }); // Navigate to base chat URL
  }, [disconnectSSE, navigate]);

  const switchSession = useCallback(
    async (sessionId: number) => {
      disconnectSSE(); // Disconnect existing SSE before switching
      setCurrentSessionId(sessionId);
      setMessages([]); // Clear messages before loading new session messages
      setSearchResults(""); // Clear search results
      navigate({ to: `/chat/${sessionId}` }); // Navigate to session-specific URL
    },
    [disconnectSSE, navigate]
  );

  const renameSession = async (sessionId: number, name: string) => {
    try {
      const { data, error } = await chatApi.updateSession(sessionId, { name });
      if (error) throw new Error(error);

      // Update sessions list
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

      // Remove from sessions list
      setSessions((prev) => prev.filter((session) => session.id !== sessionId));

      // If current session is deleted, reset to new chat
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
