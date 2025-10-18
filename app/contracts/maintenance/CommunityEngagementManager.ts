import { EventEmitter } from 'events';
import { CommunityFeedbackSystem, FeedbackItem } from './CommunityFeedbackSystem';

interface CommunityEvent {
  id: string;
  type: 'governance-vote' | 'ama' | 'workshop' | 'hackathon' | 'community-call' | 'educational' | 'partnership';
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  organizer: string;
  participants: string[];
  maxParticipants?: number;
  status: 'planned' | 'active' | 'completed' | 'cancelled';
  location: 'online' | 'in-person' | 'hybrid';
  resources: EventResource[];
  outcomes?: EventOutcome[];
}

interface EventResource {
  type: 'link' | 'document' | 'video' | 'presentation';
  title: string;
  url: string;
  description?: string;
}

interface EventOutcome {
  type: 'decision' | 'action-item' | 'feedback' | 'proposal';
  description: string;
  assignedTo?: string;
  dueDate?: Date;
  status: 'pending' | 'in-progress' | 'completed';
}

interface EducationalInitiative {
  id: string;
  title: string;
  description: string;
  type: 'tutorial' | 'guide' | 'video-series' | 'documentation' | 'faq';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  topics: string[];
  content: EducationalContent[];
  author: string;
  createdAt: Date;
  updatedAt: Date;
  views: number;
  ratings: number[];
  status: 'draft' | 'published' | 'archived';
}

interface EducationalContent {
  type: 'text' | 'video' | 'interactive' | 'code-example';
  title: string;
  content: string;
  order: number;
}

interface Partnership {
  id: string;
  name: string;
  type: 'integration' | 'collaboration' | 'sponsorship' | 'technical' | 'marketing';
  description: string;
  status: 'proposed' | 'negotiating' | 'active' | 'completed' | 'cancelled';
  startDate: Date;
  endDate?: Date;
  contactPerson: string;
  benefits: string[];
  deliverables: string[];
  communityImpact: string;
}

interface CommunityMetrics {
  totalMembers: number;
  activeMembers: number;
  governanceParticipation: number;
  eventAttendance: number;
  feedbackEngagement: number;
  educationalEngagement: number;
  partnershipCount: number;
  communityGrowthRate: number;
  retentionRate: number;
  satisfactionScore: number;
}

export class CommunityEngagementManager extends EventEmitter {
  private feedbackSystem: CommunityFeedbackSystem;
  private events: Map<string, CommunityEvent> = new Map();
  private educationalInitiatives: Map<string, EducationalInitiative> = new Map();
  private partnerships: Map<string, Partnership> = new Map();
  private communityMembers: Set<string> = new Set();
  private activeMembers: Map<string, Date> = new Map(); // Last activity date
  private engagementTimer?: NodeJS.Timeout;
  private isRunning: boolean = false;

  constructor() {
    super();
    this.feedbackSystem = new CommunityFeedbackSystem();
    this.setupEventListeners();
  }

  async initialize(): Promise<void> {
    console.log('Initializing Community Engagement Manager...');
    
    this.setupGovernanceParticipation();
    this.setupCommunityEvents();
    this.setupEducationalInitiatives();
    this.setupPartnershipManagement();
    this.setupEngagementTracking();
    
    console.log('Community Engagement Manager initialized successfully');
  }

  private setupEventListeners(): void {
    this.feedbackSystem.on('feedbackSubmitted', (feedback: FeedbackItem) => {
      this.trackMemberActivity(feedback.submittedBy);
      this.emit('communityActivity', {
        type: 'feedback_submitted',
        member: feedback.submittedBy,
        data: feedback
      });
    });

    this.feedbackSystem.on('feedbackVoted', (feedback: FeedbackItem, voter: string) => {
      this.trackMemberActivity(voter);
      this.emit('communityActivity', {
        type: 'feedback_voted',
        member: voter,
        data: feedback
      });
    });
  }

  private setupGovernanceParticipation(): void {
    console.log('Setting up governance participation tracking...');
    
    // Monitor governance events and track participation
    setInterval(async () => {
      await this.trackGovernanceParticipation();
    }, 60 * 60 * 1000); // Check every hour
  }

