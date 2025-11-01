import { z } from 'zod';

// Content types that can be moderated
export const ContentType = z.enum([
  'post',
  'comment', 
  'listing',
  'dm',
  'username',
  'image',
  'video'
]);

// Moderation case status
export const ModerationStatus = z.enum([
  'pending',
  'quarantined',
  'blocked',
  'allowed',
  'appealed',
  'under_review'
]);

// Moderation decisions
export const ModerationDecision = z.enum([
  'allow',
  'limit',
  'block',
  'review'
]);

// Moderation actions
export const ModerationAction = z.enum([
  'warn',
  'limit',
  'suspend',
  'ban',
  'delete_content',
  'quarantine'
]);

// Report reasons
export const ReportReason = z.enum([
  'spam',
  'harassment',
  'hate_speech',
  'violence',
  'nsfw',
  'scam',
  'fake_content',
  'copyright',
  'other'
]);

// Report status
export const ReportStatus = z.enum([
  'open',
  'under_review',
  'resolved',
  'dismissed'
]);

// Appeal status
export const AppealStatus = z.enum([
  'open',
  'jury_selection',
  'voting',
  'decided',
  'executed'
]);

// Jury decision
export const JuryDecision = z.enum([
  'uphold',
  'overturn',
  'partial'
]);

// Policy severity levels
export const PolicySeverity = z.enum([
  'low',
  'medium',
  'high',
  'critical'
]);

// Vendor types
export const VendorType = z.enum([
  'text',
  'image',
  'video',
  'link',
  'custom'
]);

// Actor types for audit log
export const ActorType = z.enum([
  'user',
  'moderator',
  'system',
  'ai'
]);

// Hash types for content deduplication
export const HashType = z.enum([
  'md5',
  'sha256',
  'perceptual',
  'text_similarity'
]);

// Reputation impact types
export const ReputationImpactType = z.enum([
  'violation',
  'helpful_report',
  'false_report',
  'successful_appeal',
  'jury_accuracy'
]);

// Jury vote options
export const JuryVote = z.enum([
  'uphold',
  'overturn',
  'partial'
]);

