CREATE TABLE "history" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_email" text NOT NULL,
    "subject" text NOT NULL,
    "target_grade" double precision NOT NULL,
    "raw_grade" double precision NOT NULL,
    "finished" timestamp NOT NULL,
    CONSTRAINT "history_user_email_fk" FOREIGN KEY ("user_email") REFERENCES "public"."users"("email") ON DELETE NO ACTION ON UPDATE NO ACTION
);