  private setupCommunityEvents(): void {
    console.log('Setting up community events management...');
    
    // Check for upcoming events and send reminders
    setInterval(async () => {
      await this.checkUpcomingEvents();
    }, 60 * 60 * 1000); // Check every hour

    // Check for completed events and collect feedback
    setInterval(async () => {
      await this.processCompletedEvents();
    }, 24 * 60 * 60 * 1000); // Check daily
  }

  private setupEducationalInitiatives(): void {
    console.log('Setting up educational initiatives...');
    
    this.createDefaultEducationalContent();
    
    // Track educational content engagement
    setInterval(async () => {
      await this.trackEducationalEngagement();
    }, 24 * 60 * 60 * 1000); // Check daily
  }

  private setupPartnershipManagement(): void {
    console.log('Setting up partnership management...');
    
    // Monitor partnership progress
    setInterval(async () => {
      await this.reviewPartnershipProgress();
    }, 7 * 24 * 60 * 60 * 1000); // Check weekly
  }

  private setupEngagementTracking(): void {
    console.log('Setting up engagement tracking...');
    
    this.engagementTimer = setInterval(async () => {
      await this.calculateEngagementMetrics();
      await this.identifyDisengagedMembers();
      await this.planEngagementActivities();
    }, 24 * 60 * 60 * 1000); // Check daily
  }

  // Governance Participation Methods
  private async trackGovernanceParticipation(): Promise<void> {
    console.log('Tracking governance participation...');
    
    // This would integrate with the governance contract to track:
    // - Proposal creation
    // - Voting participation
    // - Delegation activities
    // - Forum discussions
    
    // For now, we'll simulate tracking
    const participationData = {
      totalProposals: 5,
      activeVoters: 150,
      totalEligibleVoters: 500,
      participationRate: 30
    };

    this.emit('governanceMetrics', participationData);
  }

  public createGovernanceEvent(
    title: string,
    description: string,
    startDate: Date,
    endDate: Date,
    organizer: string
  ): string {
    const eventId = this.generateEventId();
    
    const event: CommunityEvent = {
      id: eventId,
      type: 'governance-vote',
      title,
      description,
      startDate,
      endDate,
      organizer,
      participants: [],
      status: 'planned',
      location: 'online',
      resources: []
    };

    this.events.set(eventId, event);
    this.emit('eventCreated', event);
    
    console.log(`Created governance event: ${title} (${eventId})`);
    return eventId;
  }

  // Community Events Methods
  public organizeEvent(
    type: CommunityEvent['type'],
    title: string,
    description: string,
    startDate: Date,
    endDate: Date,
    organizer: string,
    maxParticipants?: number
  ): string {
    const eventId = this.generateEventId();
    
    const event: CommunityEvent = {
      id: eventId,
      type,
      title,
      description,
      startDate,
      endDate,
      organizer,
      participants: [],
      maxParticipants,
      status: 'planned',
      location: 'online',
      resources: []
    };

    this.events.set(eventId, event);
    this.emit('eventCreated', event);
    
    console.log(`Organized ${type} event: ${title} (${eventId})`);
    return eventId;
  }

  public registerForEvent(eventId: string, participant: string): boolean {
    const event = this.events.get(eventId);
    if (!event) {
      throw new Error(`Event ${eventId} not found`);
    }

    if (event.maxParticipants && event.participants.length >= event.maxParticipants) {
      return false; // Event is full
    }

    if (!event.participants.includes(participant)) {
      event.participants.push(participant);
      this.trackMemberActivity(participant);
      this.emit('eventRegistration', event, participant);
      
      console.log(`${participant} registered for event: ${event.title}`);
    }

    return true;
  }

  private async checkUpcomingEvents(): Promise<void> {
    const now = new Date();
    const reminderWindow = 24 * 60 * 60 * 1000; // 24 hours

    for (const event of this.events.values()) {
      if (event.status === 'planned') {
        const timeUntilEvent = event.startDate.getTime() - now.getTime();
        
        if (timeUntilEvent <= reminderWindow && timeUntilEvent > 0) {
          await this.sendEventReminder(event);
        }
        
        if (timeUntilEvent <= 0) {
          event.status = 'active';
          this.emit('eventStarted', event);
        }
      }
      
      if (event.status === 'active' && now > event.endDate) {
        event.status = 'completed';
        this.emit('eventCompleted', event);
      }
    }
  }

