CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" text NOT NULL UNIQUE,
  "password_hash" text NOT NULL,
  "display_name" text NOT NULL,
  "invite_code" text NOT NULL UNIQUE,
  "weight_unit" text DEFAULT 'kg' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "buddy_links" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_a_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "user_b_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "buddy_pair_idx" ON "buddy_links" ("user_a_id","user_b_id");
CREATE INDEX IF NOT EXISTS "buddy_a_idx" ON "buddy_links" ("user_a_id");
CREATE INDEX IF NOT EXISTS "buddy_b_idx" ON "buddy_links" ("user_b_id");

CREATE TABLE IF NOT EXISTS "training_days" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "training_day_exercises" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "training_day_id" uuid NOT NULL REFERENCES "training_days"("id") ON DELETE cascade,
  "catalog_id" text,
  "name" text NOT NULL,
  "gif_url" text,
  "is_custom" boolean DEFAULT false NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "target_sets" integer,
  "target_reps" integer
);

CREATE TABLE IF NOT EXISTS "sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "training_day_id" uuid REFERENCES "training_days"("id") ON DELETE set null,
  "performed_at" timestamp with time zone DEFAULT now() NOT NULL,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "session_exercises" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_id" uuid NOT NULL REFERENCES "sessions"("id") ON DELETE cascade,
  "catalog_id" text,
  "name" text NOT NULL,
  "gif_url" text,
  "is_custom" boolean DEFAULT false NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS "sets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_exercise_id" uuid NOT NULL REFERENCES "session_exercises"("id") ON DELETE cascade,
  "weight_kg" numeric(10, 3) NOT NULL,
  "reps" integer NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL
);
