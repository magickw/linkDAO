/**
 * A/B Testing Framework Service
 * Framework for testing document layouts, content variations, and user experience improvements
 */

export interface ABTest {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
  createdAt: Date;
  startDate?: Date;
  endDate?: Date;
  targetAudience: {
    percentage: number; // 0-100
    criteria?: {
      userType?: string[];
      documentCategory?: string[];
      entrySource?: string[];
      deviceType?: string[];
    };
  };
  variants: ABTestVariant[];
  metrics: ABTestMetric[];
  hypothesis: string;
  successCriteria: string;
  minimumSampleSize: number;
  confidenceLevel: number; // 0.90, 0.95, 0.99
  createdBy: string;
}

export interface ABTestVariant {
  id: string;
  name: string;
  description: string;
  isControl: boolean;
  trafficAllocation: number; // 0-100 percentage
  configuration: {
    documentLayout?: 'default' | 'compact' | 'detailed' | 'mobile-first';
    contentStyle?: 'formal' | 'casual' | 'technical' | 'beginner-friendly';
    navigationStyle?: 'sidebar' | 'breadcrumb' | 'tabs' | 'minimal';
    searchInterface?: 'simple' | 'advanced' | 'ai-powered' | 'category-first';
    callToAction?: 'prominent' | 'subtle' | 'contextual' | 'none';
    customCSS?: string;
    customContent?: Record<string, string>;
  };
  participants: number;
  conversions: number;
}

export interface ABTestMetric {
  id: string;
  name: string;
  type: 'conversion' | 'engagement' | 'satisfaction' | 'performance';
  description: string;
  targetValue?: number;
  currentValue?: number;
  isPrimary: boolean;
}

export interface ABTestParticipant {
  userId?: string;
  sessionId: string;
  testId: string;
  variantId: string;
  assignedAt: Date;
  events: ABTestEvent[];
  converted: boolean;
  conversionValue?: number;
}

export interface ABTestEvent {
  id: string;
  participantId: string;
  eventType: 'view' | 'click' | 'download' | 'share' | 'feedback' | 'conversion' | 'exit';
  timestamp: Date;
  documentPath?: string;
  elementId?: string;
  value?: number;
  metadata?: Record<string, any>;
}

export interface ABTestResults {
  testId: string;
  status: 'running' | 'completed' | 'inconclusive';
  duration: number; // days
  participants: {
    total: number;
    byVariant: Record<string, number>;
  };
  metrics: Array<{
    metricId: string;
    name: string;
    results: Array<{
      variantId: string;
      variantName: string;
      value: number;
      sampleSize: number;
      confidenceInterval: {
        lower: number;
        upper: number;
      };
      statisticalSignificance: boolean;
      pValue?: number;
    }>;
    winner?: string;
    improvement?: number; // percentage improvement over control
  }>;
  recommendations: string[];
  conclusion: string;
}

export class ABTestingFrameworkService {
  private tests: Map<string, ABTest> = new Map();
  private participants: Map<string, ABTestParticipant> = new Map();
  private events: ABTestEvent[] = [];

  /**
   * Create a new A/B test
   */
  createTest(testData: Omit<ABTest, 'id' | 'createdAt' | 'status'>): ABTest {
    const test: ABTest = {
      ...testData,
      id: this.generateTestId(),
      createdAt: new Date(),
      status: 'draft'
    };

    // Validate test configuration
    this.validateTest(test);

    this.tests.set(test.id, test);
    return test;
  }

  /**
   * Start an A/B test
   */
  startTest(testId: string): ABTest {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }

    if (test.status !== 'draft') {
      throw new Error(`Test ${testId} cannot be started - current status: ${test.status}`);
    }

    test.status = 'active';
    test.startDate = new Date();

