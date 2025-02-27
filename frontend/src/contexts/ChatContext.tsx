import React, { createContext, useState, useEffect } from "react";
import { Message, ChatSession } from "@/types";
import { useAuth } from "@/hooks/useAuth";

interface ChatContextType {
  anonymousMessages: Message[];
  setAnonymousMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  anonymousMessageCount: number;
  setAnonymousMessageCount: React.Dispatch<React.SetStateAction<number>>;
}

export const ChatContext = createContext<ChatContextType>({
  anonymousMessages: [],
  setAnonymousMessages: () => {},
  anonymousMessageCount: 0,
  setAnonymousMessageCount: () => {},
});

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [anonymousMessages, setAnonymousMessages] = useState<Message[]>([]);
  const [anonymousMessageCount, setAnonymousMessageCount] = useState<number>(0);
  const { isAuthenticated } = useAuth();

  // Save anonymous messages to localStorage
  useEffect(() => {
    if (!isAuthenticated && anonymousMessages.length > 0) {
      localStorage.setItem(
        "anonymousMessages",
        JSON.stringify(anonymousMessages)
      );
      localStorage.setItem(
        "anonymousMessageCount",
        anonymousMessageCount.toString()
      );
    }
  }, [anonymousMessages, anonymousMessageCount, isAuthenticated]);

  // Load anonymous messages from localStorage
  useEffect(() => {
    if (!isAuthenticated) {
      const savedMessages = localStorage.getItem("anonymousMessages");
      const savedCount = localStorage.getItem("anonymousMessageCount");

      if (savedMessages) {
        setAnonymousMessages(JSON.parse(savedMessages));
      }

      if (savedCount) {
        setAnonymousMessageCount(parseInt(savedCount, 10));
      }
    }
  }, [isAuthenticated]);

  return (
    <ChatContext.Provider
      value={{
        anonymousMessages,
        setAnonymousMessages,
        anonymousMessageCount,
        setAnonymousMessageCount,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}
