-- Workflow Automation System Schema
-- This migration creates tables for the workflow automation engine

-- Workflow Templates
CREATE TABLE IF NOT EXISTS workflow_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL, -- 'moderation', 'seller_management', 'dispute_resolution', etc.
    trigger_type VARCHAR(50) NOT NULL, -- 'event', 'schedule', 'manual', 'condition'
    trigger_config JSONB NOT NULL, -- Configuration for triggers
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Workflow Instances (executions of templates)
CREATE TABLE IF NOT EXISTS workflow_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES workflow_templates(id),
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed', 'cancelled'
    priority INTEGER DEFAULT 5, -- 1-10, higher is more urgent
    context_data JSONB, -- Data context for this workflow execution
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Workflow Steps (individual actions within a workflow)
CREATE TABLE IF NOT EXISTS workflow_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES workflow_templates(id),
    step_order INTEGER NOT NULL,
    step_type VARCHAR(50) NOT NULL, -- 'action', 'condition', 'assignment', 'notification', 'escalation'
    step_config JSONB NOT NULL, -- Configuration for this step
    conditions JSONB, -- Conditions for step execution
    timeout_minutes INTEGER DEFAULT 60,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Workflow Step Executions (tracking individual step runs)
CREATE TABLE IF NOT EXISTS workflow_step_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID REFERENCES workflow_instances(id),
    step_id UUID REFERENCES workflow_steps(id),
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed', 'skipped'
    input_data JSONB,
    output_data JSONB,
    error_message TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    assigned_to UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Task Assignments (for human tasks in workflows)
CREATE TABLE IF NOT EXISTS workflow_task_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    step_execution_id UUID REFERENCES workflow_step_executions(id),
    assigned_to UUID REFERENCES users(id),
    assigned_by UUID REFERENCES users(id),
    task_type VARCHAR(100) NOT NULL, -- 'review', 'approve', 'investigate', 'moderate', etc.
    task_data JSONB NOT NULL,
    priority INTEGER DEFAULT 5,
    due_date TIMESTAMP,
    status VARCHAR(50) NOT NULL DEFAULT 'assigned', -- 'assigned', 'in_progress', 'completed', 'escalated'
    completion_data JSONB,
    assigned_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- Workflow Rules (for rule-based automation)
CREATE TABLE IF NOT EXISTS workflow_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    rule_type VARCHAR(50) NOT NULL, -- 'trigger', 'condition', 'action'
    conditions JSONB NOT NULL, -- Rule conditions in JSON format
    actions JSONB NOT NULL, -- Actions to take when conditions are met
    priority INTEGER DEFAULT 5,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Workflow Metrics (for performance tracking)
CREATE TABLE IF NOT EXISTS workflow_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES workflow_templates(id),
    instance_id UUID REFERENCES workflow_instances(id),
    metric_type VARCHAR(100) NOT NULL, -- 'execution_time', 'success_rate', 'bottleneck', 'sla_breach'
    metric_value NUMERIC NOT NULL,
    metric_unit VARCHAR(50), -- 'seconds', 'minutes', 'percentage', 'count'
    dimensions JSONB, -- Additional dimensions for the metric
    recorded_at TIMESTAMP DEFAULT NOW()
);

-- Workflow Escalations
CREATE TABLE IF NOT EXISTS workflow_escalations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID REFERENCES workflow_task_assignments(id),
    escalation_level INTEGER NOT NULL DEFAULT 1,
    escalated_to UUID REFERENCES users(id),
    escalated_by UUID REFERENCES users(id),
    escalation_reason VARCHAR(255),
    escalation_data JSONB,
    escalated_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP
);

-- Workflow Notifications
CREATE TABLE IF NOT EXISTS workflow_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_instance_id UUID REFERENCES workflow_instances(id),
    recipient_id UUID REFERENCES users(id),
    notification_type VARCHAR(100) NOT NULL, -- 'assignment', 'escalation', 'completion', 'failure'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'failed'
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workflow_templates_category ON workflow_templates(category);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_trigger_type ON workflow_templates(trigger_type);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_status ON workflow_instances(status);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_template_id ON workflow_instances(template_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_priority ON workflow_instances(priority);
CREATE INDEX IF NOT EXISTS idx_workflow_step_executions_instance_id ON workflow_step_executions(instance_id);
CREATE INDEX IF NOT EXISTS idx_workflow_step_executions_status ON workflow_step_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_task_assignments_assigned_to ON workflow_task_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_workflow_task_assignments_status ON workflow_task_assignments(status);
CREATE INDEX IF NOT EXISTS idx_workflow_task_assignments_due_date ON workflow_task_assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_workflow_rules_rule_type ON workflow_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_workflow_metrics_template_id ON workflow_metrics(template_id);
CREATE INDEX IF NOT EXISTS idx_workflow_metrics_recorded_at ON workflow_metrics(recorded_at);
CREATE INDEX IF NOT EXISTS idx_workflow_escalations_assignment_id ON workflow_escalations(assignment_id);
CREATE INDEX IF NOT EXISTS idx_workflow_notifications_recipient_id ON workflow_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_workflow_notifications_status ON workflow_notifications(status);
