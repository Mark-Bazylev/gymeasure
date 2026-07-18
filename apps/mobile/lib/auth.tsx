import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { api, configureApiAuth, type User, wakeApi } from "./api";
import {
  cacheUser,
  clearSession,
  getCachedUser,
  getRefreshToken,
  getToken,
  saveSession,
  setAccessToken,
} from "./storage";

type AuthState = {
  user: User | null;
  token: string | null;
  loading: boolean;
  refreshing: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: User) => void;
};

const AuthContext = createContext<AuthState | null>(null);

type AuthResponse = {
  token?: string;
  accessToken: string;
  refreshToken: string;
  user: User;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const setUser = useCallback((next: User) => {
    setUserState(next);
    void cacheUser(next);
  }, []);

  useEffect(() => {
    configureApiAuth({
      getAccessToken: () => token,
      getRefreshToken,
      onRefreshed: async ({ accessToken, refreshToken, user: nextUser }) => {
        setToken(accessToken);
        await setAccessToken(accessToken);
        if (nextUser) {
          setUserState(nextUser);
          await cacheUser(nextUser);
        }
        const existingUser = nextUser ?? (await getCachedUser());
        if (existingUser) {
          await saveSession(accessToken, refreshToken, existingUser);
        }
      },
      onAuthFailure: async () => {
        await clearSession();
        setToken(null);
        setUserState(null);
      },
    });
  }, [token]);

  useEffect(() => {
    const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    if (!webClientId) return;
    GoogleSignin.configure({
      webClientId,
      offlineAccess: false,
    });
  }, []);

  useEffect(() => {
    (async () => {
      await wakeApi();
      const [savedToken, cached, refreshToken] = await Promise.all([
        getToken(),
        getCachedUser(),
        getRefreshToken(),
      ]);
      setToken(savedToken);
      setUserState(cached);

      if (refreshToken) {
        try {
          const res = await api<AuthResponse>("/auth/refresh", {
            method: "POST",
            body: { refreshToken },
            skipAuthRefresh: true,
          });
          await saveSession(res.accessToken, res.refreshToken, res.user);
          setToken(res.accessToken);
          setUserState(res.user);
        } catch {
          if (savedToken) {
            try {
              const me = await api<User>("/auth/me", { token: savedToken, skipAuthRefresh: true });
              setUserState(me);
              await cacheUser(me);
            } catch {
              await clearSession();
              setToken(null);
              setUserState(null);
            }
          } else {
            await clearSession();
            setToken(null);
            setUserState(null);
          }
        }
      } else if (savedToken) {
        // Legacy token without refresh — force re-login.
        await clearSession();
        setToken(null);
        setUserState(null);
      }
      setLoading(false);
    })();
  }, []);

  const applyAuth = useCallback(async (res: AuthResponse) => {
    const accessToken = res.accessToken ?? res.token!;
    await saveSession(accessToken, res.refreshToken, res.user);
    setToken(accessToken);
    setUserState(res.user);
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setRefreshing(true);
      try {
        await wakeApi();
        const res = await api<AuthResponse>("/auth/login", {
          method: "POST",
          body: { email, password },
          skipAuthRefresh: true,
        });
        await applyAuth(res);
      } finally {
        setRefreshing(false);
      }
    },
    [applyAuth],
  );

  const signUp = useCallback(
    async (email: string, password: string, displayName: string) => {
      setRefreshing(true);
      try {
        await wakeApi();
        const res = await api<AuthResponse>("/auth/register", {
          method: "POST",
          body: { email, password, displayName },
          skipAuthRefresh: true,
        });
        await applyAuth(res);
      } finally {
        setRefreshing(false);
      }
    },
    [applyAuth],
  );

  const signInWithGoogle = useCallback(async () => {
    if (Platform.OS !== "android") {
      throw new Error("Google sign-in is available on Android in this release");
    }
    if (!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) {
      throw new Error("Google sign-in is not configured");
    }
    setRefreshing(true);
    try {
      await wakeApi();
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const result = await GoogleSignin.signIn();
      if (result.type === "cancelled") {
        throw new Error("Google sign-in cancelled");
      }
      const idToken =
        (result.type === "success" ? result.data?.idToken : null) ??
        (await GoogleSignin.getTokens()).idToken;
      if (!idToken) throw new Error("Google did not return an ID token");
      const res = await api<AuthResponse>("/auth/google", {
        method: "POST",
        body: { idToken },
        skipAuthRefresh: true,
      });
      await applyAuth(res);
    } finally {
      setRefreshing(false);
    }
  }, [applyAuth]);

  const signOut = useCallback(async () => {
    const refreshToken = await getRefreshToken();
    try {
      if (refreshToken) {
        await api("/auth/logout", {
          method: "POST",
          body: { refreshToken },
          skipAuthRefresh: true,
        });
      }
    } catch {
      // still clear local session
    }
    try {
      await GoogleSignin.signOut();
    } catch {
      // ignore
    }
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
      signInWithGoogle,
      signOut,
      refreshUser,
      setUser,
    }),
    [
      user,
      token,
      loading,
      refreshing,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      refreshUser,
      setUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
