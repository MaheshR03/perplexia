import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";

export function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSignIn = async () => {
    await signIn();
    navigate({ to: "/" });
  };

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <h1 className="text-3xl font-bold mb-6">Sign In</h1>
      <Button onClick={handleSignIn}>Sign In with Clerk</Button>
    </div>
  );
}
