"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "./api";
import type { Market, Unit, User } from "./types";

interface SessionValue {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<User | null>;
  setUser: (u: User | null) => void;
  logout: () => Promise<void>;
  unit: Unit;
  setUnit: (u: Unit) => Promise<void>;
  /** Shopper's market. Signed-out visitors keep it in this browser only. */
  market: Market;
  setMarket: (m: Market) => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [guestMarket, setGuestMarket] = useState<Market>("IN");
  useEffect(() => {
    try {
      const m = localStorage.getItem("fm_market");
      if (m === "IN" || m === "US" || m === "UK_EU") setGuestMarket(m);
    } catch {
      /* storage unavailable */
    }
  }, []);

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

  const setMarket = useCallback(
    async (market: Market) => {
      try {
        localStorage.setItem("fm_market", market);
      } catch {
        /* storage unavailable */
      }
      setGuestMarket(market);
      if (!user) return;
      setUser({ ...user, market });
      const res = await api.patch<{ user: User }>("/auth/account", { market }).catch(() => null);
      if (res) setUser(res.user);
    },
    [user],
  );

  const value = useMemo<SessionValue>(
    () => ({ user, loading, refresh, setUser, logout, unit: user?.preferredUnit ?? "cm", setUnit, market: user?.market ?? guestMarket, setMarket }),
    [user, loading, refresh, logout, setUnit, guestMarket, setMarket],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
