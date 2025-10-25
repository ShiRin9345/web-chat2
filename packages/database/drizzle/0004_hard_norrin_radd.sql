CREATE TABLE "call_record" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" text NOT NULL,
	"caller_id" text NOT NULL,
	"receiver_id" text NOT NULL,
	"call_type" text NOT NULL,
	"status" text NOT NULL,
	"duration" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp,
	"ended_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "call_record" ADD CONSTRAINT "call_record_caller_id_user_id_fk" FOREIGN KEY ("caller_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_record" ADD CONSTRAINT "call_record_receiver_id_user_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;