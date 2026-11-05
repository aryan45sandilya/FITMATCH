"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "./api";
import type { Unit, User } from "./types";

interface SessionValue {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<User | null>;
  setUser: (u: User | null) => void;
  logout: () => Promise<void>;
  unit: Unit;
  setUnit: (u: Unit) => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { user } = await api.get<{ user: User | null }>("/auth/me");
      setUser(user);
      return user;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await api.post("/auth/logout").catch(() => undefined);
    setUser(null);
    window.location.assign("/");
  }, []);

  const setUnit = useCallback(
    async (unit: Unit) => {
      if (!user) return;
      setUser({ ...user, preferredUnit: unit });
      const res = await api.patch<{ user: User }>("/auth/account", { preferredUnit: unit }).catch(() => null);
      if (res) setUser(res.user);
    },
    [user],
  );

  const value = useMemo<SessionValue>(
    () => ({ user, loading, refresh, setUser, logout, unit: user?.preferredUnit ?? "cm", setUnit }),
    [user, loading, refresh, logout, setUnit],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
