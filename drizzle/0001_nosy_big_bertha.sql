CREATE TABLE "components" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"percentage" integer NOT NULL,
	"priority" integer NOT NULL,
	"subject_id" uuid
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"is_major" boolean DEFAULT false,
	"user_email" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "name" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "provider" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "provider_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "components" ADD CONSTRAINT "components_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;