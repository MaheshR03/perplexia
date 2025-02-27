import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SendIcon, PaperclipIcon } from "lucide-react";
import { usePDFs } from "@/hooks/usePDFs";
import { PDFUploader } from "../pdf/PDFUploader";
import { useAuth } from "@/hooks/useAuth";
import { useChat } from "@/hooks/useChat";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

export function ChatInput({ onSendMessage, isLoading }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [showUploader, setShowUploader] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isAuthenticated } = useAuth();
  const { uploadPDF, addPDFToSession } = usePDFs();
  const { currentSessionId, messageCount } = useChat();

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleSendMessage = () => {
    if (message.trim() && !isLoading) {
      onSendMessage(message);
      setMessage("");

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handlePDFUpload = async (file: File) => {
    if (!isAuthenticated && messageCount >= 5) {
      alert("Please sign in to upload PDFs");
      return;
    }

    const pdfId = await uploadPDF(file);
    if (pdfId && currentSessionId) {
      await addPDFToSession(pdfId, currentSessionId);
    }
    setShowUploader(false);
  };

  return (
    <div className="relative">
      {showUploader && (
        <div className="absolute bottom-full mb-2 w-full">
          <PDFUploader
            onUpload={handlePDFUpload}
            onCancel={() => setShowUploader(false)}
          />
        </div>
      )}

      <div className="flex items-end gap-2">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => setShowUploader(!showUploader)}
          className="flex-shrink-0"
        >
          <PaperclipIcon className="h-5 w-5" />
        </Button>

        <div className="relative flex-1 overflow-hidden rounded-lg border">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            rows={1}
            className="w-full resize-none border-0 bg-transparent p-3 focus:outline-none focus:ring-0"
            disabled={isLoading}
          />
        </div>

        <Button
          type="button"
          size="icon"
          onClick={handleSendMessage}
          disabled={!message.trim() || isLoading}
          className="flex-shrink-0"
        >
          <SendIcon className="h-5 w-5" />
        </Button>
      </div>

      {!isAuthenticated && messageCount >= 5 && (
        <div className="text-xs text-amber-600 mt-2">
          You've reached 5 messages. Please sign in to continue chatting.
        </div>
      )}
    </div>
  );
}
