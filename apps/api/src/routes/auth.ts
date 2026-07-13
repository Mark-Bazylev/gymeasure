import { Router } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { loginSchema, registerSchema, updateSettingsSchema } from "@gymeasure/shared";
import { db } from "../db/client";
import { users } from "../db/schema";
import { generateInviteCode } from "../lib/ids";
import { requireAuth, signToken } from "../middleware/auth";

export const authRouter = Router();

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

  let inviteCode = generateInviteCode();
  for (let i = 0; i < 5; i++) {
    const clash = await db.query.users.findFirst({ where: eq(users.inviteCode, inviteCode) });
    if (!clash) break;
    inviteCode = generateInviteCode();
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(users)
    .values({
      email: email.toLowerCase(),
      passwordHash,
      displayName,
      inviteCode,
      weightUnit: "kg",
    })
    .returning();

  if (!user) return res.status(500).json({ error: "Failed to create user" });

  const token = signToken({ id: user.id, email: user.email });
  return res.status(201).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      inviteCode: user.inviteCode,
      weightUnit: user.weightUnit,
    },
  });
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { email, password } = parsed.data;
  const user = await db.query.users.findFirst({ where: eq(users.email, email.toLowerCase()) });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = signToken({ id: user.id, email: user.email });
  return res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      inviteCode: user.inviteCode,
      weightUnit: user.weightUnit,
    },
  });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await db.query.users.findFirst({ where: eq(users.id, req.user!.id) });
  if (!user) return res.status(404).json({ error: "User not found" });
  return res.json({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    inviteCode: user.inviteCode,
    weightUnit: user.weightUnit,
  });
});

authRouter.patch("/settings", requireAuth, async (req, res) => {
  const parsed = updateSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const [user] = await db
    .update(users)
    .set({
      weightUnit: parsed.data.weightUnit,
      ...(parsed.data.displayName ? { displayName: parsed.data.displayName } : {}),
    })
    .where(eq(users.id, req.user!.id))
    .returning();
  if (!user) return res.status(404).json({ error: "User not found" });
  return res.json({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    inviteCode: user.inviteCode,
    weightUnit: user.weightUnit,
  });
});
