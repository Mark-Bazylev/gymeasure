import type { users } from "../db/schema";

type UserRow = typeof users.$inferSelect;

export function publicUser(user: UserRow) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    inviteCode: user.inviteCode,
    weightUnit: user.weightUnit as "kg" | "lbs",
    bodyweightKg: user.bodyweightKg != null ? Number(user.bodyweightKg) : null,
  };
}
