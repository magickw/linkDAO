import { EventEmitter } from 'events';

export interface FeedbackItem {
  id: string;
  type: 'bug-report' | 'feature-request' | 'improvement' | 'security-concern' | 'usability' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'submitted' | 'triaged' | 'in-progress' | 'resolved' | 'closed';
  title: string;
  description: string;
  submittedBy: string;
  submittedAt: Date;
  contractsAffected: string[];
  tags: string[];
  votes: number;
  comments: FeedbackComment[];
  assignedTo?: string;
  priority: number;
  estimatedEffort?: 'small' | 'medium' | 'large' | 'xl';
  resolution?: string;
  resolvedAt?: Date;
}

export interface FeedbackComment {
  id: string;
  author: string;
  content: string;
  timestamp: Date;
  isOfficial: boolean;
}

export interface GovernanceProposal {
  id: string;
  feedbackId: string;
  title: string;
  description: string;
  proposalType: 'parameter-change' | 'feature-addition' | 'bug-fix' | 'security-update';
  proposedBy: string;
  proposedAt: Date;
  votingStarted: boolean;
  votingEnded: boolean;
  passed: boolean;
  implementationStatus: 'pending' | 'in-progress' | 'completed' | 'failed';
}

export interface CommunityMetrics {
  totalFeedback: number;
  feedbackByType: { [key: string]: number };
  feedbackBySeverity: { [key: string]: number };
  feedbackByStatus: { [key: string]: number };
  averageResolutionTime: number;
  communityEngagement: number;
  topContributors: { address: string; contributions: number }[];
  monthlyTrends: { month: string; count: number }[];
}

export class CommunityFeedbackSystem extends EventEmitter {
  private feedback: Map<string, FeedbackItem> = new Map();
  private proposals: Map<string, GovernanceProposal> = new Map();
  private contributors: Map<string, number> = new Map();
  private moderators: Set<string> = new Set();
  private autoTriageRules: TriageRule[] = [];

  constructor() {
    super();
    this.setupAutoTriageRules();
  }

  private setupAutoTriageRules() {
    this.autoTriageRules = [
      {
        condition: (feedback) => feedback.type === 'security-concern',
        action: (feedback) => {
          feedback.severity = 'critical';
          feedback.priority = 1;
          feedback.tags.push('security');
          return 'Auto-escalated security concern';
        }
      },
      {
        condition: (feedback) => feedback.description.toLowerCase().includes('exploit'),
        action: (feedback) => {
          feedback.severity = 'critical';
          feedback.priority = 1;
          feedback.tags.push('exploit', 'urgent');
          return 'Auto-escalated potential exploit';
        }
      },
      {
        condition: (feedback) => feedback.description.toLowerCase().includes('funds') && 
                                 feedback.description.toLowerCase().includes('lost'),
        action: (feedback) => {
          feedback.severity = 'high';
          feedback.priority = 2;
          feedback.tags.push('funds', 'urgent');
          return 'Auto-escalated funds issue';
        }
      },
      {
        condition: (feedback) => feedback.votes > 50,
        action: (feedback) => {
          feedback.priority = Math.max(1, feedback.priority - 1);
          feedback.tags.push('popular');
          return 'Auto-prioritized due to community votes';
        }
      }
    ];
  }

