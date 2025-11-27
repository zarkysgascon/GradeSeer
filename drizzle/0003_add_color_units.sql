-- Add missing columns for deployed DB compatibility
ALTER TABLE "subjects" ADD COLUMN IF NOT EXISTS "color" varchar(25) DEFAULT '#3B82F6';
ALTER TABLE "subjects" ADD COLUMN IF NOT EXISTS "units" integer DEFAULT 3;
ALTER TABLE "subject_history" ADD COLUMN IF NOT EXISTS "units" integer DEFAULT 3;
