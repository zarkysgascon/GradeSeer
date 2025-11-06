ALTER TABLE "users" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "users" CASCADE;--> statement-breakpoint
ALTER TABLE "components" DROP CONSTRAINT "components_subject_id_subjects_id_fk";
--> statement-breakpoint
ALTER TABLE "components" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "components" ALTER COLUMN "percentage" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "components" ALTER COLUMN "priority" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "subjects" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN "target_grade" numeric;--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN "created_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "components" ADD CONSTRAINT "components_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;