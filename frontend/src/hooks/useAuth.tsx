// src/hooks/useAuth.tsx
import { useEffect, useState } from "react";
import { useClerk, useUser } from "@clerk/clerk-react";
import { userApi, setClerkSessionRef } from "../lib/api";
import { User } from "../types";

export function useAuth() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { session } = useClerk();
  const [appUser, setAppUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [authToken, setAuthToken] = useState<string | null>(() => {
    return localStorage.getItem("clerk-token");
  });

  // Set the clerk session reference for API interceptors to use
  useEffect(() => {
    if (session) {
      setClerkSessionRef(session);
    }
  }, [session]);

  useEffect(() => {
    const fetchUser = async () => {
      if (isLoaded && isSignedIn) {
        try {
          // Store the session token in localStorage for API requests
          const token = await session?.getToken();
          if (token) {
            localStorage.setItem("clerk-token", token);
            setAuthToken(token);
          }

          // Get the user from our backend
          const { data } = await userApi.getCurrentUser();
          setAppUser(data);
        } catch (error) {
          console.error("Failed to fetch user:", error);
        } finally {
          setIsLoadingUser(false);
        }
      } else if (isLoaded) {
        localStorage.removeItem("clerk-token");
        setAppUser(null);
        setIsLoadingUser(false);
      }
    };

    fetchUser();
  }, [isLoaded, isSignedIn, session]);

  // Function to refresh token
  const refreshToken = async () => {
    if (isLoaded && isSignedIn && session) {
      try {
        const token = await session.getToken();
        if (token) {
          localStorage.setItem("clerk-token", token);
          setAuthToken(token);
          return token;
        }
      } catch (error) {
        console.error("Failed to refresh token:", error);
      }
    }
    return null;
  };

  // Set up periodic token refresh (every minute)
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    // Initial token refresh
    refreshToken();

    // Refresh token periodically
    const intervalId = setInterval(refreshToken, 1 * 60 * 1000); // 1 minute

    return () => clearInterval(intervalId);
  }, [isLoaded, isSignedIn, session]);

  return {
    isAuthenticated: !!appUser,
    user: appUser,
    clerkUser: user,
    isLoading: !isLoaded || isLoadingUser,
    authToken,
  };
}
