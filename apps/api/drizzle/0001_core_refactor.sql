-- Gymeasure core refactor: owned catalog, auth sessions, per-set prescriptions.
-- Destructive for legacy custom exercise / old session set shapes (approved).

DELETE FROM "sets";
DELETE FROM "session_exercises";
DELETE FROM "sessions";
DELETE FROM "training_day_exercises";
DELETE FROM "training_days";

ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bodyweight_kg" numeric(10, 3);

CREATE TABLE IF NOT EXISTS "auth_identities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "provider" text NOT NULL,
  "provider_subject" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "auth_identity_provider_subject_idx"
  ON "auth_identities" ("provider", "provider_subject");
CREATE INDEX IF NOT EXISTS "auth_identity_user_idx" ON "auth_identities" ("user_id");

CREATE TABLE IF NOT EXISTS "refresh_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "token_hash" text NOT NULL UNIQUE,
  "device_label" text,
  "expires_at" timestamp with time zone NOT NULL,
  "revoked_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_used_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "refresh_sessions_user_idx" ON "refresh_sessions" ("user_id");

CREATE TABLE IF NOT EXISTS "exercises" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "source" text DEFAULT 'wger' NOT NULL,
  "source_id" text NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "description" text,
  "body_part" text,
  "equipment" text,
  "muscles" text,
  "loading_type" text DEFAULT 'external' NOT NULL,
  "image_url" text,
  "license_name" text,
  "license_url" text,
  "license_author" text,
  "attribution" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "exercises_source_id_idx" ON "exercises" ("source", "source_id");
CREATE INDEX IF NOT EXISTS "exercises_name_idx" ON "exercises" ("name");
CREATE INDEX IF NOT EXISTS "exercises_body_part_idx" ON "exercises" ("body_part");
CREATE INDEX IF NOT EXISTS "exercises_equipment_idx" ON "exercises" ("equipment");

DROP TABLE IF EXISTS "training_day_exercises";
CREATE TABLE "training_day_exercises" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "training_day_id" uuid NOT NULL REFERENCES "training_days"("id") ON DELETE cascade,
  "exercise_id" uuid NOT NULL REFERENCES "exercises"("id") ON DELETE restrict,
  "sort_order" integer DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS "training_day_planned_sets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "training_day_exercise_id" uuid NOT NULL REFERENCES "training_day_exercises"("id") ON DELETE cascade,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "reps" integer NOT NULL,
  "weight_kg" numeric(10, 3) NOT NULL
);

ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'completed' NOT NULL;
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "bodyweight_kg" numeric(10, 3);
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;

DROP TABLE IF EXISTS "sets";
DROP TABLE IF EXISTS "session_exercises";

CREATE TABLE "session_exercises" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_id" uuid NOT NULL REFERENCES "sessions"("id") ON DELETE cascade,
  "exercise_id" uuid NOT NULL REFERENCES "exercises"("id") ON DELETE restrict,
  "name" text NOT NULL,
  "image_url" text,
  "loading_type" text DEFAULT 'external' NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL
);

CREATE TABLE "sets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_exercise_id" uuid NOT NULL REFERENCES "session_exercises"("id") ON DELETE cascade,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "status" text DEFAULT 'completed' NOT NULL,
  "planned_reps" integer,
  "planned_weight_kg" numeric(10, 3),
  "weight_kg" numeric(10, 3),
  "reps" integer,
  "is_extra" boolean DEFAULT false NOT NULL
);
