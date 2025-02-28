// src/routes/index.tsx
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { ChatWindow } from "../components/chat/ChatWindow";
import { Layout } from "../components/Layout";
import { useChat } from "../hooks/useChat";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const { messages, sendMessage, isLoading, messageCount } = useChat();

  // Handle sending a message
  const handleSendMessage = async (message: string) => {
    if (messageCount >= 4) {
      // Redirect to login after 5 messages (0-indexed)
      Navigate({ to: "/login" });
      return;
    }
    await sendMessage(message);
  };

  return (
    <Layout showSidebar={false}>
      <div className="flex h-screen flex-col">
        <header className="border-b bg-background p-4">
          <h1 className="text-xl font-semibold">Chat with AI</h1>
        </header>

        <div className="flex-1 overflow-hidden">
          <ChatWindow
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
          />
        </div>
      </div>
    </Layout>
  );
}