  submitFeedback(
    type: FeedbackItem['type'],
    title: string,
    description: string,
    submittedBy: string,
    contractsAffected: string[] = [],
    severity: FeedbackItem['severity'] = 'medium'
  ): string {
    const feedbackId = `feedback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const feedback: FeedbackItem = {
      id: feedbackId,
      type,
      severity,
      status: 'submitted',
      title,
      description,
      submittedBy,
      submittedAt: new Date(),
      contractsAffected,
      tags: [],
      votes: 0,
      comments: [],
      priority: this.calculateInitialPriority(type, severity)
    };

    // Auto-triage
    const triageResult = this.autoTriage(feedback);
    if (triageResult) {
      feedback.status = 'triaged';
      feedback.comments.push({
        id: `comment-${Date.now()}`,
        author: 'system',
        content: `Auto-triaged: ${triageResult}`,
        timestamp: new Date(),
        isOfficial: true
      });
    }

    this.feedback.set(feedbackId, feedback);
    
    // Update contributor stats
    const currentContributions = this.contributors.get(submittedBy) || 0;
    this.contributors.set(submittedBy, currentContributions + 1);

    this.emit('feedbackSubmitted', feedback);
    console.log(`New feedback submitted: ${title} (${feedbackId})`);

    return feedbackId;
  }

  private calculateInitialPriority(type: FeedbackItem['type'], severity: FeedbackItem['severity']): number {
    let priority = 5; // Default medium priority

    // Adjust by type
    switch (type) {
      case 'security-concern':
        priority = 1;
        break;
      case 'bug-report':
        priority = 2;
        break;
      case 'feature-request':
        priority = 4;
        break;
      case 'improvement':
        priority = 5;
        break;
      case 'usability':
        priority = 6;
        break;
      default:
        priority = 7;
    }

    // Adjust by severity
    switch (severity) {
      case 'critical':
        priority = Math.min(1, priority);
        break;
      case 'high':
        priority = Math.min(2, priority);
        break;
      case 'medium':
        // Keep calculated priority
        break;
      case 'low':
        priority = Math.max(6, priority);
        break;
    }

    return priority;
  }

  private autoTriage(feedback: FeedbackItem): string | null {
    for (const rule of this.autoTriageRules) {
      if (rule.condition(feedback)) {
        return rule.action(feedback);
      }
    }
    return null;
  }

  voteFeedback(feedbackId: string, voterAddress: string, upvote: boolean): boolean {
    const feedback = this.feedback.get(feedbackId);
    if (!feedback) {
      throw new Error(`Feedback ${feedbackId} not found`);
    }

    // In a real implementation, you'd track individual votes to prevent double-voting
    feedback.votes += upvote ? 1 : -1;
    feedback.votes = Math.max(0, feedback.votes);

    // Re-evaluate priority based on votes
    if (feedback.votes > 20 && feedback.priority > 3) {
      feedback.priority = 3;
      feedback.tags.push('community-priority');
    }

    this.emit('feedbackVoted', feedback, voterAddress, upvote);
    return true;
  }

  addComment(feedbackId: string, author: string, content: string): string {
    const feedback = this.feedback.get(feedbackId);
    if (!feedback) {
      throw new Error(`Feedback ${feedbackId} not found`);
    }

    const commentId = `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const comment: FeedbackComment = {
      id: commentId,
      author,
      content,
      timestamp: new Date(),
      isOfficial: this.moderators.has(author)
    };

    feedback.comments.push(comment);
    this.emit('commentAdded', feedback, comment);

    return commentId;
  }

  assignFeedback(feedbackId: string, assignedTo: string, assignedBy: string): boolean {
    if (!this.moderators.has(assignedBy)) {
      throw new Error('Only moderators can assign feedback');
    }

    const feedback = this.feedback.get(feedbackId);
    if (!feedback) {
      throw new Error(`Feedback ${feedbackId} not found`);
    }

    feedback.assignedTo = assignedTo;
    feedback.status = 'in-progress';

    this.addComment(feedbackId, assignedBy, `Assigned to ${assignedTo}`);
    this.emit('feedbackAssigned', feedback, assignedTo);

    return true;
  }

  updateFeedbackStatus(
    feedbackId: string,
    status: FeedbackItem['status'],
    updatedBy: string,
    resolution?: string
  ): boolean {
    if (!this.moderators.has(updatedBy)) {
      throw new Error('Only moderators can update feedback status');
    }

    const feedback = this.feedback.get(feedbackId);
    if (!feedback) {
      throw new Error(`Feedback ${feedbackId} not found`);
    }

    const oldStatus = feedback.status;
    feedback.status = status;

    if (status === 'resolved' && resolution) {
      feedback.resolution = resolution;
      feedback.resolvedAt = new Date();
    }

    this.addComment(feedbackId, updatedBy, `Status changed from ${oldStatus} to ${status}`);
    this.emit('feedbackStatusUpdated', feedback, oldStatus);

    return true;
  }

