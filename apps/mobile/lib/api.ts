import { displayToKg, kgToDisplay, type WeightUnit } from "@gymeasure/shared";

const DEFAULT_API = "http://localhost:4000";

export function getApiUrl(): string {
  return process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") || DEFAULT_API;
}

export type User = {
  id: string;
  email: string;
  displayName: string;
  inviteCode: string;
  weightUnit: WeightUnit;
  bodyweightKg: number | null;
};

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
  skipAuthRefresh?: boolean;
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type TokenBridge = {
  getAccessToken: () => string | null;
  getRefreshToken: () => Promise<string | null>;
  onRefreshed: (tokens: { accessToken: string; refreshToken: string; user?: User }) => Promise<void>;
  onAuthFailure: () => Promise<void>;
};

let bridge: TokenBridge | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function configureApiAuth(next: TokenBridge) {
  bridge = next;
}

async function refreshAccessToken(): Promise<string | null> {
  if (!bridge) return null;
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = await bridge!.getRefreshToken();
      if (!refreshToken) {
        await bridge!.onAuthFailure();
        return null;
      }
      try {
        const data = await api<{
          accessToken: string;
          refreshToken: string;
          user: User;
        }>("/auth/refresh", {
          method: "POST",
          body: { refreshToken },
          skipAuthRefresh: true,
        });
        await bridge!.onRefreshed({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          user: data.user,
        });
        return data.accessToken;
      } catch {
        await bridge!.onAuthFailure();
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const token = options.token ?? bridge?.getAccessToken() ?? null;
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${getApiUrl()}${path}`, {
      method: options.method ?? (options.body ? "POST" : "GET"),
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Cannot reach server. Waiting for API wake-up or check your connection.");
  }

  if (response.status === 401 && !options.skipAuthRefresh && bridge && !path.startsWith("/auth/")) {
    const nextToken = await refreshAccessToken();
    if (nextToken) {
      return api<T>(path, { ...options, token: nextToken, skipAuthRefresh: true });
    }
  }

  if (response.status === 204) return undefined as T;

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof data.error === "string"
        ? data.error
        : data.error
          ? JSON.stringify(data.error)
          : `Request failed (${response.status})`;
    throw new ApiError(response.status, message);
  }
  return data as T;
}

export async function wakeApi(): Promise<void> {
  try {
    await fetch(`${getApiUrl()}/health`);
  } catch {
    // cold start — ignore
  }
}

export { displayToKg, kgToDisplay };
