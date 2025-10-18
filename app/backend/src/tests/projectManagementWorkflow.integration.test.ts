import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { projectManagementService } from '../services/projectManagementService';
import { db } from '../db/index';

// This test simulates a complete project management workflow
describe('Project Management Workflow Integration', () => {
  const mockUserId = 'user-123';
  const mockClientId = 'client-456';
  const mockBookingId = 'booking-789';
  const mockMilestoneId = 'milestone-101';

  // Mock database responses for a complete workflow
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock booking exists and user has access
    (db.select as any).mockImplementation(() => ({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockImplementation((limit) => {
        if (limit === 1) {
          return Promise.resolve([{
            id: mockBookingId,
            providerId: mockUserId,
            clientId: mockClientId,
            status: 'in_progress'
          }]);
        }
        return Promise.resolve([]);
      })
    }));

    // Mock insert operations
    (db.insert as any).mockImplementation(() => ({
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockImplementation(() => {
        return Promise.resolve([{
          id: 'generated-id',
          createdAt: new Date().toISOString()
        }]);
      })
    }));

    // Mock update operations
    (db.update as any).mockImplementation(() => ({
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockImplementation(() => {
        return Promise.resolve([{
          id: 'updated-id',
          updatedAt: new Date().toISOString()
        }]);
      })
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should complete a full project workflow', async () => {
    // 1. Provider starts time tracking
    const timeTrackingRequest = {
      bookingId: mockBookingId,
      description: 'Working on project setup',
      hourlyRate: '75.00'
    };

    const timeTracking = await projectManagementService.startTimeTracking(mockUserId, timeTrackingRequest);
    expect(timeTracking).toBeDefined();

    // 2. Provider creates a deliverable
    const deliverableRequest = {
      bookingId: mockBookingId,
      title: 'Project Setup Documentation',
      description: 'Initial project setup and configuration',
      deliverableType: 'file' as const,
      fileHash: 'QmTest123',
      fileName: 'setup-docs.pdf'
    };

    const deliverable = await projectManagementService.createDeliverable(mockUserId, deliverableRequest);
    expect(deliverable).toBeDefined();

    // 3. Provider uploads project files
    const fileRequest = {
      bookingId: mockBookingId,
      fileName: 'project-files.zip',
      fileHash: 'QmFiles456',
      fileSize: 2048000,
      fileType: 'application/zip'
    };

    const projectFile = await projectManagementService.uploadProjectFile(mockUserId, fileRequest);
    expect(projectFile).toBeDefined();

    // 4. Provider creates a communication thread
    const threadRequest = {
      bookingId: mockBookingId,
      threadType: 'general' as const,
      title: 'Project Progress Discussion'
    };

    const thread = await projectManagementService.createProjectThread(mockUserId, threadRequest);
    expect(thread).toBeDefined();

    // 5. Provider sends a message
    const messageRequest = {
      threadId: 'thread-123',
      content: 'I have completed the initial setup. Please review the deliverables.'
    };

    // Mock thread access check
    (db.select as any).mockImplementationOnce(() => ({
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{
        project_threads: { id: 'thread-123', bookingId: mockBookingId },
        service_bookings: { id: mockBookingId, providerId: mockUserId, clientId: mockClientId }
      }])
    }));

    const message = await projectManagementService.sendProjectMessage(mockUserId, messageRequest);
    expect(message).toBeDefined();

    // 6. Client creates approval request
    const approvalRequest = {
      bookingId: mockBookingId,
      approvalType: 'deliverable' as const
    };

    // Mock client access
    (db.select as any).mockImplementationOnce(() => ({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{
        id: mockBookingId,
        clientId: mockClientId,
        providerId: mockUserId
      }])
    }));

    const approval = await projectManagementService.createApproval(mockClientId, approvalRequest);
    expect(approval).toBeDefined();

    // 7. Client processes approval
    const processApprovalRequest = {
      approvalId: 'approval-123',
      status: 'approved' as const,
      feedback: 'Great work! The deliverables look excellent.'
    };

    // Mock approval access check
    (db.select as any).mockImplementationOnce(() => ({
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{
        project_approvals: { id: 'approval-123', bookingId: mockBookingId },
        service_bookings: { id: mockBookingId, clientId: mockClientId, providerId: mockUserId }
      }])
    }));

    const processedApproval = await projectManagementService.processApproval(mockClientId, processApprovalRequest);
    expect(processedApproval).toBeDefined();

    // 8. Client creates milestone payment
    const paymentRequest = {
      milestoneId: mockMilestoneId,
      amount: '500.00',
      currency: 'USD',
      paymentMethod: 'crypto' as const
    };

    // Mock milestone access check
    (db.select as any).mockImplementationOnce(() => ({
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{
        service_milestones: { id: mockMilestoneId, bookingId: mockBookingId },
        service_bookings: { id: mockBookingId, clientId: mockClientId, providerId: mockUserId }
      }])
    }));

    const payment = await projectManagementService.createMilestonePayment(mockClientId, paymentRequest);
    expect(payment).toBeDefined();

    // 9. Provider stops time tracking
    const stopTrackingRequest = {
      timeTrackingId: 'tracking-123',
      description: 'Completed project setup phase'
    };

    // Mock time tracking session
    (db.select as any).mockImplementationOnce(() => ({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{
        id: 'tracking-123',
        providerId: mockUserId,
        bookingId: mockBookingId,
        startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        hourlyRate: '75.00',
        isBillable: true,
        status: 'active'
      }])
    }));

    const stoppedTracking = await projectManagementService.stopTimeTracking(mockUserId, stopTrackingRequest);
    expect(stoppedTracking).toBeDefined();

    // Verify all operations completed successfully
    expect(timeTracking).toBeDefined();
    expect(deliverable).toBeDefined();
    expect(projectFile).toBeDefined();
    expect(thread).toBeDefined();
    expect(message).toBeDefined();
    expect(approval).toBeDefined();
    expect(processedApproval).toBeDefined();
    expect(payment).toBeDefined();
    expect(stoppedTracking).toBeDefined();
  });

  it('should handle milestone-based project workflow', async () => {
    // 1. Create milestone-specific deliverable
    const milestoneDeliverable = {
      bookingId: mockBookingId,
      milestoneId: mockMilestoneId,
      title: 'Milestone 1 Deliverable',
      description: 'First phase completion',
      deliverableType: 'text' as const,
      content: 'Milestone 1 has been completed successfully.'
    };

    const deliverable = await projectManagementService.createDeliverable(mockUserId, milestoneDeliverable);
    expect(deliverable).toBeDefined();

    // 2. Create milestone-specific thread
    const milestoneThread = {
      bookingId: mockBookingId,
      milestoneId: mockMilestoneId,
      threadType: 'milestone' as const,
      title: 'Milestone 1 Discussion'
    };

    const thread = await projectManagementService.createProjectThread(mockUserId, milestoneThread);
    expect(thread).toBeDefined();

    // 3. Track time for specific milestone
    const milestoneTimeTracking = {
      bookingId: mockBookingId,
      milestoneId: mockMilestoneId,
      description: 'Working on milestone 1 tasks',
      hourlyRate: '80.00'
    };

    const timeTracking = await projectManagementService.startTimeTracking(mockUserId, milestoneTimeTracking);
    expect(timeTracking).toBeDefined();

    // 4. Upload milestone-specific files
    const milestoneFile = {
      bookingId: mockBookingId,
      milestoneId: mockMilestoneId,
      fileName: 'milestone1-output.pdf',
      fileHash: 'QmMilestone1',
      fileSize: 1024000,
      fileType: 'application/pdf'
    };

    const file = await projectManagementService.uploadProjectFile(mockUserId, milestoneFile);
    expect(file).toBeDefined();

    // 5. Create milestone approval
    const milestoneApproval = {
      bookingId: mockBookingId,
      milestoneId: mockMilestoneId,
      approvalType: 'milestone' as const
    };

    // Mock client access
    (db.select as any).mockImplementationOnce(() => ({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{
        id: mockBookingId,
        clientId: mockClientId,
        providerId: mockUserId
      }])
    }));

    const approval = await projectManagementService.createApproval(mockClientId, milestoneApproval);
    expect(approval).toBeDefined();

    // Verify milestone-specific workflow
    expect(deliverable).toBeDefined();
    expect(thread).toBeDefined();
    expect(timeTracking).toBeDefined();
    expect(file).toBeDefined();
    expect(approval).toBeDefined();
  });

  it('should handle error scenarios gracefully', async () => {
    // Test unauthorized access
    (db.select as any).mockImplementationOnce(() => ({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]) // No booking found
    }));

    await expect(
      projectManagementService.startTimeTracking('unauthorized-user', {
        bookingId: mockBookingId,
        description: 'Unauthorized work'
      })
    ).rejects.toThrow('Unauthorized');

    // Test duplicate active session
    (db.select as any)
      .mockImplementationOnce(() => ({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{
          id: mockBookingId,
          providerId: mockUserId,
          clientId: mockClientId
        }])
      }))
      .mockImplementationOnce(() => ({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{
          id: 'active-session',
          providerId: mockUserId,
          status: 'active'
        }])
      }));

    await expect(
      projectManagementService.startTimeTracking(mockUserId, {
        bookingId: mockBookingId,
        description: 'Duplicate session'
      })
    ).rejects.toThrow('already have an active time tracking session');

    // Test missing milestone for payment
    (db.select as any).mockImplementationOnce(() => ({
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]) // No milestone found
    }));

    await expect(
      projectManagementService.createMilestonePayment(mockClientId, {
        milestoneId: 'non-existent-milestone',
        amount: '100.00',
        currency: 'USD',
        paymentMethod: 'crypto'
      })
    ).rejects.toThrow('Milestone not found');
  });

  it('should calculate project metrics correctly', async () => {
    // Mock time tracking records for metrics calculation
    const mockTimeRecords = [
      {
        id: 'time-1',
        durationMinutes: 120, // 2 hours
        isBillable: true,
        totalAmount: '150.00',
        startTime: new Date().toISOString()
      },
      {
        id: 'time-2',
        durationMinutes: 90, // 1.5 hours
        isBillable: true,
        totalAmount: '112.50',
        startTime: new Date().toISOString()
      },
      {
        id: 'time-3',
        durationMinutes: 60, // 1 hour
        isBillable: false,
        totalAmount: '0.00',
        startTime: new Date().toISOString()
      }
    ];

    const mockDeliverables = [
      { id: 'del-1', status: 'approved' },
      { id: 'del-2', status: 'submitted' },
      { id: 'del-3', status: 'pending' }
    ];

    // Mock dashboard data retrieval
    (db.select as any)
      .mockImplementationOnce(() => ({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{
          id: mockBookingId,
          providerId: mockUserId,
          clientId: mockClientId,
          status: 'in_progress'
        }])
      }))
      .mockImplementation(() => ({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue([])
      }));

    // Mock service methods to return test data
    vi.spyOn(projectManagementService, 'getTimeTrackingByBooking').mockResolvedValue(mockTimeRecords as any);
    vi.spyOn(projectManagementService, 'getDeliverablesByBooking').mockResolvedValue(mockDeliverables as any);
    vi.spyOn(projectManagementService, 'getProjectThreads').mockResolvedValue([]);
    vi.spyOn(projectManagementService, 'getProjectFiles').mockResolvedValue([]);

    const dashboard = await projectManagementService.getProjectDashboard(mockBookingId, mockUserId);

    // Verify calculated metrics
    expect(dashboard.timeTrackingSummary.totalHours).toBe(4.5); // 270 minutes / 60
    expect(dashboard.timeTrackingSummary.billableHours).toBe(3.5); // 210 minutes / 60
    expect(dashboard.timeTrackingSummary.totalAmount).toBe('262.50'); // 150 + 112.50 + 0
    
    expect(dashboard.deliverablesSummary.total).toBe(3);
    expect(dashboard.deliverablesSummary.approved).toBe(1);
    expect(dashboard.deliverablesSummary.submitted).toBe(1);
    expect(dashboard.deliverablesSummary.pending).toBe(1);
  });
});