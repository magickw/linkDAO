import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import projectManagementRoutes from '../routes/projectManagementRoutes';
import { projectManagementService } from '../services/projectManagementService';

// Mock the service
vi.mock('../services/projectManagementService.js', () => ({
  projectManagementService: {
    startTimeTracking: vi.fn(),
    stopTimeTracking: vi.fn(),
    getTimeTrackingByBooking: vi.fn(),
    getActiveTimeTracking: vi.fn(),
    createDeliverable: vi.fn(),
    updateDeliverable: vi.fn(),
    getDeliverablesByBooking: vi.fn(),
    createMilestonePayment: vi.fn(),
    processMilestonePayment: vi.fn(),
    createProjectThread: vi.fn(),
    sendProjectMessage: vi.fn(),
    getProjectThreads: vi.fn(),
    getProjectMessages: vi.fn(),
    createApproval: vi.fn(),
    processApproval: vi.fn(),
    uploadProjectFile: vi.fn(),
    getProjectFiles: vi.fn(),
    getProjectDashboard: vi.fn()
  }
}));

// Mock auth middleware
vi.mock('../middleware/authMiddleware.js', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user-123' };
    next();
  }
}));

describe('ProjectManagementController Integration Tests', () => {
  let app: express.Application;
  const mockUserId = 'test-user-123';
  const mockBookingId = 'booking-123';
  const mockMilestoneId = 'milestone-123';

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/project-management', projectManagementRoutes);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Time Tracking Endpoints', () => {
    describe('POST /api/project-management/time-tracking/start', () => {
      it('should start time tracking successfully', async () => {
        const mockTimeTracking = {
          id: 'tracking-123',
          bookingId: mockBookingId,
          providerId: mockUserId,
          startTime: new Date().toISOString(),
          status: 'active'
        };

        (projectManagementService.startTimeTracking as any).mockResolvedValue(mockTimeTracking);

        const response = await request(app)
          .post('/api/project-management/time-tracking/start')
          .send({
            bookingId: mockBookingId,
            description: 'Working on feature',
            hourlyRate: '50.00'
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockTimeTracking);
        expect(projectManagementService.startTimeTracking).toHaveBeenCalledWith(
          mockUserId,
          {
            bookingId: mockBookingId,
            description: 'Working on feature',
            hourlyRate: '50.00'
          }
        );
      });

      it('should return 400 for invalid booking ID', async () => {
        const response = await request(app)
          .post('/api/project-management/time-tracking/start')
          .send({
            bookingId: 'invalid-id',
            description: 'Working on feature'
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      it('should return 400 when service throws error', async () => {
        (projectManagementService.startTimeTracking as any).mockRejectedValue(
          new Error('Already have active session')
        );

        const response = await request(app)
          .post('/api/project-management/time-tracking/start')
          .send({
            bookingId: mockBookingId,
            description: 'Working on feature'
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Already have active session');
      });
    });

    describe('POST /api/project-management/time-tracking/stop', () => {
      it('should stop time tracking successfully', async () => {
        const mockTimeTracking = {
          id: 'tracking-123',
          status: 'completed',
          durationMinutes: 120,
          totalAmount: '100.00000000'
        };

        (projectManagementService.stopTimeTracking as any).mockResolvedValue(mockTimeTracking);

        const response = await request(app)
          .post('/api/project-management/time-tracking/stop')
          .send({
            timeTrackingId: 'tracking-123',
            description: 'Completed feature work'
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockTimeTracking);
      });
    });

    describe('GET /api/project-management/time-tracking/active', () => {
      it('should get active time tracking', async () => {
        const mockActiveTracking = {
          id: 'tracking-123',
          status: 'active',
          startTime: new Date().toISOString()
        };

        (projectManagementService.getActiveTimeTracking as any).mockResolvedValue(mockActiveTracking);

        const response = await request(app)
          .get('/api/project-management/time-tracking/active');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockActiveTracking);
      });

      it('should return null when no active tracking', async () => {
        (projectManagementService.getActiveTimeTracking as any).mockResolvedValue(null);

        const response = await request(app)
          .get('/api/project-management/time-tracking/active');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeNull();
      });
    });
  });

  describe('Deliverables Endpoints', () => {
    describe('POST /api/project-management/deliverables', () => {
      it('should create deliverable successfully', async () => {
        const mockDeliverable = {
          id: 'deliverable-123',
          bookingId: mockBookingId,
          title: 'Test Deliverable',
          deliverableType: 'file',
          status: 'pending'
        };

        (projectManagementService.createDeliverable as any).mockResolvedValue(mockDeliverable);

        const response = await request(app)
          .post('/api/project-management/deliverables')
          .send({
            bookingId: mockBookingId,
            title: 'Test Deliverable',
            deliverableType: 'file',
            description: 'Test description'
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockDeliverable);
      });

      it('should return 400 for invalid deliverable type', async () => {
        const response = await request(app)
          .post('/api/project-management/deliverables')
          .send({
            bookingId: mockBookingId,
            title: 'Test Deliverable',
            deliverableType: 'invalid-type'
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });

    describe('PUT /api/project-management/deliverables/:deliverableId', () => {
      it('should update deliverable successfully', async () => {
        const mockUpdatedDeliverable = {
          id: 'deliverable-123',
          title: 'Updated Deliverable',
          status: 'in_progress'
        };

        (projectManagementService.updateDeliverable as any).mockResolvedValue(mockUpdatedDeliverable);

        const response = await request(app)
          .put('/api/project-management/deliverables/deliverable-123')
          .send({
            title: 'Updated Deliverable',
            status: 'in_progress'
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockUpdatedDeliverable);
      });
    });
  });

  describe('Communication Endpoints', () => {
    describe('POST /api/project-management/threads', () => {
      it('should create project thread successfully', async () => {
        const mockThread = {
          id: 'thread-123',
          bookingId: mockBookingId,
          threadType: 'general',
          title: 'Project Discussion',
          createdBy: mockUserId
        };

        (projectManagementService.createProjectThread as any).mockResolvedValue(mockThread);

        const response = await request(app)
          .post('/api/project-management/threads')
          .send({
            bookingId: mockBookingId,
            threadType: 'general',
            title: 'Project Discussion'
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockThread);
      });

      it('should return 400 for invalid thread type', async () => {
        const response = await request(app)
          .post('/api/project-management/threads')
          .send({
            bookingId: mockBookingId,
            threadType: 'invalid-type',
            title: 'Project Discussion'
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });

    describe('POST /api/project-management/messages', () => {
      it('should send project message successfully', async () => {
        const mockMessage = {
          id: 'message-123',
          threadId: 'thread-123',
          senderId: mockUserId,
          content: 'Hello, how is the project going?',
          messageType: 'text'
        };

        (projectManagementService.sendProjectMessage as any).mockResolvedValue(mockMessage);

        const response = await request(app)
          .post('/api/project-management/messages')
          .send({
            threadId: 'thread-123',
            content: 'Hello, how is the project going?'
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockMessage);
      });
    });

    describe('GET /api/project-management/messages/thread/:threadId', () => {
      it('should get project messages successfully', async () => {
        const mockMessages = [
          {
            id: 'message-1',
            content: 'First message',
            createdAt: new Date().toISOString()
          },
          {
            id: 'message-2',
            content: 'Second message',
            createdAt: new Date().toISOString()
          }
        ];

        (projectManagementService.getProjectMessages as any).mockResolvedValue(mockMessages);

        const response = await request(app)
          .get('/api/project-management/messages/thread/thread-123')
          .query({ limit: 10, offset: 0 });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockMessages);
        expect(projectManagementService.getProjectMessages).toHaveBeenCalledWith(
          'thread-123',
          10,
          0
        );
      });
    });
  });

  describe('Milestone Payments Endpoints', () => {
    describe('POST /api/project-management/milestone-payments', () => {
      it('should create milestone payment successfully', async () => {
        const mockPayment = {
          id: 'payment-123',
          milestoneId: mockMilestoneId,
          amount: '100.00',
          currency: 'USD',
          paymentMethod: 'crypto',
          status: 'pending'
        };

        (projectManagementService.createMilestonePayment as any).mockResolvedValue(mockPayment);

        const response = await request(app)
          .post('/api/project-management/milestone-payments')
          .send({
            milestoneId: mockMilestoneId,
            amount: '100.00',
            currency: 'USD',
            paymentMethod: 'crypto'
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockPayment);
      });

      it('should return 400 for invalid payment method', async () => {
        const response = await request(app)
          .post('/api/project-management/milestone-payments')
          .send({
            milestoneId: mockMilestoneId,
            amount: '100.00',
            currency: 'USD',
            paymentMethod: 'invalid-method'
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('Approvals Endpoints', () => {
    describe('POST /api/project-management/approvals', () => {
      it('should create approval successfully', async () => {
        const mockApproval = {
          id: 'approval-123',
          bookingId: mockBookingId,
          approvalType: 'milestone',
          status: 'pending'
        };

        (projectManagementService.createApproval as any).mockResolvedValue(mockApproval);

        const response = await request(app)
          .post('/api/project-management/approvals')
          .send({
            bookingId: mockBookingId,
            approvalType: 'milestone'
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockApproval);
      });
    });

    describe('PUT /api/project-management/approvals/:approvalId/process', () => {
      it('should process approval successfully', async () => {
        const mockProcessedApproval = {
          id: 'approval-123',
          status: 'approved',
          feedback: 'Looks good!',
          approvedAt: new Date().toISOString()
        };

        (projectManagementService.processApproval as any).mockResolvedValue(mockProcessedApproval);

        const response = await request(app)
          .put('/api/project-management/approvals/approval-123/process')
          .send({
            status: 'approved',
            feedback: 'Looks good!'
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockProcessedApproval);
      });
    });
  });

  describe('File Management Endpoints', () => {
    describe('POST /api/project-management/files', () => {
      it('should upload project file successfully', async () => {
        const mockFile = {
          id: 'file-123',
          bookingId: mockBookingId,
          fileName: 'document.pdf',
          fileHash: 'hash123',
          fileSize: 1024,
          fileType: 'application/pdf',
          versionNumber: 1
        };

        (projectManagementService.uploadProjectFile as any).mockResolvedValue(mockFile);

        const response = await request(app)
          .post('/api/project-management/files')
          .send({
            bookingId: mockBookingId,
            fileName: 'document.pdf',
            fileHash: 'hash123',
            fileSize: 1024,
            fileType: 'application/pdf'
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockFile);
      });

      it('should return 400 for missing required fields', async () => {
        const response = await request(app)
          .post('/api/project-management/files')
          .send({
            bookingId: mockBookingId,
            fileName: 'document.pdf'
            // Missing fileHash, fileSize, fileType
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/project-management/files/booking/:bookingId', () => {
      it('should get project files successfully', async () => {
        const mockFiles = [
          {
            id: 'file-1',
            fileName: 'document1.pdf',
            versionNumber: 1
          },
          {
            id: 'file-2',
            fileName: 'document2.pdf',
            versionNumber: 1
          }
        ];

        (projectManagementService.getProjectFiles as any).mockResolvedValue(mockFiles);

        const response = await request(app)
          .get(`/api/project-management/files/booking/${mockBookingId}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockFiles);
      });
    });
  });

  describe('Dashboard Endpoint', () => {
    describe('GET /api/project-management/dashboard/:bookingId', () => {
      it('should get project dashboard successfully', async () => {
        const mockDashboard = {
          booking: {
            id: mockBookingId,
            status: 'in_progress',
            totalTimeTracked: 10.5,
            completedDeliverables: 3
          },
          milestones: [
            {
              id: mockMilestoneId,
              title: 'Phase 1',
              status: 'completed'
            }
          ],
          recentActivities: [
            {
              id: 'activity-1',
              activityType: 'deliverable_created',
              description: 'New deliverable created'
            }
          ],
          timeTrackingSummary: {
            totalHours: 10.5,
            billableHours: 8.0,
            totalAmount: '400.00000000',
            thisWeekHours: 5.5
          },
          deliverablesSummary: {
            total: 5,
            pending: 1,
            inProgress: 1,
            submitted: 1,
            approved: 2
          },
          communicationSummary: {
            totalMessages: 15,
            unreadMessages: 2,
            activeThreads: 3
          },
          upcomingDeadlines: [
            {
              milestoneId: 'milestone-2',
              title: 'Phase 2',
              dueDate: new Date(),
              status: 'in_progress'
            }
          ]
        };

        (projectManagementService.getProjectDashboard as any).mockResolvedValue(mockDashboard);

        const response = await request(app)
          .get(`/api/project-management/dashboard/${mockBookingId}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockDashboard);
        expect(projectManagementService.getProjectDashboard).toHaveBeenCalledWith(
          mockBookingId,
          mockUserId
        );
      });
    });
  });
});
