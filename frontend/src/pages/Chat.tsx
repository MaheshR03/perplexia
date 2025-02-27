import { useParams } from "@tanstack/react-router";
import { ChatContainer } from "@/components/chat/ChatContainer"; // Import ChatContainer

export function Chat() {
  const params = useParams({ from: "/chat/$sessionId" });
  const sessionId = parseInt(params.sessionId, 10); // Corrected param name to sessionId

  return (
    <div className="flex flex-col h-full">
      <ChatContainer initialSessionId={sessionId} />{" "}
      {/* Use ChatContainer and pass sessionId */}
    </div>
  );
}
