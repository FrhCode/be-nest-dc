CREATE TABLE "dm_hidden_messages" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "dm_hidden_messages_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"message_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "dm_hidden_messages_message_id_user_id_unique" UNIQUE("message_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "direct_messages" ADD COLUMN "reply_to_message_id" integer;--> statement-breakpoint
ALTER TABLE "direct_messages" ADD COLUMN "is_deleted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "dm_hidden_messages" ADD CONSTRAINT "dm_hidden_messages_message_id_direct_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."direct_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_hidden_messages" ADD CONSTRAINT "dm_hidden_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
