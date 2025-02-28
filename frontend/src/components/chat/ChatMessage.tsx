// src/components/ChatMessage.tsx
import { User, Bot } from "lucide-react";
import { cn } from "../../lib/utils";
import { ChatMessage as ChatMessageType } from "../../types";

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const { content, is_user_message } = message;

  return (
    <div
      className={cn(
        "flex w-full gap-3 p-4",
        is_user_message ? "bg-muted/50" : "bg-background"
      )}
    >
      <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border bg-background shadow">
        {is_user_message ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>
      <div className="flex-1 space-y-2">
        <div className="prose prose-slate dark:prose-invert">
          {content ||
            (is_user_message ? null : (
              <span className="animate-pulse">...</span>
            ))}
        </div>
      </div>
    </div>
  );
}
