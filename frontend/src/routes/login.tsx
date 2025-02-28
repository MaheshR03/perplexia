// src/routes/login.tsx
import { createFileRoute, redirect } from "@tanstack/react-router";
import { SignIn } from "@clerk/clerk-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  beforeLoad: async ({}) => {
    // Check if the user is already authenticated and redirect them if they are
    const token = localStorage.getItem("clerk-token");
    if (token) {
      // Use navigate from the context and throw it to cause a redirect
      throw redirect({ to: "/chat" });
    }
  },
});

function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md">
        <SignIn
          path="/login"
          routing="path"
          signUpUrl="/register"
          redirectUrl="/chat"
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-lg",
            },
          }}
        />
      </div>
    </div>
  );
}
