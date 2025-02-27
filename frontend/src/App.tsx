import {
  RootRoute,
  Route,
  Router,
  RouterProvider,
  Outlet,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { ChatProvider } from "@/contexts/ChatContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Chat } from "@/pages/Chat";
import { Landing } from "@/pages/Landing";
import { Login } from "@/pages/Login";
import { AuthCallback } from "@/pages/AuthCallback";
import { PDFManager } from "@/pages/PDFManager";
import { ClerkProvider } from "@clerk/clerk-react";

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Define routes
const rootRoute = new RootRoute({
  component: () => (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <AuthProvider>
        <ChatProvider>
          <Outlet />
          <Toaster position="top-right" />
        </ChatProvider>
      </AuthProvider>
    </ClerkProvider>
  ),
});

// Public routes
const landingRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Landing,
});

const loginRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: Login,
});

const authCallbackRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/auth-callback",
  component: AuthCallback,
});

// Protected routes with layout
const layoutRoute = new Route({
  getParentRoute: () => rootRoute,
  id: "layout",
  component: () => (
    <AppLayout>
      <Outlet />
    </AppLayout>
  ),
});

const chatRoute = new Route({
  getParentRoute: () => layoutRoute,
  path: "/chat",
  component: Chat,
});

const chatSessionRoute = new Route({
  getParentRoute: () => layoutRoute,
  path: "/chat/$sessionId",
  component: Chat,
});

const pdfManagerRoute = new Route({
  getParentRoute: () => layoutRoute,
  path: "/pdfs",
  component: PDFManager,
});

// Create router instance
const routeTree = rootRoute.addChildren([
  landingRoute,
  loginRoute,
  authCallbackRoute,
  layoutRoute.addChildren([chatRoute, chatSessionRoute, pdfManagerRoute]),
]);

const router = new Router({ routeTree }); // Corrected variable name

function App() {
  return <RouterProvider router={router} />;
}

export default App;
