// src/routes/_app.tsx
import { Outlet, createRootRoute } from "@tanstack/react-router";
import { Toaster } from "../components/ui/sonner";

export const Route = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-background">
      <Outlet />
      <Toaster />
    </div>
  ),
});
