CREATE TABLE "help_tips" (
	"key" text PRIMARY KEY NOT NULL,
	"text" text DEFAULT '' NOT NULL,
	"file_name" text,
	"file_type" text,
	"file_data" "bytea",
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
