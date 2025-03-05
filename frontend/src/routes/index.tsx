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
    <Layout>
      <div
        className={`flex h-screen w-full flex-col overflow-y-auto overflow-x-hidden lg:pl-10 ${
          messages.length ? "items-start" : "items-center"
        }`}
      >
        <ChatWindow
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
        />
      </div>
    </Layout>
  );
}
