import { ReactNode } from "react";
import { Header } from "./Header";
import { ChatSidebar } from "./ChatSidebar";
import { useAuth } from "@/hooks/useAuth";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar for authenticated users */}
      {isAuthenticated && (
        <aside className="hidden md:flex w-64 flex-col border-r bg-background">
          <ChatSidebar />
        </aside>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
