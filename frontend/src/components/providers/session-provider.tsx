"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";

import { getMe, logout as logoutRequest, type SessionUser } from "@/lib/auth";
import { clearSessionCache, SESSION_EXPIRED_EVENT } from "@/lib/session-cache";

type SessionContextValue = {
  user: SessionUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const activeUserId = useRef<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Session state is derived from the cookie-backed backend endpoint, never from
  // a token kept in localStorage.
  const refresh = useCallback(async () => {
    try {
      const nextUser = await getMe();
      if (activeUserId.current && activeUserId.current !== nextUser._id) {
        await clearSessionCache(queryClient);
      }
      activeUserId.current = nextUser._id;
      setUser(nextUser);
    } catch {
      if (activeUserId.current) await clearSessionCache(queryClient);
      activeUserId.current = null;
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [queryClient]);

  // Defer the initial update so React's effect rule and Strict Mode stay happy.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [refresh]);

  useEffect(() => {
    const clearExpiredSession = () => {
      activeUserId.current = null;
      setUser(null);
      void clearSessionCache(queryClient);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, clearExpiredSession);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, clearExpiredSession);
  }, [queryClient]);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      await clearSessionCache(queryClient);
      activeUserId.current = null;
      setUser(null);
    }
  }, [queryClient]);

  const value = useMemo(
    () => ({ user, loading, refresh, logout }),
    [user, loading, refresh, logout],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider.");
  return ctx;
}
