import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, type User, wakeApi } from "./api";
import {
  cacheUser,
  clearSession,
  getCachedUser,
  getToken,
  saveSession,
} from "./storage";

type AuthState = {
  user: User | null;
  token: string | null;
  loading: boolean;
  refreshing: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: User) => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    (async () => {
      await wakeApi();
      const [savedToken, cached] = await Promise.all([getToken(), getCachedUser()]);
      setToken(savedToken);
      setUserState(cached);
      if (savedToken) {
        try {
          const me = await api<User>("/auth/me", { token: savedToken });
          setUserState(me);
          await cacheUser(me);
        } catch {
          // keep cached user for soft offline browse
        }
      }
      setLoading(false);
    })();
  }, []);

  const setUser = useCallback((next: User) => {
    setUserState(next);
    void cacheUser(next);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setRefreshing(true);
    try {
      await wakeApi();
      const res = await api<{ token: string; user: User }>("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      await saveSession(res.token, res.user);
      setToken(res.token);
      setUserState(res.user);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    setRefreshing(true);
    try {
      await wakeApi();
      const res = await api<{ token: string; user: User }>("/auth/register", {
        method: "POST",
        body: { email, password, displayName },
      });
      await saveSession(res.token, res.user);
      setToken(res.token);
      setUserState(res.user);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    await clearSession();
    setToken(null);
    setUserState(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    const me = await api<User>("/auth/me", { token });
    setUser(me);
  }, [token, setUser]);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      refreshing,
      signIn,
      signUp,
      signOut,
      refreshUser,
      setUser,
    }),
    [user, token, loading, refreshing, signIn, signUp, signOut, refreshUser, setUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
