import { Message } from "@/types";
import ReactMarkdown from "react-markdown";

interface ChatBubbleProps {
  message: Message;
  isStreaming?: boolean;
  searchResults?: string;
}

export function ChatBubble({
  message,
  isStreaming = false,
  searchResults = "",
}: ChatBubbleProps) {
  const isUser = message.is_user_message;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-lg p-4 ${
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div>
            <ReactMarkdown
              components={{
                p: ({ node, ...props }) => (
                  <p
                    className="prose dark:prose-invert prose-sm max-w-none"
                    {...props}
                  />
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>

            {searchResults && (
              <div className="mt-4 border-t pt-2">
                <h4 className="text-sm font-medium mb-1">Web Search Results</h4>
                <div className="text-xs text-gray-600 bg-secondary/50 p-2 rounded">
                  {searchResults}
                </div>
              </div>
            )}

            {isStreaming && (
              <div className="mt-1">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-current animate-pulse"></span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
