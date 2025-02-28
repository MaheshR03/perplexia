// src/routes/chat/$sessionId.tsx
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Layout } from "../../components/Layout";
import { ChatWindow } from "../../components/chat/ChatWindow";
import { useChat } from "../../hooks/useChat";
import { useAuth } from "../../hooks/useAuth";

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

  const { messages, sendMessage, isLoading, currentSession } =
    useChat(sessionIdNum);

  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // If still checking auth, show loading
  if (authLoading) {
    return <div>Loading...</div>;
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
