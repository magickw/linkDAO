/**
 * User Journey Mapping Service
 * Creates detailed user journey maps through documentation system
 */

export interface UserJourneyStep {
  id: string;
  sessionId: string;
  userId?: string;
  timestamp: Date;
  action: 'entry' | 'search' | 'view' | 'download' | 'share' | 'feedback' | 'support_contact' | 'exit';
  documentPath?: string;
  searchQuery?: string;
  duration?: number; // milliseconds
  exitPoint?: number; // percentage of document read
  referrer?: string;
  userAgent?: string;
  metadata: {
    category?: string;
    difficulty?: string;
    satisfaction?: number;
    helpfulness?: number;
  };
}

export interface UserJourney {
  sessionId: string;
  userId?: string;
  startTime: Date;
  endTime?: Date;
  totalDuration: number;
  steps: UserJourneyStep[];
  outcome: 'successful' | 'abandoned' | 'escalated' | 'ongoing';
  entryPoint: string;
  exitPoint?: string;
  documentsViewed: string[];
  searchQueries: string[];
  supportContacted: boolean;
  satisfactionScore?: number;
  conversionEvents: string[]; // e.g., 'downloaded_guide', 'completed_tutorial'
}

export interface JourneyPattern {
  id: string;
  name: string;
  description: string;
  frequency: number;
  averageDuration: number;
  successRate: number;
  commonSteps: string[];
  dropOffPoints: Array<{
    step: string;
    dropOffRate: number;
  }>;
  improvements: string[];
}

export interface JourneyAnalytics {
  summary: {
    totalJourneys: number;
    averageDuration: number;
    successRate: number;
    abandonmentRate: number;
    escalationRate: number;
    averageSatisfaction: number;
  };
  entryPoints: Array<{
    source: string;
    count: number;
    successRate: number;
  }>;
  commonPaths: Array<{
    path: string[];
    frequency: number;
    successRate: number;
  }>;
  dropOffAnalysis: Array<{
    step: string;
    dropOffRate: number;
    commonReasons: string[];
  }>;
  conversionFunnels: Array<{
    goal: string;
    steps: Array<{
      name: string;
      users: number;
      conversionRate: number;
    }>;
  }>;
  patterns: JourneyPattern[];
  recommendations: string[];
}

export class UserJourneyMappingService {
  private journeys: Map<string, UserJourney> = new Map();
  private journeySteps: UserJourneyStep[] = [];
  private patterns: Map<string, JourneyPattern> = new Map();

  /**
   * Record a journey step
   */
  recordJourneyStep(step: Omit<UserJourneyStep, 'id' | 'timestamp'>): void {
    const fullStep: UserJourneyStep = {
      ...step,
      id: this.generateStepId(),
      timestamp: new Date()
    };

    this.journeySteps.push(fullStep);

    // Keep only last 50,000 steps
    if (this.journeySteps.length > 50000) {
      this.journeySteps.splice(0, this.journeySteps.length - 50000);
    }

    // Update or create journey
    this.updateJourney(fullStep);
  }

  /**
   * Update journey with new step
   */
  private updateJourney(step: UserJourneyStep): void {
    let journey = this.journeys.get(step.sessionId);

    if (!journey) {
      // Create new journey
      journey = {
        sessionId: step.sessionId,
        userId: step.userId,
        startTime: step.timestamp,
        totalDuration: 0,
        steps: [],
        outcome: 'ongoing',
        entryPoint: step.referrer || 'direct',
        documentsViewed: [],
        searchQueries: [],
        supportContacted: false,
        conversionEvents: []
      };
      this.journeys.set(step.sessionId, journey);
    }

    // Add step to journey
    journey.steps.push(step);
    journey.endTime = step.timestamp;
    journey.totalDuration = journey.endTime.getTime() - journey.startTime.getTime();

    // Update journey data based on step
    this.updateJourneyData(journey, step);

    // Determine outcome
    this.updateJourneyOutcome(journey, step);
  }

  /**
   * Update journey data based on step
   */
  private updateJourneyData(journey: UserJourney, step: UserJourneyStep): void {
    switch (step.action) {
      case 'view':
        if (step.documentPath && !journey.documentsViewed.includes(step.documentPath)) {
          journey.documentsViewed.push(step.documentPath);
        }
        break;
      
      case 'search':
        if (step.searchQuery && !journey.searchQueries.includes(step.searchQuery)) {
          journey.searchQueries.push(step.searchQuery);
        }
        break;
      
      case 'support_contact':
        journey.supportContacted = true;
        break;
      
      case 'download':
        journey.conversionEvents.push('document_download');
        break;
      
      case 'share':
        journey.conversionEvents.push('content_share');
        break;
      
      case 'feedback':
        if (step.metadata.satisfaction) {
          journey.satisfactionScore = step.metadata.satisfaction;
        }
        break;
    }
  }

