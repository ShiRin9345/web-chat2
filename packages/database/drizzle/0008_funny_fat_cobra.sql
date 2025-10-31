ALTER TABLE "call_record" ALTER COLUMN "receiver_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "call_record" ADD COLUMN "group_id" uuid;--> statement-breakpoint
ALTER TABLE "call_record" ADD CONSTRAINT "call_record_group_id_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."group"("id") ON DELETE cascade ON UPDATE no action;