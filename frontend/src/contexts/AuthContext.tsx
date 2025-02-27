import React, { createContext, useState, useEffect } from "react";
import { User } from "@/types";
import { authApi } from "@/lib/api";
import { toast } from "sonner";
import { useClerk, useUser } from "@clerk/clerk-react";

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

  // Fetch user data if authenticated
  useEffect(() => {
    async function fetchUserData() {
      if (isSignedIn) {
        try {
          setIsLoading(true);
          const { data, error } = await authApi.getCurrentUser();

          if (error) throw new Error(error);

          setUser(data);
        } catch (error) {
          console.error("Failed to fetch user data:", error);
          toast.error("Failed to load user data.", {
            description: "Please try again later.",
          });
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
  }, [isSignedIn, clerkLoaded]);

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