  createGovernanceProposal(
    feedbackId: string,
    proposalType: GovernanceProposal['proposalType'],
    proposedBy: string,
    proposalTitle?: string,
    proposalDescription?: string
  ): string {
    const feedback = this.feedback.get(feedbackId);
    if (!feedback) {
      throw new Error(`Feedback ${feedbackId} not found`);
    }

    const proposalId = `proposal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const proposal: GovernanceProposal = {
      id: proposalId,
      feedbackId,
      title: proposalTitle || `Governance Proposal: ${feedback.title}`,
      description: proposalDescription || feedback.description,
      proposalType,
      proposedBy,
      proposedAt: new Date(),
      votingStarted: false,
      votingEnded: false,
      passed: false,
      implementationStatus: 'pending'
    };

    this.proposals.set(proposalId, proposal);
    
    // Update feedback
    feedback.tags.push('governance-proposal');
    this.addComment(feedbackId, proposedBy, `Created governance proposal: ${proposalId}`);

    this.emit('proposalCreated', proposal, feedback);
    console.log(`Created governance proposal ${proposalId} from feedback ${feedbackId}`);

    return proposalId;
  }

  getFeedback(
    filters: {
      type?: FeedbackItem['type'];
      severity?: FeedbackItem['severity'];
      status?: FeedbackItem['status'];
      assignedTo?: string;
      contractsAffected?: string[];
      tags?: string[];
    } = {},
    sortBy: 'priority' | 'votes' | 'date' | 'severity' = 'priority',
    limit?: number
  ): FeedbackItem[] {
    let results = Array.from(this.feedback.values());

    // Apply filters
    if (filters.type) {
      results = results.filter(f => f.type === filters.type);
    }
    if (filters.severity) {
      results = results.filter(f => f.severity === filters.severity);
    }
    if (filters.status) {
      results = results.filter(f => f.status === filters.status);
    }
    if (filters.assignedTo) {
      results = results.filter(f => f.assignedTo === filters.assignedTo);
    }
    if (filters.contractsAffected) {
      results = results.filter(f => 
        filters.contractsAffected!.some(contract => f.contractsAffected.includes(contract))
      );
    }
    if (filters.tags) {
      results = results.filter(f => 
        filters.tags!.some(tag => f.tags.includes(tag))
      );
    }

    // Sort results
    switch (sortBy) {
      case 'priority':
        results.sort((a, b) => a.priority - b.priority);
        break;
      case 'votes':
        results.sort((a, b) => b.votes - a.votes);
        break;
      case 'date':
        results.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
        break;
      case 'severity':
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        results.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
        break;
    }

    return limit ? results.slice(0, limit) : results;
  }

  getTopPriorityFeedback(limit: number = 10): FeedbackItem[] {
    return this.getFeedback(
      { status: 'triaged' },
      'priority',
      limit
    );
  }

  getCommunityMetrics(): CommunityMetrics {
    const allFeedback = Array.from(this.feedback.values());
    
    // Count by type
    const feedbackByType: { [key: string]: number } = {};
    const feedbackBySeverity: { [key: string]: number } = {};
    const feedbackByStatus: { [key: string]: number } = {};

    for (const feedback of allFeedback) {
      feedbackByType[feedback.type] = (feedbackByType[feedback.type] || 0) + 1;
      feedbackBySeverity[feedback.severity] = (feedbackBySeverity[feedback.severity] || 0) + 1;
      feedbackByStatus[feedback.status] = (feedbackByStatus[feedback.status] || 0) + 1;
    }

    // Calculate average resolution time
    const resolvedFeedback = allFeedback.filter(f => f.resolvedAt);
    const avgResolutionTime = resolvedFeedback.length > 0
      ? resolvedFeedback.reduce((sum, f) => {
          const resolutionTime = f.resolvedAt!.getTime() - f.submittedAt.getTime();
          return sum + resolutionTime;
        }, 0) / resolvedFeedback.length
      : 0;

    // Top contributors
    const topContributors = Array.from(this.contributors.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([address, contributions]) => ({ address, contributions }));

    // Monthly trends (last 12 months)
    const monthlyTrends = this.calculateMonthlyTrends(allFeedback);

    // Community engagement (average votes per feedback)
    const communityEngagement = allFeedback.length > 0
      ? allFeedback.reduce((sum, f) => sum + f.votes, 0) / allFeedback.length
      : 0;

    return {
      totalFeedback: allFeedback.length,
      feedbackByType,
      feedbackBySeverity,
      feedbackByStatus,
      averageResolutionTime: avgResolutionTime / (1000 * 60 * 60 * 24), // Convert to days
      communityEngagement,
      topContributors,
      monthlyTrends
    };
  }

  private calculateMonthlyTrends(feedback: FeedbackItem[]): { month: string; count: number }[] {
    const trends: { [key: string]: number } = {};
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toISOString().substr(0, 7); // YYYY-MM
      trends[monthKey] = 0;
    }

    for (const item of feedback) {
      const monthKey = item.submittedAt.toISOString().substr(0, 7);
      if (trends.hasOwnProperty(monthKey)) {
        trends[monthKey]++;
      }
    }

    return Object.entries(trends).map(([month, count]) => ({ month, count }));
  }

  addModerator(address: string): void {
    this.moderators.add(address);
    console.log(`Added moderator: ${address}`);
  }

  removeModerator(address: string): void {
    this.moderators.delete(address);
    console.log(`Removed moderator: ${address}`);
  }

  generateFeedbackReport(): string {
    let report = '# Community Feedback Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;

    const metrics = this.getCommunityMetrics();
    const topPriority = this.getTopPriorityFeedback(5);
    const recentFeedback = this.getFeedback({}, 'date', 10);

    // Summary
    report += '## Summary\n\n';
    report += `- **Total Feedback Items**: ${metrics.totalFeedback}\n`;
    report += `- **Average Resolution Time**: ${metrics.averageResolutionTime.toFixed(1)} days\n`;
    report += `- **Community Engagement**: ${metrics.communityEngagement.toFixed(1)} votes per item\n`;
    report += `- **Active Moderators**: ${this.moderators.size}\n\n`;

    // Breakdown by category
    report += '## Feedback Breakdown\n\n';
    
    report += '### By Type\n';
    for (const [type, count] of Object.entries(metrics.feedbackByType)) {
      report += `- **${type}**: ${count}\n`;
    }
    report += '\n';

    report += '### By Severity\n';
    for (const [severity, count] of Object.entries(metrics.feedbackBySeverity)) {
      report += `- **${severity}**: ${count}\n`;
    }
    report += '\n';

    report += '### By Status\n';
    for (const [status, count] of Object.entries(metrics.feedbackByStatus)) {
      report += `- **${status}**: ${count}\n`;
    }
    report += '\n';

    // Top priority items
    if (topPriority.length > 0) {
      report += '## Top Priority Items\n\n';
      for (const item of topPriority) {
        report += `### ${item.title}\n`;
        report += `- **ID**: ${item.id}\n`;
        report += `- **Type**: ${item.type}\n`;
        report += `- **Severity**: ${item.severity}\n`;
        report += `- **Votes**: ${item.votes}\n`;
        report += `- **Submitted**: ${item.submittedAt.toDateString()}\n`;
        report += `- **Description**: ${item.description.substring(0, 200)}...\n\n`;
      }
    }

    // Top contributors
    if (metrics.topContributors.length > 0) {
      report += '## Top Contributors\n\n';
      report += '| Address | Contributions |\n';
      report += '|---------|---------------|\n';
      for (const contributor of metrics.topContributors.slice(0, 5)) {
        report += `| ${contributor.address} | ${contributor.contributions} |\n`;
      }
      report += '\n';
    }

    // Monthly trends
    report += '## Monthly Trends\n\n';
    report += '| Month | Feedback Count |\n';
    report += '|-------|----------------|\n';
    for (const trend of metrics.monthlyTrends.slice(-6)) { // Last 6 months
      report += `| ${trend.month} | ${trend.count} |\n`;
    }
    report += '\n';

    return report;
  }

  exportFeedbackData(): any {
    return {
      feedback: Array.from(this.feedback.values()),
      proposals: Array.from(this.proposals.values()),
      contributors: Array.from(this.contributors.entries()),
      metrics: this.getCommunityMetrics(),
      exportedAt: new Date().toISOString()
    };
  }
}

interface TriageRule {
  condition: (feedback: FeedbackItem) => boolean;
  action: (feedback: FeedbackItem) => string;
}