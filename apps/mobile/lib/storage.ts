import AsyncStorage from "@react-native-async-storage/async-storage";
import type { User } from "./api";

const TOKEN_KEY = "gymeasure.token";
const USER_KEY = "gymeasure.user";
const DAYS_CACHE_KEY = "gymeasure.trainingDays";
const SESSIONS_CACHE_KEY = "gymeasure.sessions";

export async function saveSession(token: string, user: User) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function clearSession() {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY, DAYS_CACHE_KEY, SESSIONS_CACHE_KEY]);
}

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
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
