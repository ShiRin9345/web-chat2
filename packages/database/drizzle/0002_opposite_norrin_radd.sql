ALTER TABLE "user" ADD COLUMN "code" varchar(15) NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_code_unique" UNIQUE("code");