import React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { ChatList } from "@/components/chat/ChatList";

export function Landing() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex flex-col h-full">
      {!isAuthenticated && (
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-4 text-center">
          <p className="text-sm">
            You're in anonymous mode. After 5 messages, you'll need to sign in
            to continue.
            <Button variant="link" className="p-0 h-auto" onClick={() => {}}>
              Sign in now
            </Button>
          </p>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <ChatList />
      </div>
    </div>
  );
}