  private async sendEventReminder(event: CommunityEvent): Promise<void> {
    console.log(`Sending reminder for event: ${event.title}`);
    
    // This would integrate with notification systems
    this.emit('eventReminder', event);
  }

  private async processCompletedEvents(): Promise<void> {
    const completedEvents = Array.from(this.events.values())
      .filter(event => event.status === 'completed' && !event.outcomes);

    for (const event of completedEvents) {
      await this.collectEventFeedback(event);
    }
  }

  private async collectEventFeedback(event: CommunityEvent): Promise<void> {
    console.log(`Collecting feedback for completed event: ${event.title}`);
    
    // Create feedback collection for the event
    const feedbackId = this.feedbackSystem.submitFeedback(
      'improvement',
      `Event Feedback: ${event.title}`,
      `Please provide feedback on the ${event.type} event: ${event.title}`,
      'system',
      [],
      'low'
    );

    // Initialize outcomes array
    event.outcomes = [];
    
    this.emit('eventFeedbackRequested', event, feedbackId);
  }

  // Educational Initiatives Methods
  public createEducationalContent(
    title: string,
    description: string,
    type: EducationalInitiative['type'],
    difficulty: EducationalInitiative['difficulty'],
    topics: string[],
    author: string,
    content: EducationalContent[]
  ): string {
    const initiativeId = this.generateInitiativeId();
    
    const initiative: EducationalInitiative = {
      id: initiativeId,
      title,
      description,
      type,
      difficulty,
      topics,
      content,
      author,
      createdAt: new Date(),
      updatedAt: new Date(),
      views: 0,
      ratings: [],
      status: 'draft'
    };

    this.educationalInitiatives.set(initiativeId, initiative);
    this.emit('educationalContentCreated', initiative);
    
    console.log(`Created educational content: ${title} (${initiativeId})`);
    return initiativeId;
  }

  public publishEducationalContent(initiativeId: string): boolean {
    const initiative = this.educationalInitiatives.get(initiativeId);
    if (!initiative) {
      throw new Error(`Educational initiative ${initiativeId} not found`);
    }

    initiative.status = 'published';
    initiative.updatedAt = new Date();
    
    this.emit('educationalContentPublished', initiative);
    console.log(`Published educational content: ${initiative.title}`);
    
    return true;
  }

  public viewEducationalContent(initiativeId: string, viewer: string): boolean {
    const initiative = this.educationalInitiatives.get(initiativeId);
    if (!initiative || initiative.status !== 'published') {
      return false;
    }

    initiative.views++;
    this.trackMemberActivity(viewer);
    
    this.emit('educationalContentViewed', initiative, viewer);
    return true;
  }

  public rateEducationalContent(initiativeId: string, rating: number, rater: string): boolean {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    const initiative = this.educationalInitiatives.get(initiativeId);
    if (!initiative || initiative.status !== 'published') {
      return false;
    }

    initiative.ratings.push(rating);
    this.trackMemberActivity(rater);
    
    this.emit('educationalContentRated', initiative, rating, rater);
    return true;
  }

  private createDefaultEducationalContent(): void {
    // Create default educational content
    const defaultContent = [
      {
        title: 'Getting Started with LinkDAO',
        description: 'A comprehensive guide to using the LinkDAO platform',
        type: 'guide' as const,
        difficulty: 'beginner' as const,
        topics: ['basics', 'onboarding', 'wallet-connection'],
        content: [
          {
            type: 'text' as const,
            title: 'Introduction',
            content: 'Welcome to LinkDAO! This guide will help you get started with our decentralized social platform.',
            order: 1
          },
          {
            type: 'text' as const,
            title: 'Connecting Your Wallet',
            content: 'Learn how to connect your Web3 wallet to start participating in the community.',
            order: 2
          }
        ]
      },
      {
        title: 'Governance Participation Guide',
        description: 'Learn how to participate in LinkDAO governance',
        type: 'tutorial' as const,
        difficulty: 'intermediate' as const,
        topics: ['governance', 'voting', 'proposals'],
        content: [
          {
            type: 'text' as const,
            title: 'Understanding Governance',
            content: 'LinkDAO uses a decentralized governance system where token holders can vote on proposals.',
            order: 1
          }
        ]
      }
    ];

    for (const content of defaultContent) {
      this.createEducationalContent(
        content.title,
        content.description,
        content.type,
        content.difficulty,
        content.topics,
        'system',
        content.content
      );
    }
  }

