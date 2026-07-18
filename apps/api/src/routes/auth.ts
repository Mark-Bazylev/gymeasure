import { Router } from "express";
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { OAuth2Client } from "google-auth-library";
import {
  googleAuthSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  updateSettingsSchema,
} from "@gymeasure/shared";
import { db } from "../db/client";
import { authIdentities, users } from "../db/schema";
import { generateInviteCode } from "../lib/ids";
import { publicUser } from "../lib/user";
import {
  issueAuthPair,
  requireAuth,
  revokeRefreshToken,
  rotateRefreshToken,
} from "../middleware/auth";

export const authRouter = Router();

async function uniqueInviteCode(): Promise<string> {
  let inviteCode = generateInviteCode();
  for (let i = 0; i < 5; i++) {
    const clash = await db.query.users.findFirst({ where: eq(users.inviteCode, inviteCode) });
    if (!clash) return inviteCode;
    inviteCode = generateInviteCode();
  }
  return inviteCode;
}

function deviceLabel(req: { headers: Record<string, unknown> }): string | null {
  const raw = req.headers["x-device-label"];
  return typeof raw === "string" ? raw.slice(0, 120) : null;
}

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { email, password, displayName } = parsed.data;
  const existing = await db.query.users.findFirst({ where: eq(users.email, email.toLowerCase()) });
  if (existing) {
    return res.status(409).json({ error: "Email already registered" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(users)
    .values({
      email: email.toLowerCase(),
      passwordHash,
      displayName,
      inviteCode: await uniqueInviteCode(),
      weightUnit: "kg",
    })
    .returning();

  if (!user) return res.status(500).json({ error: "Failed to create user" });

  const tokens = await issueAuthPair({ id: user.id, email: user.email }, deviceLabel(req));
  return res.status(201).json({
    token: tokens.accessToken,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    refreshExpiresAt: tokens.expiresAt.toISOString(),
    user: publicUser(user),
  });
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { email, password } = parsed.data;
  const user = await db.query.users.findFirst({ where: eq(users.email, email.toLowerCase()) });
  if (!user?.passwordHash) return res.status(401).json({ error: "Invalid credentials" });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const tokens = await issueAuthPair({ id: user.id, email: user.email }, deviceLabel(req));
  return res.json({
    token: tokens.accessToken,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    refreshExpiresAt: tokens.expiresAt.toISOString(),
    user: publicUser(user),
  });
});

authRouter.post("/google", async (req, res) => {
  const parsed = googleAuthSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const clientIds = [
    process.env.GOOGLE_WEB_CLIENT_ID,
    process.env.GOOGLE_ANDROID_CLIENT_ID,
    process.env.GOOGLE_IOS_CLIENT_ID,
  ].filter(Boolean) as string[];

  if (clientIds.length === 0) {
    return res.status(503).json({ error: "Google sign-in is not configured" });
  }

  try {
    const client = new OAuth2Client();
    const ticket = await client.verifyIdToken({
      idToken: parsed.data.idToken,
      audience: clientIds,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) {
      return res.status(401).json({ error: "Invalid Google token" });
    }
    if (payload.email_verified === false) {
      return res.status(401).json({ error: "Google email is not verified" });
    }

    const email = payload.email.toLowerCase();
    const identity = await db.query.authIdentities.findFirst({
      where: and(
        eq(authIdentities.provider, "google"),
        eq(authIdentities.providerSubject, payload.sub),
      ),
    });

    let user =
      identity != null
        ? await db.query.users.findFirst({ where: eq(users.id, identity.userId) })
        : await db.query.users.findFirst({ where: eq(users.email, email) });

    if (!user) {
      const [created] = await db
        .insert(users)
        .values({
          email,
          passwordHash: null,
          displayName: payload.name?.slice(0, 60) || email.split("@")[0] || "Lifter",
          inviteCode: await uniqueInviteCode(),
          weightUnit: "kg",
        })
        .returning();
      user = created ?? null;
    }

    if (!user) return res.status(500).json({ error: "Failed to create user" });

    if (!identity) {
      await db.insert(authIdentities).values({
        userId: user.id,
        provider: "google",
        providerSubject: payload.sub,
      });
    } else if (identity.provider !== "google") {
      return res.status(409).json({ error: "Identity already linked to another provider" });
    }

    const tokens = await issueAuthPair({ id: user.id, email: user.email }, deviceLabel(req));
    return res.json({
      token: tokens.accessToken,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      refreshExpiresAt: tokens.expiresAt.toISOString(),
      user: publicUser(user),
    });
  } catch (err) {
    console.error("Google auth failed", err);
    return res.status(401).json({ error: "Google authentication failed" });
  }
});

authRouter.post("/refresh", async (req, res) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const rotated = await rotateRefreshToken(parsed.data.refreshToken);
  if (!rotated) return res.status(401).json({ error: "Invalid refresh token" });

  const user = await db.query.users.findFirst({ where: eq(users.id, rotated.user.id) });
  if (!user) return res.status(401).json({ error: "Invalid refresh token" });

  return res.json({
    token: rotated.accessToken,
    accessToken: rotated.accessToken,
    refreshToken: rotated.refreshToken,
    refreshExpiresAt: rotated.expiresAt.toISOString(),
    user: publicUser(user),
  });
});

authRouter.post("/logout", async (req, res) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (parsed.success) {
    await revokeRefreshToken(parsed.data.refreshToken);
  }
  return res.status(204).send();
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await db.query.users.findFirst({ where: eq(users.id, req.user!.id) });
  if (!user) return res.status(404).json({ error: "User not found" });
  return res.json(publicUser(user));
});

authRouter.patch("/settings", requireAuth, async (req, res) => {
  const parsed = updateSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const [user] = await db
    .update(users)
    .set({
      ...(parsed.data.weightUnit ? { weightUnit: parsed.data.weightUnit } : {}),
      ...(parsed.data.displayName ? { displayName: parsed.data.displayName } : {}),
      ...(parsed.data.bodyweightKg != null
        ? { bodyweightKg: String(parsed.data.bodyweightKg) }
        : {}),
    })
    .where(eq(users.id, req.user!.id))
    .returning();
  if (!user) return res.status(404).json({ error: "User not found" });
  return res.json(publicUser(user));
});
