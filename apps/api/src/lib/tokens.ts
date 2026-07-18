import { createHash, randomBytes } from "crypto";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function randomRefreshToken(): string {
  return randomBytes(48).toString("base64url");
}
