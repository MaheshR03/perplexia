import { Monitoring } from "react-scan/monitoring";
import {
  createRootRoute,
  Route,
  Router,
  RouterProvider,
  Outlet,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { ChatProvider } from "@/contexts/ChatContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ClerkProvider } from "@clerk/clerk-react";
import { generateRoutes } from "@/utils/routeGenerator";

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Define root route with providers
const rootRoute = createRootRoute({
  component: () => (
    <>
      <Monitoring
        apiKey="fJgyqNoQEEuMMLMkyT9FnoMZ0g8BO5Vr"
        url="https://monitoring.react-scan.com/api/v1/ingest"
      />
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
        <AuthProvider>
          <ChatProvider>
            <Outlet />
            <Toaster position="top-right" />
          </ChatProvider>
        </AuthProvider>
      </ClerkProvider>
    </>
  ),
});

// Generate routes from pages folder
const { routes, layoutRoute } = generateRoutes(rootRoute);

// Create router instance
const routeTree = rootRoute.addChildren(routes);

const router = new Router({ routeTree });

function App() {
  return <RouterProvider router={router} />;
}

export default App;
