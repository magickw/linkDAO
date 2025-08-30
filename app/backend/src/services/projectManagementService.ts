import { db } from '../db/index';
import { 
  timeTracking, 
  projectDeliverables, 
  milestonePayments, 
  projectThreads, 
  projectMessages, 
  projectApprovals, 
  projectActivities, 
  projectFiles,
  serviceBookings,
  serviceMilestones,
  users
} from '../db/schema';
import { eq, and, desc, asc, sql, isNull, or } from 'drizzle-orm';
import { 
  TimeTracking, 
  ProjectDeliverable, 
  MilestonePayment, 
  ProjectThread, 
  ProjectMessage, 
  ProjectApproval, 
  ProjectActivity, 
  ProjectFile,
  StartTimeTrackingRequest,
  StopTimeTrackingRequest,
  CreateDeliverableRequest,
  UpdateDeliverableRequest,
  CreateMilestonePaymentRequest,
  CreateProjectThreadRequest,
  SendProjectMessageRequest,
  CreateApprovalRequest,
  ProcessApprovalRequest,
  UploadProjectFileRequest,
  ProjectDashboard,
  EnhancedServiceBooking
} from '../types/service';

export class ProjectManagementService {
  // Time Tracking Methods
  async startTimeTracking(userId: string, request: StartTimeTrackingRequest): Promise<TimeTracking> {
    // Verify user is the provider for this booking
    const booking = await db.select()
      .from(serviceBookings)
      .where(eq(serviceBookings.id, request.bookingId))
      .limit(1);

    if (!booking.length || booking[0].providerId !== userId) {
      throw new Error('Unauthorized: Only the service provider can track time');
    }

    // Check if there's already an active time tracking session
    const activeSession = await db.select()
      .from(timeTracking)
      .where(
        and(
          eq(timeTracking.providerId, userId),
          eq(timeTracking.status, 'active'),
          isNull(timeTracking.endTime)
        )
      )
      .limit(1);

    if (activeSession.length > 0) {
      throw new Error('You already have an active time tracking session. Please stop it first.');
    }

    const [newTracking] = await db.insert(timeTracking).values({
      bookingId: request.bookingId,
      milestoneId: request.milestoneId,
      providerId: userId,
      startTime: new Date(),
      description: request.description,
      hourlyRate: request.hourlyRate,
      status: 'active'
    }).returning();

    // Log activity
    await this.logActivity(request.bookingId, request.milestoneId, userId, 'time_tracking_started', 'Time tracking session started');

    return newTracking as TimeTracking;
  }

