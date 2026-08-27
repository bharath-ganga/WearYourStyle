CREATE TABLE "migration_user_aliases" (
	"source_user_id" text PRIMARY KEY NOT NULL,
	"target_user_id" text NOT NULL,
	"source" text DEFAULT 'firebase-firestore' NOT NULL,
	"migrated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "migration_user_aliases_target_idx" ON "migration_user_aliases" USING btree ("target_user_id");