  private async trackEducationalEngagement(): Promise<void> {
    console.log('Tracking educational engagement...');
    
    const initiatives = Array.from(this.educationalInitiatives.values());
    const totalViews = initiatives.reduce((sum, init) => sum + init.views, 0);
    const totalRatings = initiatives.reduce((sum, init) => sum + init.ratings.length, 0);
    const avgRating = initiatives.reduce((sum, init) => {
      const initAvg = init.ratings.length > 0 
        ? init.ratings.reduce((a, b) => a + b, 0) / init.ratings.length 
        : 0;
      return sum + initAvg;
    }, 0) / initiatives.length;

    const engagementData = {
      totalInitiatives: initiatives.length,
      publishedInitiatives: initiatives.filter(init => init.status === 'published').length,
      totalViews,
      totalRatings,
      averageRating: avgRating
    };

    this.emit('educationalEngagement', engagementData);
  }

  // Partnership Management Methods
  public proposePartnership(
    name: string,
    type: Partnership['type'],
    description: string,
    contactPerson: string,
    benefits: string[],
    deliverables: string[],
    communityImpact: string
  ): string {
    const partnershipId = this.generatePartnershipId();
    
    const partnership: Partnership = {
      id: partnershipId,
      name,
      type,
      description,
      status: 'proposed',
      startDate: new Date(),
      contactPerson,
      benefits,
      deliverables,
      communityImpact
    };

    this.partnerships.set(partnershipId, partnership);
    this.emit('partnershipProposed', partnership);
    
    console.log(`Proposed ${type} partnership: ${name} (${partnershipId})`);
    return partnershipId;
  }

  public updatePartnershipStatus(
    partnershipId: string,
    status: Partnership['status'],
    updatedBy: string
  ): boolean {
    const partnership = this.partnerships.get(partnershipId);
    if (!partnership) {
      throw new Error(`Partnership ${partnershipId} not found`);
    }

    const oldStatus = partnership.status;
    partnership.status = status;

    if (status === 'active') {
      partnership.startDate = new Date();
    }

    this.emit('partnershipStatusUpdated', partnership, oldStatus, updatedBy);
    console.log(`Partnership ${partnership.name} status changed from ${oldStatus} to ${status}`);
    
    return true;
  }

  private async reviewPartnershipProgress(): Promise<void> {
    console.log('Reviewing partnership progress...');
    
    const activePartnerships = Array.from(this.partnerships.values())
      .filter(p => p.status === 'active');

    for (const partnership of activePartnerships) {
      // Check if partnership needs review or has deliverables due
      await this.assessPartnershipHealth(partnership);
    }
  }

  private async assessPartnershipHealth(partnership: Partnership): Promise<void> {
    // Assess partnership health and progress
    console.log(`Assessing partnership health: ${partnership.name}`);
    
    // This would involve checking deliverables, communication, etc.
    this.emit('partnershipAssessed', partnership);
  }

  // Community Engagement Tracking
  private trackMemberActivity(member: string): void {
    this.communityMembers.add(member);
    this.activeMembers.set(member, new Date());
  }

  private async calculateEngagementMetrics(): Promise<void> {
    console.log('Calculating engagement metrics...');
    
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Calculate active members (active in last 30 days)
    const activeMemberCount = Array.from(this.activeMembers.entries())
      .filter(([_, lastActivity]) => lastActivity > thirtyDaysAgo)
      .length;

    // Calculate various engagement metrics
    const metrics: CommunityMetrics = {
      totalMembers: this.communityMembers.size,
      activeMembers: activeMemberCount,
      governanceParticipation: await this.calculateGovernanceParticipation(),
      eventAttendance: this.calculateEventAttendance(),
      feedbackEngagement: this.calculateFeedbackEngagement(),
      educationalEngagement: this.calculateEducationalEngagement(),
      partnershipCount: Array.from(this.partnerships.values())
        .filter(p => p.status === 'active').length,
      communityGrowthRate: this.calculateGrowthRate(),
      retentionRate: this.calculateRetentionRate(),
      satisfactionScore: this.calculateSatisfactionScore()
    };

    this.emit('engagementMetrics', metrics);
  }