  async stopTimeTracking(userId: string, request: StopTimeTrackingRequest): Promise<TimeTracking> {
    const session = await db.select()
      .from(timeTracking)
      .where(
        and(
          eq(timeTracking.id, request.timeTrackingId),
          eq(timeTracking.providerId, userId),
          eq(timeTracking.status, 'active')
        )
      )
      .limit(1);

    if (!session.length) {
      throw new Error('Time tracking session not found or already stopped');
    }

    const endTime = new Date();
    const startTime = new Date(session[0].startTime);
    const durationMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60));
    
    let totalAmount = '0';
    if (session[0].hourlyRate && session[0].isBillable) {
      const hourlyRate = parseFloat(session[0].hourlyRate);
      const hours = durationMinutes / 60;
      totalAmount = (hourlyRate * hours).toFixed(8);
    }

    const [updatedTracking] = await db.update(timeTracking)
      .set({
        endTime: endTime,
        durationMinutes,
        totalAmount,
        description: request.description || session[0].description,
        status: 'completed',
        updatedAt: new Date()
      })
      .where(eq(timeTracking.id, request.timeTrackingId))
      .returning();

    // Log activity
    await this.logActivity(
      session[0].bookingId, 
      session[0].milestoneId, 
      userId, 
      'time_tracking_stopped', 
      `Time tracking session completed: ${durationMinutes} minutes`
    );

    return updatedTracking as TimeTracking;
  }

  async getTimeTrackingByBooking(bookingId: string): Promise<TimeTracking[]> {
    const trackingRecords = await db.select()
      .from(timeTracking)
      .where(eq(timeTracking.bookingId, bookingId))
      .orderBy(desc(timeTracking.startTime));

    return trackingRecords as TimeTracking[];
  }

  async getActiveTimeTracking(userId: string): Promise<TimeTracking | null> {
    const [activeSession] = await db.select()
      .from(timeTracking)
      .where(
        and(
          eq(timeTracking.providerId, userId),
          eq(timeTracking.status, 'active'),
          isNull(timeTracking.endTime)
        )
      )
      .limit(1);

    return activeSession as TimeTracking || null;
  }

  // Deliverables Methods
  async createDeliverable(userId: string, request: CreateDeliverableRequest): Promise<ProjectDeliverable> {
    // Verify user has access to this booking
    const booking = await db.select()
      .from(serviceBookings)
      .where(eq(serviceBookings.id, request.bookingId))
      .limit(1);

    if (!booking.length || (booking[0].providerId !== userId && booking[0].clientId !== userId)) {
      throw new Error('Unauthorized: Access denied to this booking');
    }

    const [deliverable] = await db.insert(projectDeliverables).values({
      bookingId: request.bookingId,
      milestoneId: request.milestoneId,
      title: request.title,
      description: request.description,
      deliverableType: request.deliverableType,
      content: request.content,
      url: request.url,
      fileHash: request.fileHash,
      fileName: request.fileName,
      fileSize: request.fileSize,
      fileType: request.fileType,
      status: 'pending'
    }).returning();

    // Log activity
    await this.logActivity(
      request.bookingId, 
      request.milestoneId, 
      userId, 
      'deliverable_created', 
      `New deliverable created: ${request.title}`
    );

    return deliverable as ProjectDeliverable;
  }

  async updateDeliverable(userId: string, deliverableId: string, request: UpdateDeliverableRequest): Promise<ProjectDeliverable> {
    const existing = await db.select()
      .from(projectDeliverables)
      .innerJoin(serviceBookings, eq(projectDeliverables.bookingId, serviceBookings.id))
      .where(eq(projectDeliverables.id, deliverableId))
      .limit(1);

    if (!existing.length) {
      throw new Error('Deliverable not found');
    }

    const booking = existing[0].service_bookings;
    if (booking.providerId !== userId && booking.clientId !== userId) {
      throw new Error('Unauthorized: Access denied to this deliverable');
    }

    const [updated] = await db.update(projectDeliverables)
      .set({
        ...request,
        updatedAt: new Date()
      })
      .where(eq(projectDeliverables.id, deliverableId))
      .returning();

    // Log activity
    await this.logActivity(
      booking.id, 
      existing[0].project_deliverables.milestoneId, 
      userId, 
      'deliverable_updated', 
      `Deliverable updated: ${existing[0].project_deliverables.title}`
    );

    return updated as ProjectDeliverable;
  }

  async getDeliverablesByBooking(bookingId: string): Promise<ProjectDeliverable[]> {
    const deliverables = await db.select()
      .from(projectDeliverables)
      .where(eq(projectDeliverables.bookingId, bookingId))
      .orderBy(desc(projectDeliverables.createdAt));

    return deliverables as ProjectDeliverable[];
  }

  // Milestone Payments Methods
  async createMilestonePayment(userId: string, request: CreateMilestonePaymentRequest): Promise<MilestonePayment> {
    // Verify milestone exists and user is the client
    const milestone = await db.select()
      .from(serviceMilestones)
      .innerJoin(serviceBookings, eq(serviceMilestones.bookingId, serviceBookings.id))
      .where(eq(serviceMilestones.id, request.milestoneId))
      .limit(1);

    if (!milestone.length) {
      throw new Error('Milestone not found');
    }

    const booking = milestone[0].service_bookings;
    if (booking.clientId !== userId) {
      throw new Error('Unauthorized: Only the client can create milestone payments');
    }

    const [payment] = await db.insert(milestonePayments).values({
      milestoneId: request.milestoneId,
      bookingId: booking.id,
      amount: request.amount,
      currency: request.currency,
      paymentMethod: request.paymentMethod,
      releaseConditions: request.releaseConditions,
      heldUntil: request.heldUntil,
      status: 'pending'
    }).returning();

    // Log activity
    await this.logActivity(
      booking.id, 
      request.milestoneId, 
      userId, 
      'milestone_payment_created', 
      `Milestone payment created: ${request.amount} ${request.currency}`
    );

    return payment as MilestonePayment;
  }

  async processMilestonePayment(paymentId: string, status: string, transactionHash?: string): Promise<MilestonePayment> {
    const [updated] = await db.update(milestonePayments)
      .set({
        status,
        transactionHash,
        updatedAt: new Date()
      })
      .where(eq(milestonePayments.id, paymentId))
      .returning();

    if (!updated) {
      throw new Error('Payment not found');
    }

    // Log activity
    await this.logActivity(
      updated.bookingId, 
      updated.milestoneId, 
      'system', 
      'milestone_payment_processed', 
      `Milestone payment ${status}: ${transactionHash || 'N/A'}`
    );

    return updated as MilestonePayment;
  }

  // Communication Methods
  async createProjectThread(userId: string, request: CreateProjectThreadRequest): Promise<ProjectThread> {
    // Verify user has access to booking
    const booking = await db.select()
      .from(serviceBookings)
      .where(eq(serviceBookings.id, request.bookingId))
      .limit(1);

    if (!booking.length || (booking[0].providerId !== userId && booking[0].clientId !== userId)) {
      throw new Error('Unauthorized: Access denied to this booking');
    }

    const [thread] = await db.insert(projectThreads).values({
      bookingId: request.bookingId,
      milestoneId: request.milestoneId,
      threadType: request.threadType,
      title: request.title,
      isPrivate: request.isPrivate || false,
      createdBy: userId
    }).returning();

    // Log activity
    await this.logActivity(
      request.bookingId, 
      request.milestoneId, 
      userId, 
      'thread_created', 
      `New thread created: ${request.title}`
    );

    return thread as ProjectThread;
  }

  async sendProjectMessage(userId: string, request: SendProjectMessageRequest): Promise<ProjectMessage> {
    // Verify user has access to thread
    const thread = await db.select()
      .from(projectThreads)
      .innerJoin(serviceBookings, eq(projectThreads.bookingId, serviceBookings.id))
      .where(eq(projectThreads.id, request.threadId))
      .limit(1);

    if (!thread.length) {
      throw new Error('Thread not found');
    }

    const booking = thread[0].service_bookings;
    if (booking.providerId !== userId && booking.clientId !== userId) {
      throw new Error('Unauthorized: Access denied to this thread');
    }

    const [message] = await db.insert(projectMessages).values({
      threadId: request.threadId,
      bookingId: booking.id,
      senderId: userId,
      messageType: request.messageType || 'text',
      content: request.content,
      fileAttachments: JSON.stringify(request.fileAttachments || []),
      codeLanguage: request.codeLanguage,
      replyTo: request.replyTo
    }).returning();

    // Update thread timestamp
    await db.update(projectThreads)
      .set({ updatedAt: new Date() })
      .where(eq(projectThreads.id, request.threadId));

    // Log activity
    await this.logActivity(
      booking.id, 
      thread[0].project_threads.milestoneId, 
      userId, 
      'message_sent', 
      `Message sent in thread: ${thread[0].project_threads.title}`
    );

    return {
      ...message,
      fileAttachments: message.fileAttachments ? JSON.parse(message.fileAttachments) : undefined,
      messageType: message.messageType as any,
      isRead: message.isRead || false,
      isPinned: message.isPinned || false,
      createdAt: new Date(message.createdAt!),
      updatedAt: new Date(message.updatedAt!)
    } as ProjectMessage;
  }

  async getProjectThreads(bookingId: string): Promise<ProjectThread[]> {
    const threads = await db.select()
      .from(projectThreads)
      .where(eq(projectThreads.bookingId, bookingId))
      .orderBy(desc(projectThreads.updatedAt));

    return threads as ProjectThread[];
  }

  async getProjectMessages(threadId: string, limit: number = 50, offset: number = 0): Promise<ProjectMessage[]> {
    const messages = await db.select()
      .from(projectMessages)
      .where(eq(projectMessages.threadId, threadId))
      .orderBy(asc(projectMessages.createdAt))
      .limit(limit)
      .offset(offset);

    return messages.map(message => ({
      ...message,
      fileAttachments: message.fileAttachments ? JSON.parse(message.fileAttachments) : undefined,
      messageType: message.messageType as any,
      isRead: message.isRead || false,
      isPinned: message.isPinned || false,
      createdAt: new Date(message.createdAt!),
      updatedAt: new Date(message.updatedAt!)
    })) as ProjectMessage[];
  }

  // Approval Methods
  async createApproval(userId: string, request: CreateApprovalRequest): Promise<ProjectApproval> {
    // Verify user is the client
    const booking = await db.select()
      .from(serviceBookings)
      .where(eq(serviceBookings.id, request.bookingId))
      .limit(1);

    if (!booking.length || booking[0].clientId !== userId) {
      throw new Error('Unauthorized: Only the client can create approvals');
    }

    const [approval] = await db.insert(projectApprovals).values({
      bookingId: request.bookingId,
      milestoneId: request.milestoneId,
      deliverableId: request.deliverableId,
      approverId: userId,
      approvalType: request.approvalType,
      autoApproveAt: request.autoApproveAt,
      status: 'pending'
    }).returning();

    // Log activity
    await this.logActivity(
      request.bookingId, 
      request.milestoneId, 
      userId, 
      'approval_created', 
      `Approval request created: ${request.approvalType}`
    );

    return approval as ProjectApproval;
  }

  async processApproval(userId: string, request: ProcessApprovalRequest): Promise<ProjectApproval> {
    const existing = await db.select()
      .from(projectApprovals)
      .innerJoin(serviceBookings, eq(projectApprovals.bookingId, serviceBookings.id))
      .where(eq(projectApprovals.id, request.approvalId))
      .limit(1);

    if (!existing.length) {
      throw new Error('Approval not found');
    }

    const booking = existing[0].service_bookings;
    if (booking.clientId !== userId) {
      throw new Error('Unauthorized: Only the client can process approvals');
    }

    const [updated] = await db.update(projectApprovals)
      .set({
        status: request.status,
        feedback: request.feedback,
        approvedAt: request.status === 'approved' ? new Date() : undefined,
        updatedAt: new Date()
      })
      .where(eq(projectApprovals.id, request.approvalId))
      .returning();

    // Log activity
    await this.logActivity(
      booking.id, 
      existing[0].project_approvals.milestoneId, 
      userId, 
      'approval_processed', 
      `Approval ${request.status}: ${existing[0].project_approvals.approvalType}`
    );

    return updated as ProjectApproval;
  }

  // File Management Methods
  async uploadProjectFile(userId: string, request: UploadProjectFileRequest): Promise<ProjectFile> {
    // Verify user has access to booking
    const booking = await db.select()
      .from(serviceBookings)
      .where(eq(serviceBookings.id, request.bookingId))
      .limit(1);

    if (!booking.length || (booking[0].providerId !== userId && booking[0].clientId !== userId)) {
      throw new Error('Unauthorized: Access denied to this booking');
    }

    // Check if file already exists and increment version
    const existingFiles = await db.select()
      .from(projectFiles)
      .where(
        and(
          eq(projectFiles.bookingId, request.bookingId),
          eq(projectFiles.fileName, request.fileName)
        )
      )
      .orderBy(desc(projectFiles.versionNumber));

    const versionNumber = existingFiles.length > 0 ? (existingFiles[0].versionNumber || 0) + 1 : 1;

    // Mark previous versions as not current
    if (existingFiles.length > 0) {
      await db.update(projectFiles)
        .set({ isCurrentVersion: false })
        .where(
          and(
            eq(projectFiles.bookingId, request.bookingId),
            eq(projectFiles.fileName, request.fileName)
          )
        );
    }

    const [file] = await db.insert(projectFiles).values({
      bookingId: request.bookingId,
      milestoneId: request.milestoneId,
      deliverableId: request.deliverableId,
      uploaderId: userId,
      fileName: request.fileName,
      fileHash: request.fileHash,
      fileSize: request.fileSize,
      fileType: request.fileType,
      versionNumber,
      accessLevel: request.accessLevel || 'project'
    }).returning();

    // Log activity
    await this.logActivity(
      request.bookingId, 
      request.milestoneId, 
      userId, 
      'file_uploaded', 
      `File uploaded: ${request.fileName} (v${versionNumber})`
    );

    return file as ProjectFile;
  }

  async getProjectFiles(bookingId: string, milestoneId?: string): Promise<ProjectFile[]> {
    let whereCondition = eq(projectFiles.bookingId, bookingId);
    
    if (milestoneId) {
      whereCondition = and(eq(projectFiles.bookingId, bookingId), eq(projectFiles.milestoneId, milestoneId)) as any;
    }

    const files = await db.select()
      .from(projectFiles)
      .where(whereCondition)
      .orderBy(desc(projectFiles.createdAt));
      
    return files as ProjectFile[];
  }

  // Dashboard and Analytics
  async getProjectDashboard(bookingId: string, userId: string): Promise<ProjectDashboard> {
    // Verify user has access
    const booking = await db.select()
      .from(serviceBookings)
      .where(eq(serviceBookings.id, bookingId))
      .limit(1);

    if (!booking.length || (booking[0].providerId !== userId && booking[0].clientId !== userId)) {
      throw new Error('Unauthorized: Access denied to this booking');
    }

    // Get enhanced booking data
    const [
      milestones,
      timeTrackingRecords,
      deliverables,
      threads,
      approvals,
      activities,
      files
    ] = await Promise.all([
      db.select().from(serviceMilestones).where(eq(serviceMilestones.bookingId, bookingId)),
      this.getTimeTrackingByBooking(bookingId),
      this.getDeliverablesByBooking(bookingId),
      this.getProjectThreads(bookingId),
      db.select().from(projectApprovals).where(eq(projectApprovals.bookingId, bookingId)),
      db.select().from(projectActivities).where(eq(projectActivities.bookingId, bookingId)).orderBy(desc(projectActivities.createdAt)).limit(10),
      this.getProjectFiles(bookingId)
    ]);

    // Calculate summaries
    const timeTrackingSummary = this.calculateTimeTrackingSummary(timeTrackingRecords);
    const deliverablesSummary = this.calculateDeliverablesSummary(deliverables);
    const communicationSummary = await this.calculateCommunicationSummary(bookingId);
    const upcomingDeadlines = this.getUpcomingDeadlines(milestones);

    const enhancedBooking: EnhancedServiceBooking = {
      ...booking[0],
      bookingType: (booking[0].bookingType || 'project') as 'project' | 'consultation' | 'ongoing',
      status: (booking[0].status || 'pending') as 'pending' | 'completed' | 'in_progress' | 'confirmed' | 'cancelled' | 'disputed',
      paymentStatus: (booking[0].paymentStatus || 'pending') as 'pending' | 'paid' | 'released' | 'refunded',
      scheduledStart: booking[0].scheduledStart || undefined,
      scheduledEnd: booking[0].scheduledEnd || undefined,
      actualStart: booking[0].actualStart || undefined,
      actualEnd: booking[0].actualEnd || undefined,
      escrowContract: booking[0].escrowContract || undefined,
      clientRequirements: booking[0].clientRequirements || undefined,
      providerNotes: booking[0].providerNotes || undefined,
      meetingLink: booking[0].meetingLink || undefined,
      locationDetails: booking[0].locationDetails || undefined,
      createdAt: new Date(booking[0].createdAt!),
      updatedAt: new Date(booking[0].updatedAt!),
      timeTracking: timeTrackingRecords,
      deliverables,
      threads,
      approvals: approvals as ProjectApproval[],
      activities: activities as ProjectActivity[],
      files,
      totalTimeTracked: timeTrackingSummary.totalHours,
      totalBillableHours: timeTrackingSummary.billableHours,
      completedDeliverables: deliverablesSummary.approved,
      pendingApprovals: approvals.filter(a => a.status === 'pending').length
    };

    return {
      booking: enhancedBooking,
      milestones: milestones.map(m => ({
        ...m,
        description: m.description || undefined,
        status: (m.status || 'pending') as 'pending' | 'completed' | 'in_progress' | 'approved' | 'disputed',
        deliverables: m.deliverables || undefined,
        clientFeedback: m.clientFeedback || undefined,
        dueDate: m.dueDate ? new Date(m.dueDate) : undefined,
        completedAt: m.completedAt ? new Date(m.completedAt) : undefined,
        approvedAt: m.approvedAt ? new Date(m.approvedAt) : undefined,
        createdAt: new Date(m.createdAt!)
      })),
      recentActivities: activities as ProjectActivity[],
      upcomingDeadlines,
      timeTrackingSummary,
      deliverablesSummary,
      communicationSummary
    };
  }

  // Helper Methods
  private async logActivity(
    bookingId: string, 
    milestoneId: string | null | undefined, 
    userId: string, 
    activityType: string, 
    description: string, 
    metadata?: any
  ): Promise<void> {
    await db.insert(projectActivities).values({
      bookingId,
      milestoneId: milestoneId || undefined,
      userId,
      activityType,
      description,
      metadata: metadata ? JSON.stringify(metadata) : undefined
    });
  }

  private calculateTimeTrackingSummary(records: TimeTracking[]) {
    const totalMinutes = records.reduce((sum, record) => sum + (record.durationMinutes || 0), 0);
    const billableMinutes = records
      .filter(record => record.isBillable)
      .reduce((sum, record) => sum + (record.durationMinutes || 0), 0);
    
    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - 7);
    const thisWeekMinutes = records
      .filter(record => new Date(record.startTime) >= thisWeek)
      .reduce((sum, record) => sum + (record.durationMinutes || 0), 0);

    return {
      totalHours: Math.round(totalMinutes / 60 * 100) / 100,
      billableHours: Math.round(billableMinutes / 60 * 100) / 100,
      totalAmount: records.reduce((sum, record) => sum + parseFloat(record.totalAmount || '0'), 0).toFixed(8),
      thisWeekHours: Math.round(thisWeekMinutes / 60 * 100) / 100
    };
  }

  private calculateDeliverablesSummary(deliverables: ProjectDeliverable[]) {
    return {
      total: deliverables.length,
      pending: deliverables.filter(d => d.status === 'pending').length,
      inProgress: deliverables.filter(d => d.status === 'in_progress').length,
      submitted: deliverables.filter(d => d.status === 'submitted').length,
      approved: deliverables.filter(d => d.status === 'approved').length
    };
  }

  private async calculateCommunicationSummary(bookingId: string) {
    const messageCount = await db.select({ count: sql<number>`count(*)` })
      .from(projectMessages)
      .where(eq(projectMessages.bookingId, bookingId));

    const unreadCount = await db.select({ count: sql<number>`count(*)` })
      .from(projectMessages)
      .where(
        and(
          eq(projectMessages.bookingId, bookingId),
          eq(projectMessages.isRead, false)
        )
      );

    const threadCount = await db.select({ count: sql<number>`count(*)` })
      .from(projectThreads)
      .where(eq(projectThreads.bookingId, bookingId));

    return {
      totalMessages: messageCount[0]?.count || 0,
      unreadMessages: unreadCount[0]?.count || 0,
      activeThreads: threadCount[0]?.count || 0
    };
  }

  private getUpcomingDeadlines(milestones: any[]) {
    const now = new Date();
    const upcoming = milestones
      .filter(m => m.dueDate && new Date(m.dueDate) > now && m.status !== 'completed')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 5);

    return upcoming.map(m => ({
      milestoneId: m.id,
      title: m.title,
      dueDate: new Date(m.dueDate),
      status: m.status
    }));
  }
}

export const projectManagementService = new ProjectManagementService();