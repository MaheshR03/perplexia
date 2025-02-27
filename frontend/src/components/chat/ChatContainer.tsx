import React, { useEffect, useRef } from "react";
import { ChatInput } from "./ChatInput";
import { ChatList } from "./ChatList";
import { SearchToggle } from "./SearchToggle";
import { PDFList } from "../pdf/PDFList";
import { useChat } from "@/hooks/useChat";
import { usePDFs } from "@/hooks/usePDFs";

interface ChatContainerProps {
  initialSessionId?: number; // Accept initialSessionId as prop
}

export function ChatContainer({ initialSessionId }: ChatContainerProps) {
  // Destructure initialSessionId
  const {
    messages,
    currentSessionId,
    isLoading,
    currentMessage,
    isSearchMode,
    setIsSearchMode,
    sendMessage,
    searchResults,
    switchSession, // Import switchSession
    createNewChat, // Import createNewChat
  } = useChat(initialSessionId); // Pass initialSessionId to useChat

  const { sessionPdfs, loadSessionPDFs } = usePDFs(
    currentSessionId || undefined
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, currentMessage]);

  // Load session PDFs when session changes
  useEffect(() => {
    if (currentSessionId) {
      loadSessionPDFs(currentSessionId);
    } else if (initialSessionId) {
      // Load session PDFs if initialSessionId is provided on initial mount
      loadSessionPDFs(initialSessionId);
      switchSession(initialSessionId); // Also switch to the initial session
    }
  }, [currentSessionId, initialSessionId, loadSessionPDFs, switchSession]); // Added dependencies

  return (
    <div className="flex flex-col h-full">
      {/* Header with PDF list and search toggle */}
      <div className="border-b p-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold">
            {currentSessionId
              ? "Continue your conversation"
              : "Start a new conversation"}
          </h2>
          <SearchToggle
            isSearchMode={isSearchMode}
            setIsSearchMode={setIsSearchMode}
          />
        </div>

        {/* Show PDFs attached to this session */}
        {sessionPdfs.length > 0 && (
          <div className="mt-2">
            <PDFList pdfs={sessionPdfs} isSession />
          </div>
        )}
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        <ChatList
          messages={messages}
          currentMessage={currentMessage}
          isLoading={isLoading}
          searchResults={searchResults}
        />
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <div className="p-4 border-t">
        <ChatInput onSendMessage={sendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
}