  /**
   * Update journey outcome
   */
  private updateJourneyOutcome(journey: UserJourney, step: UserJourneyStep): void {
    if (step.action === 'exit') {
      if (journey.supportContacted) {
        journey.outcome = 'escalated';
      } else if (journey.conversionEvents.length > 0 || journey.satisfactionScore && journey.satisfactionScore >= 4) {
        journey.outcome = 'successful';
      } else {
        journey.outcome = 'abandoned';
      }
      journey.exitPoint = step.documentPath || 'unknown';
    }
  }

  /**
   * Get journey by session ID
   */
  getJourney(sessionId: string): UserJourney | undefined {
    return this.journeys.get(sessionId);
  }

  /**
   * Get journeys by user ID
   */
  getJourneysByUser(userId: string): UserJourney[] {
    return Array.from(this.journeys.values())
      .filter(journey => journey.userId === userId)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  /**
   * Analyze user journeys and generate analytics
   */
  generateJourneyAnalytics(days: number = 30): JourneyAnalytics {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const recentJourneys = Array.from(this.journeys.values())
      .filter(journey => journey.startTime > cutoff);

    const summary = this.calculateSummaryMetrics(recentJourneys);
    const entryPoints = this.analyzeEntryPoints(recentJourneys);
    const commonPaths = this.identifyCommonPaths(recentJourneys);
    const dropOffAnalysis = this.analyzeDropOffPoints(recentJourneys);
    const conversionFunnels = this.analyzeConversionFunnels(recentJourneys);
    const patterns = this.identifyJourneyPatterns(recentJourneys);
    const recommendations = this.generateRecommendations(summary, dropOffAnalysis, patterns);

    return {
      summary,
      entryPoints,
      commonPaths,
      dropOffAnalysis,
      conversionFunnels,
      patterns,
      recommendations
    };
  }

  /**
   * Calculate summary metrics
   */
  private calculateSummaryMetrics(journeys: UserJourney[]): JourneyAnalytics['summary'] {
    const totalJourneys = journeys.length;
    const completedJourneys = journeys.filter(j => j.outcome !== 'ongoing');
    
    const averageDuration = completedJourneys.length > 0
      ? completedJourneys.reduce((sum, j) => sum + j.totalDuration, 0) / completedJourneys.length
      : 0;

    const successfulJourneys = journeys.filter(j => j.outcome === 'successful').length;
    const abandonedJourneys = journeys.filter(j => j.outcome === 'abandoned').length;
    const escalatedJourneys = journeys.filter(j => j.outcome === 'escalated').length;

    const successRate = totalJourneys > 0 ? successfulJourneys / totalJourneys : 0;
    const abandonmentRate = totalJourneys > 0 ? abandonedJourneys / totalJourneys : 0;
    const escalationRate = totalJourneys > 0 ? escalatedJourneys / totalJourneys : 0;

    const journeysWithSatisfaction = journeys.filter(j => j.satisfactionScore !== undefined);
    const averageSatisfaction = journeysWithSatisfaction.length > 0
      ? journeysWithSatisfaction.reduce((sum, j) => sum + (j.satisfactionScore || 0), 0) / journeysWithSatisfaction.length
      : 0;

    return {
      totalJourneys,
      averageDuration: Math.round(averageDuration),
      successRate: Math.round(successRate * 100) / 100,
      abandonmentRate: Math.round(abandonmentRate * 100) / 100,
      escalationRate: Math.round(escalationRate * 100) / 100,
      averageSatisfaction: Math.round(averageSatisfaction * 100) / 100
    };
  }

  /**
   * Analyze entry points
   */
  private analyzeEntryPoints(journeys: UserJourney[]): Array<{
    source: string;
    count: number;
    successRate: number;
  }> {
    const entryPointMap = new Map<string, { count: number; successful: number }>();

    for (const journey of journeys) {
      const source = journey.entryPoint;
      const current = entryPointMap.get(source) || { count: 0, successful: 0 };
      current.count++;
      if (journey.outcome === 'successful') {
        current.successful++;
      }
      entryPointMap.set(source, current);
    }

    return Array.from(entryPointMap.entries())
      .map(([source, data]) => ({
        source,
        count: data.count,
        successRate: data.count > 0 ? Math.round((data.successful / data.count) * 100) / 100 : 0
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Identify common paths
   */
  private identifyCommonPaths(journeys: UserJourney[]): Array<{
    path: string[];
    frequency: number;
    successRate: number;
  }> {
    const pathMap = new Map<string, { count: number; successful: number }>();

    for (const journey of journeys) {
      if (journey.documentsViewed.length < 2) continue;

      const path = journey.documentsViewed.slice(0, 5); // Limit to first 5 documents
      const pathKey = path.join(' -> ');
      
      const current = pathMap.get(pathKey) || { count: 0, successful: 0 };
      current.count++;
      if (journey.outcome === 'successful') {
        current.successful++;
      }
      pathMap.set(pathKey, current);
    }

    return Array.from(pathMap.entries())
      .filter(([, data]) => data.count >= 3) // Only paths with 3+ occurrences
      .map(([pathKey, data]) => ({
        path: pathKey.split(' -> '),
        frequency: data.count,
        successRate: Math.round((data.successful / data.count) * 100) / 100
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);
  }

  /**
   * Analyze drop-off points
   */
  private analyzeDropOffPoints(journeys: UserJourney[]): Array<{
    step: string;
    dropOffRate: number;
    commonReasons: string[];
  }> {
    const stepCounts = new Map<string, { total: number; dropOffs: number }>();

    for (const journey of journeys) {
      for (let i = 0; i < journey.steps.length; i++) {
        const step = journey.steps[i];
        const stepKey = `${step.action}:${step.documentPath || 'unknown'}`;
        
        const current = stepCounts.get(stepKey) || { total: 0, dropOffs: 0 };
        current.total++;
        
        // Check if this is a drop-off point (last step in abandoned journey)
        if (i === journey.steps.length - 1 && journey.outcome === 'abandoned') {
          current.dropOffs++;
        }
        
        stepCounts.set(stepKey, current);
      }
    }

    return Array.from(stepCounts.entries())
      .filter(([, data]) => data.total >= 10) // Only steps with 10+ occurrences
      .map(([step, data]) => ({
        step,
        dropOffRate: Math.round((data.dropOffs / data.total) * 100) / 100,
        commonReasons: this.identifyDropOffReasons(step)
      }))
      .filter(item => item.dropOffRate > 0.1) // Only significant drop-off rates
      .sort((a, b) => b.dropOffRate - a.dropOffRate)
      .slice(0, 10);
  }

  /**
   * Analyze conversion funnels
   */
  private analyzeConversionFunnels(journeys: UserJourney[]): Array<{
    goal: string;
    steps: Array<{
      name: string;
      users: number;
      conversionRate: number;
    }>;
  }> {
    // Define conversion goals and their steps
    const funnels = [
      {
        goal: 'Document Download',
        steps: ['entry', 'search', 'view', 'download']
      },
      {
        goal: 'Support Contact',
        steps: ['entry', 'search', 'view', 'support_contact']
      },
      {
        goal: 'Content Sharing',
        steps: ['entry', 'view', 'share']
      }
    ];

    return funnels.map(funnel => {
      const funnelSteps = funnel.steps.map((stepName, index) => {
        const usersAtStep = journeys.filter(journey => {
          const hasStep = journey.steps.some(step => step.action === stepName);
          return hasStep;
        }).length;

        const conversionRate = index === 0 ? 1 : 
          (journeys.length > 0 ? usersAtStep / journeys.length : 0);

        return {
          name: stepName,
          users: usersAtStep,
          conversionRate: Math.round(conversionRate * 100) / 100
        };
      });

      return {
        goal: funnel.goal,
        steps: funnelSteps
      };
    });
  }

  /**
   * Identify journey patterns
   */
  private identifyJourneyPatterns(journeys: UserJourney[]): JourneyPattern[] {
    const patterns: JourneyPattern[] = [];

    // Pattern 1: Quick Success (short journey, successful outcome)
    const quickSuccessJourneys = journeys.filter(j => 
      j.outcome === 'successful' && 
      j.totalDuration < 300000 && // Less than 5 minutes
      j.steps.length <= 5
    );

    if (quickSuccessJourneys.length >= 5) {
      patterns.push({
        id: 'quick-success',
        name: 'Quick Success',
        description: 'Users who find what they need quickly',
        frequency: quickSuccessJourneys.length,
        averageDuration: quickSuccessJourneys.reduce((sum, j) => sum + j.totalDuration, 0) / quickSuccessJourneys.length,
        successRate: 1.0,
        commonSteps: ['entry', 'search', 'view', 'download'],
        dropOffPoints: [],
        improvements: ['Promote successful content', 'Optimize search for quick discovery']
      });
    }

    // Pattern 2: Research Deep Dive (long journey, multiple documents)
    const researchJourneys = journeys.filter(j => 
      j.documentsViewed.length >= 5 && 
      j.totalDuration > 900000 // More than 15 minutes
    );

    if (researchJourneys.length >= 3) {
      patterns.push({
        id: 'research-deep-dive',
        name: 'Research Deep Dive',
        description: 'Users conducting thorough research',
        frequency: researchJourneys.length,
        averageDuration: researchJourneys.reduce((sum, j) => sum + j.totalDuration, 0) / researchJourneys.length,
        successRate: researchJourneys.filter(j => j.outcome === 'successful').length / researchJourneys.length,
        commonSteps: ['entry', 'search', 'view', 'view', 'view', 'feedback'],
        dropOffPoints: [],
        improvements: ['Create comprehensive guides', 'Add related document suggestions']
      });
    }

    // Pattern 3: Help Seeking (escalated to support)
    const helpSeekingJourneys = journeys.filter(j => j.outcome === 'escalated');

    if (helpSeekingJourneys.length >= 3) {
      patterns.push({
        id: 'help-seeking',
        name: 'Help Seeking',
        description: 'Users who need additional support',
        frequency: helpSeekingJourneys.length,
        averageDuration: helpSeekingJourneys.reduce((sum, j) => sum + j.totalDuration, 0) / helpSeekingJourneys.length,
        successRate: 0, // Escalation indicates self-service failure
        commonSteps: ['entry', 'search', 'view', 'search', 'support_contact'],
        dropOffPoints: [{ step: 'view', dropOffRate: 0.8 }],
        improvements: ['Improve content clarity', 'Add more troubleshooting guides', 'Better search results']
      });
    }

    return patterns;
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(
    summary: JourneyAnalytics['summary'],
    dropOffAnalysis: JourneyAnalytics['dropOffAnalysis'],
    patterns: JourneyPattern[]
  ): string[] {
    const recommendations: string[] = [];

    if (summary.abandonmentRate > 0.3) {
      recommendations.push('High abandonment rate - review content accessibility and clarity');
    }

    if (summary.escalationRate > 0.2) {
      recommendations.push('High escalation rate - improve self-service content');
    }

    if (summary.averageSatisfaction < 3.5) {
      recommendations.push('Low satisfaction scores - review content quality and usefulness');
    }

    if (dropOffAnalysis.length > 0) {
      const topDropOff = dropOffAnalysis[0];
      recommendations.push(`Address high drop-off at: ${topDropOff.step}`);
    }

    const helpSeekingPattern = patterns.find(p => p.id === 'help-seeking');
    if (helpSeekingPattern && helpSeekingPattern.frequency > summary.totalJourneys * 0.15) {
      recommendations.push('Many users escalating to support - create better self-service content');
    }

    if (recommendations.length === 0) {
      recommendations.push('User journeys are performing well - continue monitoring');
    }

    return recommendations;
  }

  // Helper methods
  private generateStepId(): string {
    return `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private identifyDropOffReasons(step: string): string[] {
    // Simple heuristics for drop-off reasons
    if (step.includes('search')) {
      return ['No relevant results found', 'Search functionality unclear'];
    }
    if (step.includes('view')) {
      return ['Content too complex', 'Information not helpful', 'Page loading issues'];
    }
    return ['User found what they needed', 'External interruption'];
  }

  /**
   * Clean up old journey data
   */
  cleanup(daysToKeep: number = 90): void {
    const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

    // Clean up journeys
    for (const [sessionId, journey] of this.journeys.entries()) {
      if (journey.startTime < cutoff) {
        this.journeys.delete(sessionId);
      }
    }

    // Clean up journey steps
    this.journeySteps = this.journeySteps.filter(step => step.timestamp > cutoff);
  }
}

export const userJourneyMappingService = new UserJourneyMappingService();
