"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  AuthUser,
  getStoredAuth,
  setStoredAuth,
  clearStoredAuth,
  updateStoredUser,
  apiRequest,
  getDashboardPathForRole,
} from "@/lib/auth";

export interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
  role: string;
  organization_name?: string;
  designation?: string;
  phone_number?: string;
  domain_expertise?: string;
  department_name?: string;
  department_code?: string;
  ministry?: string;
  company_name?: string;
  dpiit_number?: string;
  sector?: string;
  [key: string]: any;
}

interface AuthContextType {
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<AuthUser>;
  logout: () => Promise<void>;
  register: (payload: RegisterPayload) => Promise<AuthUser>;
  refreshSession: () => Promise<boolean>;
  updateProfile: (data: Partial<AuthUser>) => Promise<AuthUser>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize auth state on client mount
  useEffect(() => {
    const initAuth = async () => {
      const { token, user } = getStoredAuth();
      if (token && user) {
        setCurrentUser(user);
        // Verify session integrity with /api/v1/auth/me in background
        try {
          const profile = await apiRequest<AuthUser>("/api/v1/auth/me");
          setCurrentUser(profile);
          updateStoredUser(profile);
        } catch (err) {
          // If token expired and refresh fails, apiRequest clears auth
          const current = getStoredAuth();
          if (!current.token) {
            setCurrentUser(null);
          }
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = useCallback(
    async (email: string, password: string, rememberMe: boolean = false): Promise<AuthUser> => {
      setIsLoading(true);
      try {
        const response = await apiRequest<{
          access_token: string;
          refresh_token: string;
          user: AuthUser;
        }>("/api/v1/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password, remember_me: rememberMe }),
        });

        setStoredAuth(response.access_token, response.refresh_token, response.user);
        setCurrentUser(response.user);
        setIsLoading(false);
        return response.user;
      } catch (error) {
        setIsLoading(false);
        throw error;
      }
    },
    []
  );

  const register = useCallback(
    async (payload: RegisterPayload): Promise<AuthUser> => {
      setIsLoading(true);
      try {
        const response = await apiRequest<{
          access_token: string;
          refresh_token: string;
          user: AuthUser;
        }>("/api/v1/auth/register", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setStoredAuth(response.access_token, response.refresh_token, response.user);
        setCurrentUser(response.user);
        setIsLoading(false);
        return response.user;
      } catch (error) {
        setIsLoading(false);
        throw error;
      }
    },
    []
  );

  const refreshSession = useCallback(async (): Promise<boolean> => {
    const { refreshToken } = getStoredAuth();
    if (!refreshToken) return false;

    try {
      const response = await apiRequest<{
        access_token: string;
        refresh_token: string;
        user: AuthUser;
      }>("/api/v1/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      setStoredAuth(response.access_token, response.refresh_token, response.user);
      setCurrentUser(response.user);
      return true;
    } catch {
      clearStoredAuth();
      setCurrentUser(null);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiRequest("/api/v1/auth/logout", { method: "POST" });
    } catch {
      // ignore network errors on logout
    } finally {
      clearStoredAuth();
      setCurrentUser(null);
      router.push("/login");
    }
  }, [router]);

  const updateProfile = useCallback(
    async (data: Partial<AuthUser>): Promise<AuthUser> => {
      const response = await apiRequest<AuthUser>("/api/v1/auth/profile", {
        method: "PATCH",
        body: JSON.stringify(data),
      });

      setCurrentUser(response);
      updateStoredUser(response);
      return response;
    },
    []
  );

  const value = {
    currentUser,
    isAuthenticated: !!currentUser,
    isLoading,
    login,
    logout,
    register,
    refreshSession,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
