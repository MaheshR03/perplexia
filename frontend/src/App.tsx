import React from 'react';
import { RootRoute, Route, Router, RouterProvider, Outlet } from '@tanstack/react-router';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { ChatProvider } from '@/contexts/ChatContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Chat } from '@/pages/Chat';
import { Landing } from '@/pages/Landing';
import { Login } from '@/pages/Login';
import { AuthCallback } from '@/pages/AuthCallback';
import { PDFManagerPage } from '@/pages/PDFManagerPage';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

// Define routes
const rootRoute = new RootRoute({
  component: () => (
    <AuthProvider>
      <ChatProvider>
        <Outlet />
        <Toaster position="top-right" />
      </ChatProvider>
    </AuthProvider>
  ),
});

// Public routes
const landingRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Landing,
});

const loginRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: Login,
});

const authCallbackRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/auth-callback',
  component: AuthCallback,
});

// Protected routes with layout
const layoutRoute = new Route({
  getParentRoute: () => rootRoute,
  component: () => (
    <ProtectedRoute>
      <AppLayout>
        <Outlet />
      </AppLayout>
    </ProtectedRoute>
  ),
});

const chatRoute = new Route({
  getParentRoute: () => layoutRoute,
  path: '/chat',
  component: Chat,
});

const chatSessionRoute = new Route({
  getParentRoute: () => layoutRoute,
  path: '/chat/$sessionId',
  component: Chat,
});

const pdfManagerRoute = new Route({
  getParentRoute: () => layoutRoute,
  path: '/pdfs',
  component: PDFManagerPage,
});

// Create router instance
const routeTree = rootRoute.addChildren([
  landingRoute,
  loginRoute,
  authCallbackRoute,
  layoutRoute.addChildren([
    chatRoute,
    chatSessionRoute,
    pdfManagerRoute,
  ]),
]);

const router =