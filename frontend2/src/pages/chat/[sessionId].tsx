import { useParams } from "@tanstack/react-router";
import { ChatContainer } from "@/components/chat/ChatContainer";
import { AppLayout } from "@/components/layout/AppLayout";

export function ChatPage() {
  const { sessionId } = useParams();

  return (
    <AppLayout>
      <ChatContainer initialSessionId={Number(sessionId)} />
    </AppLayout>
  );
}
