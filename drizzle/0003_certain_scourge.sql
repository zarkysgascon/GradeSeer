CREATE TABLE "items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"component_id" uuid NOT NULL,
	"name" text NOT NULL,
	"score" integer,
	"max" integer,
	"date" varchar,
	"target" integer
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_email" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"subject_id" uuid,
	"subject_name" text,
	"due_date" timestamp,
	"read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"email" text,
	"image" text,
	"password" text,
	"provider" text,
	"provider_id" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "components" ALTER COLUMN "subject_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "components" ALTER COLUMN "percentage" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "components" ALTER COLUMN "priority" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "subjects" ALTER COLUMN "is_major" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "subjects" ALTER COLUMN "target_grade" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN "color" varchar(25) DEFAULT '#3B82F6';--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_component_id_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."components"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjects" DROP COLUMN "created_at";