  private async calculateGovernanceParticipation(): Promise<number> {
    // This would calculate actual governance participation
    return Math.random() * 50 + 25; // 25-75% placeholder
  }

  private calculateEventAttendance(): number {
    const completedEvents = Array.from(this.events.values())
      .filter(event => event.status === 'completed');
    
    if (completedEvents.length === 0) return 0;
    
    const totalAttendance = completedEvents.reduce((sum, event) => sum + event.participants.length, 0);
    return totalAttendance / completedEvents.length;
  }

  private calculateFeedbackEngagement(): number {
    const feedbackMetrics = this.feedbackSystem.getCommunityMetrics();
    return feedbackMetrics.communityEngagement;
  }

  private calculateEducationalEngagement(): number {
    const initiatives = Array.from(this.educationalInitiatives.values());
    if (initiatives.length === 0) return 0;
    
    const totalViews = initiatives.reduce((sum, init) => sum + init.views, 0);
    return totalViews / initiatives.length;
  }

  private calculateGrowthRate(): number {
    // Calculate community growth rate
    // This would use historical data to calculate actual growth
    return Math.random() * 20 + 5; // 5-25% placeholder
  }

  private calculateRetentionRate(): number {
    // Calculate member retention rate
    // This would analyze member activity over time
    return Math.random() * 30 + 70; // 70-100% placeholder
  }

  private calculateSatisfactionScore(): number {
    // Calculate community satisfaction score
    const initiatives = Array.from(this.educationalInitiatives.values());
    const allRatings = initiatives.flatMap(init => init.ratings);
    
    if (allRatings.length === 0) return 0;
    
    return allRatings.reduce((sum, rating) => sum + rating, 0) / allRatings.length;
  }

  private async identifyDisengagedMembers(): Promise<void> {
    const now = new Date();
    const disengagementThreshold = 14 * 24 * 60 * 60 * 1000; // 14 days
    
    const disengagedMembers = Array.from(this.activeMembers.entries())
      .filter(([_, lastActivity]) => 
        now.getTime() - lastActivity.getTime() > disengagementThreshold
      )
      .map(([member, _]) => member);

    if (disengagedMembers.length > 0) {
      console.log(`Identified ${disengagedMembers.length} disengaged members`);
      this.emit('disengagedMembersIdentified', disengagedMembers);
      
      // Plan re-engagement activities
      await this.planReengagementActivities(disengagedMembers);
    }
  }

  private async planReengagementActivities(disengagedMembers: string[]): Promise<void> {
    console.log(`Planning re-engagement activities for ${disengagedMembers.length} members`);
    
    // Create targeted re-engagement events
    const reengagementEvent = this.organizeEvent(
      'community-call',
      'Community Re-engagement Call',
      'Special community call to reconnect with our members and gather feedback',
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // 1 hour duration
      'system'
    );

    this.emit('reengagementPlanned', reengagementEvent, disengagedMembers);
  }

  private async planEngagementActivities(): Promise<void> {
    console.log('Planning engagement activities...');
    
    // Plan regular engagement activities based on community needs
    const activities = [
      {
        type: 'ama' as const,
        title: 'Monthly AMA with Core Team',
        frequency: 'monthly'
      },
      {
        type: 'workshop' as const,
        title: 'DeFi Workshop Series',
        frequency: 'bi-weekly'
      },
      {
        type: 'hackathon' as const,
        title: 'Quarterly Hackathon',
        frequency: 'quarterly'
      }
    ];

    for (const activity of activities) {
      // Check if it's time to schedule this activity
      await this.scheduleRegularActivity(activity);
    }
  }

  private async scheduleRegularActivity(activity: any): Promise<void> {
    // Logic to schedule regular activities based on frequency
    console.log(`Scheduling ${activity.frequency} ${activity.type}: ${activity.title}`);
  }

