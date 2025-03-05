// src/components/ChatInput.tsx
import { useState, KeyboardEvent, FormEvent } from "react";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Send, Loader2 } from "lucide-react";
import { PDFUploader } from "../PDFUploader";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  sessionId?: number;
}

export function ChatInput({
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
    <div className="bg-background p-4 max-w-3xl">
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
              disabled={isLoading || !message.trim()}
              className="absolute bottom-1 right-1"
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
