import { ChatContainer } from "@/components/chat/ChatContainer";
import { useAuth } from "@/hooks/useAuth";

export default function HomePage() {
  const { isAuthenticated, signIn } = useAuth();

  return (
    <div className="flex flex-col h-full">
      {!isAuthenticated && (
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-4 text-center mb-4">
          <p className="text-sm">
            You're in anonymous mode. After 5 messages, you'll need to sign in
            to continue chatting.
          </p>
        </div>
      )}

      <ChatContainer />
    </div>
  );
}
