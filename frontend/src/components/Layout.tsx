// src/components/Layout.tsx
import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { useChat } from "../hooks/useChat";
import { useNavigate } from "@tanstack/react-router";

interface LayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
  sessionId?: number;
}

export function Layout({
  children,
  showSidebar = true,
  sessionId,
}: LayoutProps) {
  const navigate = useNavigate();

  const { sessions, createSession, deleteSession, renameSession } =
    useChat(sessionId);

  const handleCreateSession = async () => {
    const session = await createSession();
    if (session) {
      navigate({ to: `/chat/${session.id}` });
    }
  };

  return (
    <div className="flex h-screen">
      {showSidebar && (
        <Sidebar
          sessions={sessions}
          onCreateSession={handleCreateSession}
          onDeleteSession={deleteSession}
          onRenameSession={renameSession}
          currentSessionId={sessionId}
        />
      )}
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
