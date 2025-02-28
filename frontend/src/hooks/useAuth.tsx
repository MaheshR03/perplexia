// src/hooks/useAuth.tsx
import { useEffect, useState } from "react";
import { useClerk, useUser } from "@clerk/clerk-react";
import { userApi } from "../lib/api";
import { User } from "../types";

export function useAuth() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { session } = useClerk();
  const [appUser, setAppUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      if (isLoaded && isSignedIn) {
        try {
          // Store the session token in localStorage for API requests
          const token = await session?.getToken();
          if (token) {
            localStorage.setItem("clerk-token", token);
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

  return {
    isAuthenticated: !!appUser,
    user: appUser,
    clerkUser: user,
    isLoading: !isLoaded || isLoadingUser,
  };
}
