// src/components/ChatInput.tsx
import { useState, KeyboardEvent, FormEvent } from "react";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Send, Loader2 } from "lucide-react";
import { PDFUploader } from "../PDFUploader";
import { ChatMessage } from "@/types";

interface ChatInputProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  sessionId?: number;
}

export function ChatInput({
  messages,
  onSendMessage,
  isLoading,
  sessionId,
}: ChatInputProps) {
  const [message, setMessage] = useState("");

  const handleSendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message);
      setMessage("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  return (
    <div
      className={`bg-[#191a1a] p-4 pt-2 w-full max-w-3xl  ${
        messages.length ? "fixed bottom-0" : ""
      }`}
    >
      <form onSubmit={handleSendMessage} className="flex flex-col gap-4">
        <div className="flex gap-2">
          <PDFUploader sessionId={sessionId} />

          <div className="relative flex-1">
            <Textarea
              placeholder="Type your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-12 resize-none pr-12"
              disabled={isLoading}
            />
            <Button
              size="icon"
              type="submit"
              variant="ghost"
              disabled={isLoading || !message.trim()}
              className="absolute bottom-1 right-1 "
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
