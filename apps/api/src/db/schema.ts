import {
  boolean,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  inviteCode: text("invite_code").notNull().unique(),
  weightUnit: text("weight_unit").notNull().default("kg"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const buddyLinks = pgTable(
  "buddy_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userAId: uuid("user_a_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    userBId: uuid("user_b_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("buddy_pair_idx").on(t.userAId, t.userBId),
    index("buddy_a_idx").on(t.userAId),
    index("buddy_b_idx").on(t.userBId),
  ],
);

export const trainingDays = pgTable("training_days", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const trainingDayExercises = pgTable("training_day_exercises", {
  id: uuid("id").defaultRandom().primaryKey(),
  trainingDayId: uuid("training_day_id")
    .notNull()
    .references(() => trainingDays.id, { onDelete: "cascade" }),
  catalogId: text("catalog_id"),
  name: text("name").notNull(),
  gifUrl: text("gif_url"),
  isCustom: boolean("is_custom").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  targetSets: integer("target_sets"),
  targetReps: integer("target_reps"),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  trainingDayId: uuid("training_day_id").references(() => trainingDays.id, {
    onDelete: "set null",
  }),
  performedAt: timestamp("performed_at", { withTimezone: true }).defaultNow().notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sessionExercises = pgTable("session_exercises", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  catalogId: text("catalog_id"),
  name: text("name").notNull(),
  gifUrl: text("gif_url"),
  isCustom: boolean("is_custom").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const sets = pgTable("sets", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionExerciseId: uuid("session_exercise_id")
    .notNull()
    .references(() => sessionExercises.id, { onDelete: "cascade" }),
  weightKg: numeric("weight_kg", { precision: 10, scale: 3 }).notNull(),
  reps: integer("reps").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});
