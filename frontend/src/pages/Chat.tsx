import React, { useEffect } from "react";
import { useParams } from "@tanstack/react-router";
import { ChatList } from "@/components/chat/ChatList";
import { useChat } from "@/hooks/useChat";
import { usePDFs } from "@/hooks/usePDFs";

export function Chat() {
  const params = useParams({ from: "/chat/$id" });
  const chatId = parseInt(params.id, 10);

  const { switchSession } = useChat();
  const { loadSessionPDFs } = usePDFs();

  useEffect(() => {
    if (chatId) {
      switchSession(chatId);
      loadSessionPDFs(chatId);
    }
  }, [chatId]);

  return (
    <div className="flex flex-col h-full">
      <ChatList />
    </div>
  );
}
