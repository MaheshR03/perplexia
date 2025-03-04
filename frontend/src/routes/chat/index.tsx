// src/routes/chat/index.tsx
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Layout } from "../../components/Layout";
import { ChatWindow } from "../../components/chat/ChatWindow";
import { useChat } from "../../hooks/useChat";
import { useAuth } from "../../hooks/useAuth";

export const Route = createFileRoute("/chat/")({
  component: ChatIndexPage,
  beforeLoad: async ({}) => {
    // Verify user is authenticated
    const token = localStorage.getItem("clerk-token");
    console.log(token);
    if (!token) {
      throw redirect({ to: "/" });
    }
  },
});

function ChatIndexPage() {
  const { messages, sendMessage, isLoading } = useChat();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // If still checking auth, show loading
  if (authLoading) {
    return (
      <Layout>
        <div className="flex h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-sm text-muted-foreground">Loading Chat</p>
          </div>
        </div>
      </Layout>
    );
  }

  // If not authenticated, user should have been redirected by beforeLoad
  if (!isAuthenticated) {
    return null;
  }

  return (
    <Layout>
      <div className="flex h-screen flex-col">
        <header className="border-b bg-background p-4">
          <h1 className="text-xl font-semibold">New Chat</h1>
        </header>

        <div className="flex-1 overflow-hidden">
          <ChatWindow
            messages={messages}
            onSendMessage={sendMessage}
            isLoading={isLoading}
          />
        </div>
      </div>
    </Layout>
  );
}
