import { useParams } from "@tanstack/react-router";
import { ChatContainer } from "@/components/chat/ChatContainer";

export default function ChatSession() {
  const { sessionId } = useParams({ from: "/chat/$sessionId" });
  const sessionIdNum = sessionId ? parseInt(sessionId, 10) : undefined;

  return <ChatContainer initialSessionId={sessionIdNum} />;
}
