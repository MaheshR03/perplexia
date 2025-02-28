import React from 'react';
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { ChatContainer } from "@/components/chat/ChatContainer";

export function Landing() {
  const { isAuthenticated, signIn } = useAuth();

  return (
    <div className="flex flex-col h-full">
      {!isAuthenticated && (
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-4 text-center">
          <p className="text-sm">
            You're in anonymous mode. After 5 messages, you'll need to sign in
            to continue chatting.
            <Button variant="link" className="p-0 h-auto" onClick={signIn}>
              Sign in now
            </Button>
          </p>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <ChatContainer />
      </div>
    </div>
  );
}
