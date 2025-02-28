// src/components/ChatWindow.tsx
import { useEffect, useRef } from "react";
import { ChatMessage as ChatMessageComponent } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { ChatMessage } from "../../types";

interface ChatWindowProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  sessionId?: number;
}

export function ChatWindow({
  messages,
  onSendMessage,
  isLoading,
  sessionId,
}: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="max-w-md text-center">
              <h2 className="text-2xl font-bold">Welcome to the Chat</h2>
              <p className="mt-2 text-muted-foreground">
                Start a conversation by typing a message below.
              </p>
            </div>
          </div>
        ) : (
          <div>
            {messages.map((message) => (
              <ChatMessageComponent key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <ChatInput
        onSendMessage={onSendMessage}
        isLoading={isLoading}
        sessionId={sessionId}
      />
    </div>
  );
}
