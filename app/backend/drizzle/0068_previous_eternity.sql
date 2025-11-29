CREATE TABLE "workflow_instances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"status" varchar(20) NOT NULL,
	"priority" integer DEFAULT 5 NOT NULL,
	"context_data" jsonb,
	"started_at" timestamp,
	"completed_at" timestamp,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid,
	"instance_id" uuid,
	"metric_type" varchar(50) NOT NULL,
	"metric_value" numeric(20, 8) NOT NULL,
	"metric_unit" varchar(20),
	"dimensions" jsonb,
	"recorded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"rule_type" varchar(50) NOT NULL,
	"conditions" jsonb NOT NULL,
	"actions" jsonb NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_step_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instance_id" uuid NOT NULL,
	"step_id" uuid NOT NULL,
	"status" varchar(20) NOT NULL,
	"input_data" jsonb,
	"output_data" jsonb,
	"error_message" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"assigned_to" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"step_order" integer NOT NULL,
	"step_type" varchar(50) NOT NULL,
	"step_config" jsonb NOT NULL,
	"conditions" jsonb,
	"timeout_minutes" integer DEFAULT 60 NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_task_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"step_execution_id" uuid NOT NULL,
	"assigned_to" uuid NOT NULL,
	"assigned_by" uuid,
	"task_type" varchar(50) NOT NULL,
	"task_data" jsonb NOT NULL,
	"priority" integer DEFAULT 5 NOT NULL,
	"due_date" timestamp,
	"status" varchar(20) NOT NULL,
	"completion_data" jsonb,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "workflow_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(50) NOT NULL,
	"trigger_type" varchar(50) NOT NULL,
	"trigger_config" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_template_id_workflow_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."workflow_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_metrics" ADD CONSTRAINT "workflow_metrics_template_id_workflow_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."workflow_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_metrics" ADD CONSTRAINT "workflow_metrics_instance_id_workflow_instances_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."workflow_instances"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_rules" ADD CONSTRAINT "workflow_rules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_step_executions" ADD CONSTRAINT "workflow_step_executions_instance_id_workflow_instances_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."workflow_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_step_executions" ADD CONSTRAINT "workflow_step_executions_step_id_workflow_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."workflow_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_step_executions" ADD CONSTRAINT "workflow_step_executions_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_template_id_workflow_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."workflow_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_task_assignments" ADD CONSTRAINT "workflow_task_assignments_step_execution_id_workflow_step_executions_id_fk" FOREIGN KEY ("step_execution_id") REFERENCES "public"."workflow_step_executions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_task_assignments" ADD CONSTRAINT "workflow_task_assignments_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_task_assignments" ADD CONSTRAINT "workflow_task_assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_templates" ADD CONSTRAINT "workflow_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workflow_instances_template_idx" ON "workflow_instances" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "workflow_instances_status_idx" ON "workflow_instances" USING btree ("status");--> statement-breakpoint
CREATE INDEX "workflow_metrics_template_idx" ON "workflow_metrics" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "workflow_metrics_instance_idx" ON "workflow_metrics" USING btree ("instance_id");--> statement-breakpoint
CREATE INDEX "workflow_metrics_type_idx" ON "workflow_metrics" USING btree ("metric_type");--> statement-breakpoint
CREATE INDEX "workflow_step_executions_instance_idx" ON "workflow_step_executions" USING btree ("instance_id");--> statement-breakpoint
CREATE INDEX "workflow_step_executions_step_idx" ON "workflow_step_executions" USING btree ("step_id");--> statement-breakpoint
CREATE INDEX "workflow_step_executions_status_idx" ON "workflow_step_executions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "workflow_steps_template_idx" ON "workflow_steps" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "workflow_steps_order_idx" ON "workflow_steps" USING btree ("template_id","step_order");--> statement-breakpoint
CREATE INDEX "workflow_task_assignments_step_execution_idx" ON "workflow_task_assignments" USING btree ("step_execution_id");--> statement-breakpoint
CREATE INDEX "workflow_task_assignments_assigned_to_idx" ON "workflow_task_assignments" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "workflow_task_assignments_status_idx" ON "workflow_task_assignments" USING btree ("status");