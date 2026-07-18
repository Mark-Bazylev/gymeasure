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
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  displayName: text("display_name").notNull(),
  inviteCode: text("invite_code").notNull().unique(),
  weightUnit: text("weight_unit").notNull().default("kg"),
  bodyweightKg: numeric("bodyweight_kg", { precision: 10, scale: 3 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const authIdentities = pgTable(
  "auth_identities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerSubject: text("provider_subject").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("auth_identity_provider_subject_idx").on(t.provider, t.providerSubject),
    index("auth_identity_user_idx").on(t.userId),
  ],
);

export const refreshSessions = pgTable(
  "refresh_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    deviceLabel: text("device_label"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("refresh_sessions_user_idx").on(t.userId)],
);

export const exercises = pgTable(
  "exercises",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    source: text("source").notNull().default("wger"),
    sourceId: text("source_id").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    bodyPart: text("body_part"),
    equipment: text("equipment"),
    muscles: text("muscles"),
    loadingType: text("loading_type").notNull().default("external"),
    imageUrl: text("image_url"),
    licenseName: text("license_name"),
    licenseUrl: text("license_url"),
    licenseAuthor: text("license_author"),
    attribution: text("attribution"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("exercises_source_id_idx").on(t.source, t.sourceId),
    index("exercises_name_idx").on(t.name),
    index("exercises_body_part_idx").on(t.bodyPart),
    index("exercises_equipment_idx").on(t.equipment),
  ],
);

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
  exerciseId: uuid("exercise_id")
    .notNull()
    .references(() => exercises.id, { onDelete: "restrict" }),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const trainingDayPlannedSets = pgTable("training_day_planned_sets", {
  id: uuid("id").defaultRandom().primaryKey(),
  trainingDayExerciseId: uuid("training_day_exercise_id")
    .notNull()
    .references(() => trainingDayExercises.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull().default(0),
  reps: integer("reps").notNull(),
  weightKg: numeric("weight_kg", { precision: 10, scale: 3 }).notNull(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  trainingDayId: uuid("training_day_id").references(() => trainingDays.id, {
    onDelete: "set null",
  }),
  status: text("status").notNull().default("completed"),
  performedAt: timestamp("performed_at", { withTimezone: true }).defaultNow().notNull(),
  bodyweightKg: numeric("bodyweight_kg", { precision: 10, scale: 3 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sessionExercises = pgTable("session_exercises", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  exerciseId: uuid("exercise_id")
    .notNull()
    .references(() => exercises.id, { onDelete: "restrict" }),
  /** Snapshot fields so history survives catalog renames. */
  name: text("name").notNull(),
  imageUrl: text("image_url"),
  loadingType: text("loading_type").notNull().default("external"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const sets = pgTable("sets", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionExerciseId: uuid("session_exercise_id")
    .notNull()
    .references(() => sessionExercises.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull().default(0),
  status: text("status").notNull().default("completed"),
  plannedReps: integer("planned_reps"),
  plannedWeightKg: numeric("planned_weight_kg", { precision: 10, scale: 3 }),
  weightKg: numeric("weight_kg", { precision: 10, scale: 3 }),
  reps: integer("reps"),
  isExtra: boolean("is_extra").notNull().default(false),
});

export const usersRelations = relations(users, ({ many }) => ({
  identities: many(authIdentities),
  refreshSessions: many(refreshSessions),
  trainingDays: many(trainingDays),
  sessions: many(sessions),
}));

export const exercisesRelations = relations(exercises, ({ many }) => ({
  trainingDayExercises: many(trainingDayExercises),
  sessionExercises: many(sessionExercises),
}));

export const trainingDaysRelations = relations(trainingDays, ({ many }) => ({
  exercises: many(trainingDayExercises),
}));

export const trainingDayExercisesRelations = relations(trainingDayExercises, ({ one, many }) => ({
  trainingDay: one(trainingDays, {
    fields: [trainingDayExercises.trainingDayId],
    references: [trainingDays.id],
  }),
  exercise: one(exercises, {
    fields: [trainingDayExercises.exerciseId],
    references: [exercises.id],
  }),
  plannedSets: many(trainingDayPlannedSets),
}));

export const sessionsRelations = relations(sessions, ({ many }) => ({
  exercises: many(sessionExercises),
}));

export const sessionExercisesRelations = relations(sessionExercises, ({ one, many }) => ({
  session: one(sessions, {
    fields: [sessionExercises.sessionId],
    references: [sessions.id],
  }),
  exercise: one(exercises, {
    fields: [sessionExercises.exerciseId],
    references: [exercises.id],
  }),
  sets: many(sets),
}));
