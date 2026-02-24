"use client";

import { useState, useEffect, useCallback, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthContext, AuthUser } from "@/hooks/use-auth";
import { auth as authApi } from "@/lib/api";
import { isDemoMode, disableDemo } from "@/lib/demo-data";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30 seconds
      retry: 1,
    },
  },
});

export function Providers({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing token on mount
  useEffect(() => {
    // Demo mode — skip real auth
    if (isDemoMode()) {
      setUser({ id: "demo", email: "brian@justloveforest.com", name: "Brian Y.", role: "admin" });
      setToken("demo-token");
      setIsLoading(false);
      return;
    }
    const stored = localStorage.getItem("jlf_token");
    if (stored) {
      setToken(stored);
      // Decode JWT payload to check role
      try {
        const payload = JSON.parse(atob(stored.split(".")[1]));
        if (payload.role === "co_creator") {
          // Co-creator tokens can't call /auth/me — use JWT payload directly
          setUser({
            id: payload.sub,
            email: payload.email,
            name: payload.email.split("@")[0],
            role: "co_creator",
          });
          setIsLoading(false);
          return;
        }
      } catch {
        // Invalid token format — fall through to /auth/me
      }
      authApi
        .me()
        .then((u) => setUser(u))
        .catch(() => {
          localStorage.removeItem("jlf_token");
          setToken(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    // Token is already stored by auth.login() in api.ts
    setToken(res.access_token);
    setUser({ id: res.user_id, email, name: res.name, role: res.role });
  }, []);

  const logout = useCallback(() => {
    disableDemo();
    localStorage.removeItem("jlf_token");
    setToken(null);
    setUser(null);
    queryClient.clear();
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          {children}
          <Toaster position="top-right" richColors />
        </TooltipProvider>
      </QueryClientProvider>
    </AuthContext.Provider>
  );
}