  // Utility Methods
  private generateEventId(): string {
    return `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateInitiativeId(): string {
    return `edu-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generatePartnershipId(): string {
    return `partner-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public API Methods
  public start(): void {
    if (this.isRunning) {
      console.log('Community Engagement Manager is already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting Community Engagement Manager...');
  }

  public stop(): void {
    if (!this.isRunning) {
      console.log('Community Engagement Manager is not running');
      return;
    }

    console.log('Stopping Community Engagement Manager...');
    
    if (this.engagementTimer) {
      clearInterval(this.engagementTimer);
    }

    this.isRunning = false;
    console.log('Community Engagement Manager stopped');
  }

  public getEvents(status?: CommunityEvent['status']): CommunityEvent[] {
    const events = Array.from(this.events.values());
    return status ? events.filter(event => event.status === status) : events;
  }

  public getEducationalContent(status?: EducationalInitiative['status']): EducationalInitiative[] {
    const initiatives = Array.from(this.educationalInitiatives.values());
    return status ? initiatives.filter(init => init.status === status) : initiatives;
  }

  public getPartnerships(status?: Partnership['status']): Partnership[] {
    const partnerships = Array.from(this.partnerships.values());
    return status ? partnerships.filter(p => p.status === status) : partnerships;
  }

  public getFeedbackSystem(): CommunityFeedbackSystem {
    return this.feedbackSystem;
  }

  public getCommunityStatus(): any {
    return {
      isRunning: this.isRunning,
      totalMembers: this.communityMembers.size,
      activeEvents: this.getEvents('active').length,
      publishedEducationalContent: this.getEducationalContent('published').length,
      activePartnerships: this.getPartnerships('active').length,
      recentFeedback: this.feedbackSystem.getFeedback({}, 'date', 5).length
    };
  }

  public generateCommunityReport(): string {
    let report = '# Community Engagement Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;

    // Community Overview
    report += '## Community Overview\n\n';
    report += `- **Total Members**: ${this.communityMembers.size}\n`;
    report += `- **Active Events**: ${this.getEvents('active').length}\n`;
    report += `- **Completed Events**: ${this.getEvents('completed').length}\n`;
    report += `- **Educational Content**: ${this.getEducationalContent('published').length}\n`;
    report += `- **Active Partnerships**: ${this.getPartnerships('active').length}\n\n`;

    // Recent Events
    const recentEvents = this.getEvents().slice(-5);
    if (recentEvents.length > 0) {
      report += '## Recent Events\n\n';
      for (const event of recentEvents) {
        report += `### ${event.title}\n`;
        report += `- **Type**: ${event.type}\n`;
        report += `- **Status**: ${event.status}\n`;
        report += `- **Participants**: ${event.participants.length}\n`;
        report += `- **Date**: ${event.startDate.toDateString()}\n\n`;
      }
    }

    // Educational Content
    const topEducationalContent = Array.from(this.educationalInitiatives.values())
      .filter(init => init.status === 'published')
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);

    if (topEducationalContent.length > 0) {
      report += '## Top Educational Content\n\n';
      for (const content of topEducationalContent) {
        const avgRating = content.ratings.length > 0 
          ? content.ratings.reduce((a, b) => a + b, 0) / content.ratings.length 
          : 0;
        
        report += `### ${content.title}\n`;
        report += `- **Type**: ${content.type}\n`;
        report += `- **Views**: ${content.views}\n`;
        report += `- **Average Rating**: ${avgRating.toFixed(1)}/5\n`;
        report += `- **Difficulty**: ${content.difficulty}\n\n`;
      }
    }

    // Feedback Summary
    report += '## Feedback Summary\n\n';
    const feedbackMetrics = this.feedbackSystem.getCommunityMetrics();
    report += `- **Total Feedback**: ${feedbackMetrics.totalFeedback}\n`;
    report += `- **Average Resolution Time**: ${feedbackMetrics.averageResolutionTime.toFixed(1)} days\n`;
    report += `- **Community Engagement**: ${feedbackMetrics.communityEngagement.toFixed(1)} votes per item\n\n`;

    return report;
  }
}