// Workflow Automation System Types

export interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  category: WorkflowCategory;
  triggerType: TriggerType;
  triggerConfig: TriggerConfig;
  isActive: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
  steps?: WorkflowStep[];
}

export interface WorkflowInstance {
  id: string;
  templateId: string;
  status: WorkflowStatus;
  priority: number;
  contextData?: Record<string, any>;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  createdAt: Date;
}

export interface WorkflowStep {
  id: string;
  templateId: string;
  stepOrder: number;
  stepType: StepType;
  stepConfig: StepConfig;
  conditions?: Record<string, any>;
  timeoutMinutes: number;
  retryCount: number;
  createdAt: Date;
}

export interface WorkflowStepExecution {
  id: string;
  instanceId: string;
  stepId: string;
  status: StepExecutionStatus;
  inputData?: Record<string, any>;
  outputData?: Record<string, any>;
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
  assignedTo?: string;
  createdAt: Date;
}

export interface WorkflowTaskAssignment {
  id: string;
  stepExecutionId: string;
  assignedTo: string;
  assignedBy?: string;
  taskType: TaskType;
  taskData: Record<string, any>;
  priority: number;
  dueDate?: Date;
  status: TaskStatus;
  completionData?: Record<string, any>;
  assignedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface WorkflowRule {
  id: string;
  name: string;
  description?: string;
  ruleType: RuleType;
  conditions: RuleCondition[];
  actions: RuleAction[];
  priority: number;
  isActive: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowMetric {
  id: string;
  templateId?: string;
  instanceId?: string;
  metricType: MetricType;
  metricValue: number;
  metricUnit?: string;
  dimensions?: Record<string, any>;
  recordedAt: Date;
}

export interface WorkflowEscalation {
  id: string;
  assignmentId: string;
  escalationLevel: number;
  escalatedTo: string;
  escalatedBy?: string;
  escalationReason?: string;
  escalationData?: Record<string, any>;
  escalatedAt: Date;
  resolvedAt?: Date;
}

export interface WorkflowNotification {
  id: string;
  workflowInstanceId: string;
  recipientId: string;
  notificationType: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  status: NotificationStatus;
  sentAt?: Date;
  createdAt: Date;
}

// Enums and Union Types
export type WorkflowCategory =
  | 'moderation'
  | 'seller_management'
  | 'dispute_resolution'
  | 'user_onboarding'
  | 'content_review'
  | 'system_maintenance'
  | 'compliance'
  | 'security';

export type TriggerType =
  | 'event'
  | 'schedule'
  | 'manual'
  | 'condition'
  | 'webhook'
  | 'api_call';

export type WorkflowStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'paused';

export type StepType =
  | 'action'
  | 'condition'
  | 'assignment'
  | 'notification'
  | 'escalation'
  | 'approval'
  | 'data_processing'
  | 'external_api'
  | 'delay'
  | 'data';

export type StepExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'timeout';

export type TaskType =
  | 'review'
  | 'approve'
  | 'investigate'
  | 'moderate'
  | 'verify'
  | 'escalate'
  | 'resolve'
  | 'validate'
  | 'process';

export type TaskStatus =
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'escalated'
  | 'cancelled'
  | 'overdue';

export type RuleType =
  | 'trigger'
  | 'condition'
  | 'action'
  | 'validation'
  | 'transformation';

export type MetricType =
  | 'execution_time'
  | 'success_rate'
  | 'bottleneck'
  | 'sla_breach'
  | 'throughput'
  | 'error_rate'
  | 'user_satisfaction'
  | 'cost_per_execution';

export type NotificationType =
  | 'assignment'
  | 'escalation'
  | 'completion'
  | 'failure'
  | 'reminder'
  | 'approval_required'
  | 'deadline_approaching';

export type NotificationStatus =
  | 'pending'
  | 'sent'
  | 'failed'
  | 'read';

// Configuration Interfaces
export interface TriggerConfig {
  eventType?: string;
  schedule?: ScheduleConfig;
  conditions?: Record<string, any>;
  webhookUrl?: string;
  apiEndpoint?: string;
}

export interface ScheduleConfig {
  type: 'cron' | 'interval' | 'once';
  expression: string;
  timezone?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface StepConfig {
  actionType?: string;
  parameters?: Record<string, any>;
  assignmentRules?: AssignmentRule[];
  notificationTemplate?: NotificationTemplate;
  escalationRules?: EscalationRule[];
  approvalRequired?: boolean;
  timeoutAction?: 'fail' | 'skip' | 'escalate';
}

export interface AssignmentRule {
  type: 'user' | 'role' | 'skill' | 'workload' | 'round_robin';
  criteria: Record<string, any>;
  fallback?: AssignmentRule;
}

export interface NotificationTemplate {
  subject: string;
  body: string;
  channels: ('email' | 'sms' | 'push' | 'in_app')[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface EscalationRule {
  condition: 'timeout' | 'no_response' | 'manual' | 'sla_breach';
  timeoutMinutes?: number;
  escalateTo: string | AssignmentRule;
  notificationTemplate?: NotificationTemplate;
}

export interface RuleCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'regex' | 'exists';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface RuleAction {
  type: 'create_workflow' | 'send_notification' | 'update_data' | 'call_api' | 'escalate';
  parameters: Record<string, any>;
}

// Request/Response Interfaces
export interface CreateWorkflowTemplateRequest {
  name: string;
  description?: string;
  category: WorkflowCategory;
  triggerType: TriggerType;
  triggerConfig: TriggerConfig;
  steps: Omit<WorkflowStep, 'id' | 'templateId' | 'createdAt'>[];
}

export interface UpdateWorkflowTemplateRequest {
  name?: string;
  description?: string;
  triggerConfig?: TriggerConfig;
  isActive?: boolean;
}

export interface ExecuteWorkflowRequest {
  templateId: string;
  contextData?: Record<string, any>;
  priority?: number;
}

export interface CompleteTaskRequest {
  taskId: string;
  completionData: Record<string, any>;
  status: 'completed' | 'escalated';
}

export interface WorkflowAnalytics {
  totalExecutions: number;
  successRate: number;
  averageExecutionTime: number;
  bottlenecks: BottleneckAnalysis[];
  slaBreaches: number;
  topFailureReasons: FailureReason[];
}

export interface BottleneckAnalysis {
  stepId: string;
  stepName: string;
  averageTime: number;
  frequency: number;
  impact: 'low' | 'medium' | 'high';
}

export interface FailureReason {
  reason: string;
  count: number;
  percentage: number;
}

// Workflow Designer Interfaces
export interface WorkflowDesignerNode {
  id: string;
  type: StepType;
  position: { x: number; y: number };
  data: {
    label: string;
    config: StepConfig;
    conditions?: Record<string, any>;
  };
}

export interface WorkflowDesignerEdge {
  id: string;
  source: string;
  target: string;
  type: 'default' | 'conditional';
  data?: {
    condition?: RuleCondition;
    label?: string;
  };
}

export interface WorkflowDesignerData {
  nodes: WorkflowDesignerNode[];
  edges: WorkflowDesignerEdge[];
  metadata: {
    name: string;
    description?: string;
    category: WorkflowCategory;
    triggerType: TriggerType;
    triggerConfig: TriggerConfig;
    version?: string;
    tags?: string[];
    priority?: 'low' | 'medium' | 'high' | 'urgent';
  };
}
