import { User, Bot, Search } from "lucide-react";
import { cn } from "../../lib/utils";
import { ChatMessage as ChatMessageType } from "../../types";
import ReactMarkdown from "react-markdown";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../ui/button";
import { SearchSourcesDialog } from "./SearchSources";

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const { content, is_user_message, searchData } = message;
  const [dots, setDots] = useState(".");
  const [showSourcesDialog, setShowSourcesDialog] = useState(false);

  const parsedSearchData = useMemo(() => {
    if (!searchData) return null;

    if (typeof searchData === "string") {
      try {
        return JSON.parse(searchData);
      } catch (e) {
        console.error("Failed to parse search data:", e);
        return null;
      }
    }

    return searchData;
  }, [searchData]);

  // Check if this message has search data
  const hasSearchData =
    !is_user_message && parsedSearchData?.results?.length > 0;

  // Animated dots for loading state
  useEffect(() => {
    // Only run animation if this is a bot message that's still loading
    if (is_user_message || content) return;

    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "." : prev + "."));
    }, 300);

    return () => clearInterval(interval);
  }, [is_user_message, content]);

  return (
    <div
      className={cn(
        "flex gap-2 p-4",
        is_user_message
          ? "bg-muted/50 flex-row-reverse" // Use flex-row-reverse for user messages
          : "bg-background"
      )}
    >
      {/* Avatar/icon - adjusted margins based on message type */}
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border shadow",
          is_user_message
            ? "bg-primary text-primary-foreground ml-2" // User icon styling
            : "bg-background mr-2" // Bot icon styling
        )}
      >
        {is_user_message ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>

      {/* Message content - with different styling based on sender */}
      <div
        className={cn(
          "space-y-2 max-w-[80%] break-words overflow-hidden",
          is_user_message
            ? "text-right" // Right-align text for user messages
            : "text-left" // Left-align text for bot messages
        )}
      >
        <div
          className={cn(
            "prose prose-slate dark:prose-invert prose-pre:overflow-x-auto prose-pre:whitespace-pre-wrap prose-code:break-words prose-a:break-all",
            is_user_message && "ml-auto" // Push user messages to the right
          )}
        >
          {content ? (
            <>
              <div className="break-words whitespace-pre-line">
                <ReactMarkdown
                  components={{
                    pre: ({ node, ...props }) => (
                      <pre
                        className="overflow-x-auto max-w-full whitespace-pre-wrap"
                        {...props}
                      />
                    ),
                    code: ({ node, ...props }) => (
                      <code
                        className="break-all whitespace-pre-wrap"
                        {...props}
                      />
                    ),
                  }}
                >
                  {content}
                </ReactMarkdown>
              </div>

              {/* Only show Sources button if this message has search data */}
              {hasSearchData && (
                <div className="mt-2 text-left">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSourcesDialog(true)}
                    className="text-xs flex items-center gap-1 text-sky-500 hover:text-sky-400 bg-transparent border-sky-800/30"
                  >
                    <Search size={12} />
                    View Sources
                  </Button>
                </div>
              )}
            </>
          ) : is_user_message ? null : (
            <div className="flex items-center space-x-2">
              <span className="text-muted-foreground">
                Perplexia is thinking
              </span>
              <span className="font-bold min-w-[20px]">{dots}</span>
            </div>
          )}
        </div>
      </div>

      {/* Sources dialog - only rendered if this message has search data */}
      {hasSearchData && (
        <SearchSourcesDialog
          isOpen={showSourcesDialog}
          onOpenChange={setShowSourcesDialog}
          searchData={parsedSearchData}
        />
      )}
    </div>
  );
}
