import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import type { User } from "./api";

const TOKEN_KEY = "gymeasure.accessToken";
const REFRESH_KEY = "gymeasure.refreshToken";
const USER_KEY = "gymeasure.user";
const DAYS_CACHE_KEY = "gymeasure.trainingDays";
const SESSIONS_CACHE_KEY = "gymeasure.sessions";

export async function saveSession(accessToken: string, refreshToken: string, user: User) {
  await AsyncStorage.setItem(TOKEN_KEY, accessToken);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
}

export async function clearSession() {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY, DAYS_CACHE_KEY, SESSIONS_CACHE_KEY]);
  try {
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  } catch {
    // ignore missing key
  }
}

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setAccessToken(token: string) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function getRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_KEY);
  } catch {
    return null;
  }
}

export async function getCachedUser(): Promise<User | null> {
  const raw = await AsyncStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export async function cacheUser(user: User) {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function cacheTrainingDays(days: unknown) {
  await AsyncStorage.setItem(DAYS_CACHE_KEY, JSON.stringify(days));
}

export async function getCachedTrainingDays<T>(): Promise<T | null> {
  const raw = await AsyncStorage.getItem(DAYS_CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSessions(sessions: unknown) {
  await AsyncStorage.setItem(SESSIONS_CACHE_KEY, JSON.stringify(sessions));
}

export async function getCachedSessions<T>(): Promise<T | null> {
  const raw = await AsyncStorage.getItem(SESSIONS_CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
