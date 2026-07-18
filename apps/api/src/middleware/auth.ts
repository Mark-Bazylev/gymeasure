import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { and, eq, isNull, gt } from "drizzle-orm";
import { db } from "../db/client";
import { refreshSessions, users } from "../db/schema";
import { hashToken, randomRefreshToken } from "../lib/tokens";

export { hashToken };

export type AuthUser = { id: string; email: string };

const ACCESS_TTL = "15m";
const REFRESH_TTL_MS = 1000 * 60 * 60 * 24 * 180; // 180 days

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      refreshSessionId?: string;
    }
  }
}

function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not configured");
  return secret;
}

export function signAccessToken(user: AuthUser): string {
  return jwt.sign({ id: user.id, email: user.email, typ: "access" }, jwtSecret(), {
    expiresIn: ACCESS_TTL,
  });
}

export async function issueRefreshToken(
  userId: string,
  deviceLabel?: string | null,
): Promise<{ refreshToken: string; expiresAt: Date }> {
  const refreshToken = randomRefreshToken();
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
  await db.insert(refreshSessions).values({
    userId,
    tokenHash: hashToken(refreshToken),
    deviceLabel: deviceLabel ?? null,
    expiresAt,
  });
  return { refreshToken, expiresAt };
}

export async function rotateRefreshToken(
  refreshToken: string,
): Promise<{ user: AuthUser; accessToken: string; refreshToken: string; expiresAt: Date } | null> {
  const tokenHash = hashToken(refreshToken);
  const session = await db.query.refreshSessions.findFirst({
    where: and(
      eq(refreshSessions.tokenHash, tokenHash),
      isNull(refreshSessions.revokedAt),
      gt(refreshSessions.expiresAt, new Date()),
    ),
  });
  if (!session) return null;

  const user = await db.query.users.findFirst({ where: eq(users.id, session.userId) });
  if (!user) return null;

  await db
    .update(refreshSessions)
    .set({ revokedAt: new Date() })
    .where(eq(refreshSessions.id, session.id));

  const next = await issueRefreshToken(user.id, session.deviceLabel);
  const authUser = { id: user.id, email: user.email };
  return {
    user: authUser,
    accessToken: signAccessToken(authUser),
    refreshToken: next.refreshToken,
    expiresAt: next.expiresAt,
  };
}

export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  const tokenHash = hashToken(refreshToken);
  await db
    .update(refreshSessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshSessions.tokenHash, tokenHash), isNull(refreshSessions.revokedAt)));
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, jwtSecret()) as AuthUser & { typ?: string };
    if (payload.typ && payload.typ !== "access") {
      return res.status(401).json({ error: "Invalid token" });
    }
    req.user = { id: payload.id, email: payload.email };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

/** @deprecated use signAccessToken + issueRefreshToken */
export function signToken(user: AuthUser): string {
  return signAccessToken(user);
}

export async function issueAuthPair(user: AuthUser, deviceLabel?: string | null) {
  const accessToken = signAccessToken(user);
  const { refreshToken, expiresAt } = await issueRefreshToken(user.id, deviceLabel);
  return { accessToken, refreshToken, expiresAt };
}