// Core moderation case schema
export const ModerationCaseSchema = z.object({
  id: z.number().optional(),
  contentId: z.string().max(64),
  contentType: ContentType,
  userId: z.string().uuid(),
  status: ModerationStatus.default('pending'),
  riskScore: z.number().min(0).max(1).default(0),
  decision: ModerationDecision.optional(),
  reasonCode: z.string().max(48).optional(),
  confidence: z.number().min(0).max(1).default(0),
  vendorScores: z.record(z.number()).default({}),
  evidenceCid: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Moderation action schema
export const ModerationActionSchema = z.object({
  id: z.number().optional(),
  userId: z.string().uuid(),
  contentId: z.string().max(64),
  action: ModerationAction,
  durationSec: z.number().min(0).default(0),
  appliedBy: z.string().max(64).optional(),
  rationale: z.string().optional(),
  createdAt: z.date().optional(),
});

// Content report schema
export const ContentReportSchema = z.object({
  id: z.number().optional(),
  contentId: z.string().max(64),
  reporterId: z.string().uuid(),
  reason: ReportReason,
  details: z.string().optional(),
  weight: z.number().min(0).max(10).default(1),
  status: ReportStatus.default('open'),
  createdAt: z.date().optional(),
});

// Moderation appeal schema
export const ModerationAppealSchema = z.object({
  id: z.number().optional(),
  caseId: z.number(),
  appellantId: z.string().uuid(),
  status: AppealStatus.default('open'),
  stakeAmount: z.string().default('0'), // Using string for precise decimal handling
  juryDecision: JuryDecision.optional(),
  decisionCid: z.string().optional(),
  createdAt: z.date().optional(),
});

// Appeal juror schema
export const AppealJurorSchema = z.object({
  id: z.number().optional(),
  appealId: z.number(),
  jurorId: z.string().uuid(),
  selectionWeight: z.number().min(0),
  voteCommitment: z.string().max(64).optional(),
  voteReveal: JuryVote.optional(),
  voteReasoning: z.string().optional(),
  rewardAmount: z.string().default('0'),
  slashedAmount: z.string().default('0'),
  createdAt: z.date().optional(),
  votedAt: z.date().optional(),
});

// Moderation policy schema
export const ModerationPolicySchema = z.object({
  id: z.number().optional(),
  category: z.string().max(48),
  severity: PolicySeverity,
  confidenceThreshold: z.number().min(0).max(1),
  action: ModerationDecision,
  reputationModifier: z.number().default(0),
  description: z.string(),
  isActive: z.boolean().default(true),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Moderation vendor schema
export const ModerationVendorSchema = z.object({
  id: z.number().optional(),
  vendorName: z.string().max(32),
  vendorType: VendorType,
  apiEndpoint: z.string().max(255).optional(),
  isEnabled: z.boolean().default(true),
  weight: z.number().min(0).max(1).default(1),
  costPerRequest: z.number().min(0).default(0),
  avgLatencyMs: z.number().min(0).default(0),
  successRate: z.number().min(0).max(1).default(1),
  lastHealthCheck: z.date().optional(),
  configuration: z.record(z.any()).default({}),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Audit log schema
export const ModerationAuditLogSchema = z.object({
  id: z.number().optional(),
  caseId: z.number().optional(),
  actionType: z.string().max(32),
  actorId: z.string().max(64).optional(),
  actorType: ActorType.default('user'),
  oldState: z.record(z.any()).optional(),
  newState: z.record(z.any()).optional(),
  reasoning: z.string().optional(),
  ipAddress: z.string().max(45).optional(),
  userAgent: z.string().optional(),
  createdAt: z.date().optional(),
});

// Metrics schema
export const ModerationMetricsSchema = z.object({
  id: z.number().optional(),
  metricType: z.string().max(32),
  metricName: z.string().max(64),
  metricValue: z.number(),
  dimensions: z.record(z.any()).default({}),
  recordedAt: z.date().optional(),
});

// Content hash schema
export const ContentHashSchema = z.object({
  id: z.number().optional(),
  contentId: z.string().max(64),
  contentType: z.string().max(24),
  hashType: HashType,
  hashValue: z.string().max(128),
  createdAt: z.date().optional(),
});

// Reputation impact schema
export const ReputationImpactSchema = z.object({
  id: z.number().optional(),
  userId: z.string().uuid(),
  caseId: z.number().optional(),
  impactType: ReputationImpactType,
  impactValue: z.number(),
  previousReputation: z.number().optional(),
  newReputation: z.number().optional(),
  description: z.string().optional(),
  createdAt: z.date().optional(),
});

// AI Model result interface
export interface AIModelResult {
  vendor: string;
  confidence: number;
  categories: string[];
  reasoning?: string;
  cost: number;
  latency: number;
  rawResponse?: any;
}

// Ensemble decision interface
export interface EnsembleDecision {
  overallConfidence: number;
  primaryCategory: string;
  action: 'allow' | 'limit' | 'block' | 'review';
  vendorResults: AIModelResult[];
  evidenceHash?: string;
  reasoning: string;
}

// Content input for moderation
export interface ContentInput {
  id: string;
  type: z.infer<typeof ContentType>;
  text?: string;
  media?: {
    url: string;
    type: 'image' | 'video';
    hash?: string;
  }[];
  links?: string[];
  userId: string;
  userReputation: number;
  walletAddress: string;
  metadata: Record<string, any>;
}

// Policy rule interface
export interface PolicyRule {
  category: string;
  severity: z.infer<typeof PolicySeverity>;
  confidenceThreshold: number;
  action: z.infer<typeof ModerationDecision>;
  reputationModifier: number;
  description: string;
}

// Evidence bundle interface
export interface EvidenceBundle {
  caseId: number;
  contentHash: string;
  screenshots?: string[];
  modelOutputs: Record<string, any>;
  decisionRationale: string;
  policyVersion: string;
  timestamp: Date;
  moderatorId?: string;
}

// Moderation error interface
export interface ModerationError {
  code: string;
  message: string;
  retryable: boolean;
  fallbackAction: 'allow' | 'block' | 'queue';
  vendor?: string;
}

// Type exports
export type ModerationCase = z.infer<typeof ModerationCaseSchema>;
export type ModerationActionType = z.infer<typeof ModerationActionSchema>;
export type ContentReport = z.infer<typeof ContentReportSchema>;
export type ModerationAppeal = z.infer<typeof ModerationAppealSchema>;
export type AppealJuror = z.infer<typeof AppealJurorSchema>;
export type ModerationPolicy = z.infer<typeof ModerationPolicySchema>;
export type ModerationVendor = z.infer<typeof ModerationVendorSchema>;
export type ModerationAuditLog = z.infer<typeof ModerationAuditLogSchema>;
export type ModerationMetrics = z.infer<typeof ModerationMetricsSchema>;
export type ContentHash = z.infer<typeof ContentHashSchema>;
export type ReputationImpact = z.infer<typeof ReputationImpactSchema>;

// Validation functions
export const validateModerationCase = (data: unknown) => ModerationCaseSchema.parse(data);
export const validateModerationAction = (data: unknown) => ModerationActionSchema.parse(data);
export const validateContentReport = (data: unknown) => ContentReportSchema.parse(data);
export const validateModerationAppeal = (data: unknown) => ModerationAppealSchema.parse(data);
export const validateAppealJuror = (data: unknown) => AppealJurorSchema.parse(data);
export const validateModerationPolicy = (data: unknown) => ModerationPolicySchema.parse(data);
export const validateModerationVendor = (data: unknown) => ModerationVendorSchema.parse(data);
export const validateModerationAuditLog = (data: unknown) => ModerationAuditLogSchema.parse(data);
export const validateModerationMetrics = (data: unknown) => ModerationMetricsSchema.parse(data);
export const validateContentHash = (data: unknown) => ContentHashSchema.parse(data);
export const validateReputationImpact = (data: unknown) => ReputationImpactSchema.parse(data);
