// src/routes/chat/$sessionId.tsx
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Layout } from "../../components/Layout";
import { ChatWindow } from "../../components/chat/ChatWindow";
import { useChat } from "../../hooks/useChat";
import { useAuth } from "../../hooks/useAuth";
import { useEffect } from "react";

export const Route = createFileRoute("/chat/$sessionId")({
  component: ChatSessionPage,
  beforeLoad: async ({ params }) => {
    // Verify user is authenticated
    const token = localStorage.getItem("clerk-token");
    if (!token) {
      throw redirect({ to: "/login" });
    }

    // Validate the session ID is a number
    if (isNaN(Number(params.sessionId))) {
      throw redirect({ to: "/chat" });
    }
  },
});

function ChatSessionPage() {
  const { sessionId } = Route.useParams();
  const sessionIdNum = parseInt(sessionId);

  const { messages, sendMessage, isLoading, currentSession, switchSession } =
    useChat();

  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // When the route parameter changes, update the current session
  useEffect(() => {
    switchSession(sessionIdNum);
  }, [sessionIdNum, switchSession]);

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
          <h1 className="text-xl font-semibold">
            {currentSession?.name || "Chat"}
          </h1>
        </header>

        <div className="flex-1 overflow-hidden">
          <ChatWindow
            messages={messages}
            onSendMessage={(message) => sendMessage(message)}
            isLoading={isLoading}
            sessionId={sessionIdNum}
          />
        </div>
      </div>
    </Layout>
  );
}
