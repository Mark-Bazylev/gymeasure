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
};

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

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
