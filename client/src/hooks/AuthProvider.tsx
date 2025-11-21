import React, { createContext, useContext, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  country?: string;
  bankCode?: string;
  accountNumber?: string;
  accountName?: string;
  recipientCode?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (userData: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const { data: userData, isLoading, refetch } = useQuery<{ user: User } | null>({
    queryKey: ["/api/user"],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    if (userData?.user) {
      setUser(userData.user);
    } else {
      setUser(null);
    }
  }, [userData]);

  const login = async (email: string, password: string) => {
    const response = await apiRequest("POST", "/api/login", { email, password });
    const data = await response.json();
    setUser(data.user);
    await refetch();
  };

  const logout = async () => {
    await apiRequest("POST", "/api/logout");
    setUser(null);
    await refetch();
  };

  const signup = async (userData: any) => {
    const response = await apiRequest("POST", "/api/signup", userData);
    const data = await response.json();
    setUser(data.user);
    await refetch();
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    signup,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
