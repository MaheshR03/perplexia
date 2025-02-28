import { lazy } from "react";
import { Route, RootRoute } from "@tanstack/react-router";

// Lazy load pages
const Landing = lazy(() => import("@/pages/Landing"));
const ChatPage = lazy(() => import("@/pages/chat/[sessionId]"));
const AuthCallback = lazy(() => import("@/pages/AuthCallback"));
const Login = lazy(() => import("@/pages/Login"));
const PDFManager = lazy(() => import("@/pages/PDFManager"));
const Profile = lazy(() => import("@/pages/Profile"));

// Generate routes from pages
export function generateRoutes(rootRoute: RootRoute) {
  const routes = [
    new Route({
      getParentRoute: () => rootRoute,
      path: "/",
      component: Landing,
    }),
    new Route({
      getParentRoute: () => rootRoute,
      path: "/chat/:sessionId",
      component: ChatPage,
    }),
    new Route({
      getParentRoute: () => rootRoute,
      path: "/auth/callback",
      component: AuthCallback,
    }),
    new Route({
      getParentRoute: () => rootRoute,
      path: "/login",
      component: Login,
    }),
    new Route({
      getParentRoute: () => rootRoute,
      path: "/pdfs",
      component: PDFManager,
    }),
    new Route({
      getParentRoute: () => rootRoute,
      path: "/profile",
      component: Profile,
    }),
  ];

  return { routes };
}
