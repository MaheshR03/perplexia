import { ChatBubble } from "./ChatBubble";
import { Message } from "@/types";

interface ChatListProps {
  messages: Message[];
  currentMessage: string;
  isLoading: boolean;
  searchResults: string;
}

export function ChatList({
  messages,
  currentMessage,
  isLoading,
  searchResults,
}: ChatListProps) {
  return (
    <div className="space-y-6">
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-center">
          <h3 className="text-lg font-medium">Welcome to Perplexia</h3>
          <p className="text-sm text-gray-500 mt-2">
            Ask a question to get started
          </p>
        </div>
      ) : (
        messages.map((message) => (
          <ChatBubble
            key={message.id}
            message={message}
            searchResults={message.is_user_message ? "" : searchResults}
          />
        ))
      )}

      {isLoading && currentMessage && (
        <ChatBubble
          message={{
            id: -1,
            content: currentMessage,
            is_user_message: false,
            created_at: new Date().toISOString(),
          }}
          isStreaming={true}
          searchResults=""
        />
      )}
    </div>
  );
}
