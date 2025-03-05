import ReactDOM from "react-dom/client";
import "./index.css";
import "./App.css";
import { ChatProvider } from "./context/ChatContext";
import { ClerkProvider } from "@clerk/clerk-react";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// Create the router instance
const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});

// Register the router for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// Get your Clerk publishable key
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPubKey) {
  throw new Error("Missing Clerk publishable key");
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <ClerkProvider publishableKey={clerkPubKey}>
    <ChatProvider>
      <RouterProvider router={router} />
    </ChatProvider>
  </ClerkProvider>
);