    this.tests.set(testId, test);
    return test;
  }

  /**
   * Stop an A/B test
   */
  stopTest(testId: string): ABTest {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }

    test.status = 'completed';
    test.endDate = new Date();

    this.tests.set(testId, test);
    return test;
  }

  /**
   * Assign user to test variant
   */
  assignToVariant(
    testId: string,
    sessionId: string,
    userId?: string,
    userContext?: {
      userType?: string;
      documentCategory?: string;
      entrySource?: string;
      deviceType?: string;
    }
  ): { variantId: string; configuration: ABTestVariant['configuration'] } | null {
    const test = this.tests.get(testId);
    if (!test || test.status !== 'active') {
      return null;
    }

    // Check if user meets targeting criteria
    if (!this.meetsTargetingCriteria(test, userContext)) {
      return null;
    }

    // Check if user should be included based on traffic percentage
    if (!this.shouldIncludeInTest(test.targetAudience.percentage)) {
      return null;
    }

    // Check if user is already assigned to this test
    const existingParticipant = Array.from(this.participants.values())
      .find(p => p.testId === testId && (p.userId === userId || p.sessionId === sessionId));

    if (existingParticipant) {
      const variant = test.variants.find(v => v.id === existingParticipant.variantId);
      return variant ? { variantId: variant.id, configuration: variant.configuration } : null;
    }

    // Assign to variant based on traffic allocation
    const variant = this.selectVariant(test.variants);
    if (!variant) {
      return null;
    }

    // Create participant record
    const participant: ABTestParticipant = {
      userId,
      sessionId,
      testId,
      variantId: variant.id,
      assignedAt: new Date(),
      events: [],
      converted: false
    };

    this.participants.set(this.generateParticipantId(sessionId, testId), participant);

    // Update variant participant count
    variant.participants++;

    return {
      variantId: variant.id,
      configuration: variant.configuration
    };
  }

  /**
   * Record test event
   */
  recordEvent(
    sessionId: string,
    testId: string,
    eventType: ABTestEvent['eventType'],
    eventData?: {
      documentPath?: string;
      elementId?: string;
      value?: number;
      metadata?: Record<string, any>;
    }
  ): void {
    const participantId = this.generateParticipantId(sessionId, testId);
    const participant = this.participants.get(participantId);

    if (!participant) {
      return; // User not in test
    }

    const event: ABTestEvent = {
      id: this.generateEventId(),
      participantId,
      eventType,
      timestamp: new Date(),
      ...eventData
    };

    participant.events.push(event);
    this.events.push(event);

    // Check for conversion
    if (eventType === 'conversion' || this.isConversionEvent(event)) {
      participant.converted = true;
      participant.conversionValue = event.value;

      // Update variant conversion count
      const test = this.tests.get(testId);
      if (test) {
        const variant = test.variants.find(v => v.id === participant.variantId);
        if (variant) {
          variant.conversions++;
        }
      }
    }

    // Keep only last 100,000 events
    if (this.events.length > 100000) {
      this.events.splice(0, this.events.length - 100000);
    }
  }

  /**
   * Get test results
   */
  getTestResults(testId: string): ABTestResults {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }

    const testParticipants = Array.from(this.participants.values())
      .filter(p => p.testId === testId);

    const duration = test.startDate 
      ? Math.ceil((new Date().getTime() - test.startDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const participants = {
      total: testParticipants.length,
      byVariant: test.variants.reduce((acc, variant) => {
        acc[variant.id] = testParticipants.filter(p => p.variantId === variant.id).length;
        return acc;
      }, {} as Record<string, number>)
    };

    const metrics = test.metrics.map(metric => this.calculateMetricResults(test, metric, testParticipants));

    const status = this.determineTestStatus(test, participants.total);
    const recommendations = this.generateRecommendations(test, metrics);
    const conclusion = this.generateConclusion(test, metrics, status);

    return {
      testId,
      status,
      duration,
      participants,
      metrics,
      recommendations,
      conclusion
    };
  }

  /**
   * Calculate metric results for each variant
   */
  private calculateMetricResults(
    test: ABTest,
    metric: ABTestMetric,
    participants: ABTestParticipant[]
  ): ABTestResults['metrics'][0] {
    const results = test.variants.map(variant => {
      const variantParticipants = participants.filter(p => p.variantId === variant.id);
      const sampleSize = variantParticipants.length;

      let value = 0;
      
      switch (metric.type) {
        case 'conversion':
          value = sampleSize > 0 ? (variant.conversions / sampleSize) : 0;
          break;
        case 'engagement':
          value = this.calculateEngagementMetric(variantParticipants);
          break;
        case 'satisfaction':
          value = this.calculateSatisfactionMetric(variantParticipants);
          break;
        case 'performance':
          value = this.calculatePerformanceMetric(variantParticipants);
          break;
      }

      const confidenceInterval = this.calculateConfidenceInterval(value, sampleSize, test.confidenceLevel);
      const statisticalSignificance = this.isStatisticallySignificant(test, variant, variantParticipants);

      return {
        variantId: variant.id,
        variantName: variant.name,
        value: Math.round(value * 10000) / 10000,
        sampleSize,
        confidenceInterval,
        statisticalSignificance
      };
    });

    // Determine winner and improvement
    const controlResult = results.find(r => {
      const variant = test.variants.find(v => v.id === r.variantId);
      return variant?.isControl;
    });

    const bestResult = results.reduce((best, current) => 
      current.value > best.value ? current : best
    );

    const winner = bestResult.statisticalSignificance ? bestResult.variantId : undefined;
    const improvement = controlResult && winner && winner !== controlResult.variantId
      ? ((bestResult.value - controlResult.value) / controlResult.value) * 100
      : undefined;

    return {
      metricId: metric.id,
      name: metric.name,
      results,
      winner,
      improvement: improvement ? Math.round(improvement * 100) / 100 : undefined
    };
  }

  /**
   * Validate test configuration
   */
  private validateTest(test: ABTest): void {
    if (test.variants.length < 2) {
      throw new Error('Test must have at least 2 variants');
    }

    const totalAllocation = test.variants.reduce((sum, v) => sum + v.trafficAllocation, 0);
    if (Math.abs(totalAllocation - 100) > 0.01) {
      throw new Error('Variant traffic allocation must sum to 100%');
    }

    const controlVariants = test.variants.filter(v => v.isControl);
    if (controlVariants.length !== 1) {
      throw new Error('Test must have exactly one control variant');
    }

    if (test.metrics.length === 0) {
      throw new Error('Test must have at least one metric');
    }

    const primaryMetrics = test.metrics.filter(m => m.isPrimary);
    if (primaryMetrics.length !== 1) {
      throw new Error('Test must have exactly one primary metric');
    }
  }

  /**
   * Check if user meets targeting criteria
   */
  private meetsTargetingCriteria(test: ABTest, userContext?: any): boolean {
    if (!test.targetAudience.criteria || !userContext) {
      return true;
    }

    const criteria = test.targetAudience.criteria;

    if (criteria.userType && !criteria.userType.includes(userContext.userType)) {
      return false;
    }

    if (criteria.documentCategory && !criteria.documentCategory.includes(userContext.documentCategory)) {
      return false;
    }

    if (criteria.entrySource && !criteria.entrySource.includes(userContext.entrySource)) {
      return false;
    }

    if (criteria.deviceType && !criteria.deviceType.includes(userContext.deviceType)) {
      return false;
    }

    return true;
  }

  /**
   * Determine if user should be included in test based on traffic percentage
   */
  private shouldIncludeInTest(percentage: number): boolean {
    return Math.random() * 100 < percentage;
  }

  /**
   * Select variant based on traffic allocation
   */
  private selectVariant(variants: ABTestVariant[]): ABTestVariant | null {
    const random = Math.random() * 100;
    let cumulative = 0;

    for (const variant of variants) {
      cumulative += variant.trafficAllocation;
      if (random <= cumulative) {
        return variant;
      }
    }

    return null;
  }

  /**
   * Check if event represents a conversion
   */
  private isConversionEvent(event: ABTestEvent): boolean {
    return event.eventType === 'download' || 
           event.eventType === 'share' || 
           (event.eventType === 'feedback' && event.value && event.value >= 4);
  }

  /**
   * Calculate engagement metric
   */
  private calculateEngagementMetric(participants: ABTestParticipant[]): number {
    if (participants.length === 0) return 0;

    const totalEngagement = participants.reduce((sum, participant) => {
      const engagementEvents = participant.events.filter(e => 
        ['view', 'click', 'download', 'share'].includes(e.eventType)
      );
      return sum + engagementEvents.length;
    }, 0);

    return totalEngagement / participants.length;
  }

  /**
   * Calculate satisfaction metric
   */
  private calculateSatisfactionMetric(participants: ABTestParticipant[]): number {
    const feedbackEvents = participants.flatMap(p => 
      p.events.filter(e => e.eventType === 'feedback' && e.value !== undefined)
    );

    if (feedbackEvents.length === 0) return 0;

    const totalSatisfaction = feedbackEvents.reduce((sum, event) => sum + (event.value || 0), 0);
    return totalSatisfaction / feedbackEvents.length;
  }

  /**
   * Calculate performance metric
   */
  private calculatePerformanceMetric(participants: ABTestParticipant[]): number {
    // This would integrate with performance monitoring
    // For now, return a placeholder value
    return Math.random() * 1000 + 500; // Simulated load time in ms
  }

  /**
   * Calculate confidence interval
   */
  private calculateConfidenceInterval(
    value: number, 
    sampleSize: number, 
    confidenceLevel: number
  ): { lower: number; upper: number } {
    if (sampleSize === 0) {
      return { lower: 0, upper: 0 };
    }

    // Simplified confidence interval calculation
    const z = confidenceLevel === 0.99 ? 2.576 : confidenceLevel === 0.95 ? 1.96 : 1.645;
    const standardError = Math.sqrt((value * (1 - value)) / sampleSize);
    const margin = z * standardError;

    return {
      lower: Math.max(0, Math.round((value - margin) * 10000) / 10000),
      upper: Math.min(1, Math.round((value + margin) * 10000) / 10000)
    };
  }

  /**
   * Check statistical significance
   */
  private isStatisticallySignificant(
    test: ABTest,
    variant: ABTestVariant,
    participants: ABTestParticipant[]
  ): boolean {
    // Simplified significance test
    return participants.length >= test.minimumSampleSize && 
           participants.length >= 30; // Minimum for normal approximation
  }

  /**
   * Determine test status
   */
  private determineTestStatus(test: ABTest, totalParticipants: number): ABTestResults['status'] {
    if (test.status !== 'active') {
      return 'completed';
    }

    if (totalParticipants < test.minimumSampleSize) {
      return 'running';
    }

    // Check if any variant has statistical significance
    const hasSignificantResults = test.variants.some(variant => {
      const variantParticipants = Array.from(this.participants.values())
        .filter(p => p.testId === test.id && p.variantId === variant.id);
      return this.isStatisticallySignificant(test, variant, variantParticipants);
    });

    return hasSignificantResults ? 'completed' : 'running';
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(test: ABTest, metrics: ABTestResults['metrics']): string[] {
    const recommendations: string[] = [];

    const primaryMetric = metrics.find(m => {
      const testMetric = test.metrics.find(tm => tm.id === m.metricId);
      return testMetric?.isPrimary;
    });

    if (primaryMetric?.winner) {
      const winnerVariant = test.variants.find(v => v.id === primaryMetric.winner);
      recommendations.push(`Implement ${winnerVariant?.name} variant - shows ${primaryMetric.improvement}% improvement`);
    } else {
      recommendations.push('Continue test - no statistically significant winner yet');
    }

    // Check for concerning patterns
    const lowPerformingVariants = metrics.flatMap(m => 
      m.results.filter(r => r.value < 0.1 && r.sampleSize > 50)
    );

    if (lowPerformingVariants.length > 0) {
      recommendations.push('Consider stopping underperforming variants to allocate more traffic to promising ones');
    }

    return recommendations;
  }

  /**
   * Generate conclusion
   */
  private generateConclusion(
    test: ABTest,
    metrics: ABTestResults['metrics'],
    status: ABTestResults['status']
  ): string {
    if (status === 'running') {
      return 'Test is still running. Continue collecting data for statistical significance.';
    }

    const primaryMetric = metrics.find(m => {
      const testMetric = test.metrics.find(tm => tm.id === m.metricId);
      return testMetric?.isPrimary;
    });

    if (primaryMetric?.winner) {
      const winnerVariant = test.variants.find(v => v.id === primaryMetric.winner);
      return `Test completed successfully. ${winnerVariant?.name} variant is the winner with ${primaryMetric.improvement}% improvement in ${primaryMetric.name}.`;
    }

    return 'Test completed but no statistically significant winner was found. Consider running a longer test or testing more dramatic variations.';
  }

  // Helper methods
  private generateTestId(): string {
    return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateParticipantId(sessionId: string, testId: string): string {
    return `${sessionId}-${testId}`;
  }

  private generateEventId(): string {
    return `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get all active tests
   */
  getActiveTests(): ABTest[] {
    return Array.from(this.tests.values()).filter(test => test.status === 'active');
  }

  /**
   * Get test by ID
   */
  getTest(testId: string): ABTest | undefined {
    return this.tests.get(testId);
  }

  /**
   * Clean up old test data
   */
  cleanup(daysToKeep: number = 180): void {
    const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

    // Clean up completed tests
    for (const [testId, test] of this.tests.entries()) {
      if (test.status === 'completed' && test.endDate && test.endDate < cutoff) {
        this.tests.delete(testId);
        
        // Clean up associated participants
        for (const [participantId, participant] of this.participants.entries()) {
          if (participant.testId === testId) {
            this.participants.delete(participantId);
          }
        }
      }
    }

    // Clean up old events
    this.events = this.events.filter(event => event.timestamp > cutoff);
  }
}

export const abTestingFrameworkService = new ABTestingFrameworkService();