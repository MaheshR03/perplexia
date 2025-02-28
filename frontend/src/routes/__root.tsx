// src/routes/_app.tsx
import { Outlet, createRootRoute } from "@tanstack/react-router";
import { ClerkProvider } from "@clerk/clerk-react";
import { Toaster } from "../components/ui/sonner";

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export const Route = createRootRoute({
  component: () => (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <div className="min-h-screen bg-background">
        <Outlet />
        <Toaster />
      </div>
    </ClerkProvider>
  ),
});
