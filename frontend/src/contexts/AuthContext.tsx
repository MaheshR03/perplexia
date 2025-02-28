import React, { createContext, useState, useEffect } from "react";
import { User } from "@/types";
import { authApi } from "@/lib/api";
import { toast } from "sonner";
import { useClerk, useUser, useAuth as useClerkAuth } from "@clerk/clerk-react";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: () => void;
  signOut: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  signIn: () => {},
  signOut: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { isSignedIn, isLoaded: clerkLoaded } = useUser();
  const { openSignIn, signOut: clerkSignOut } = useClerk();
  const { getToken } = useClerkAuth();

  // Fetch user data if authenticated
  useEffect(() => {
    async function fetchUserData() {
      if (isSignedIn) {
        try {
          setIsLoading(true);

          // Get JWT token from Clerk
          const token = await getToken();
          console.log(token);
          // Pass token to your API client (convert null to undefined)
          const { data, error } = await authApi.getCurrentUser(
            token || undefined
          );

          if (error) {
            console.error("Error fetching user data:", error);
            toast("Failed to load user data", {
              description: error,
            });
            throw new Error(error);
          }

          setUser(data);
        } catch (error) {
          console.error("Failed to fetch user data:", error);
          setUser(null);
        } finally {
          setIsLoading(false);
        }
      } else {
        setUser(null);
        setIsLoading(false);
      }
    }

    if (clerkLoaded) {
      fetchUserData();
    }
  }, [isSignedIn, clerkLoaded, getToken]);

  const signIn = () => {
    openSignIn();
  };

  const signOut = () => {
    clerkSignOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
