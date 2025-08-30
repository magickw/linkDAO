import { projectManagementService } from '../services/projectManagementService';
import { db } from '../db/index';

// Mock the database
jest.mock('../db/index', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
}));

describe('ProjectManagementService', () => {
  const mockUserId = 'user-123';
  const mockBookingId = 'booking-123';
  const mockMilestoneId = 'milestone-123';
  const mockTimeTrackingId = 'tracking-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Time Tracking', () => {
    describe('startTimeTracking', () => {
      it('should start time tracking successfully', async () => {
        const mockBooking = {
          id: mockBookingId,
          providerId: mockUserId,
          clientId: 'client-123'
        };

        const mockTimeTracking = {
          id: mockTimeTrackingId,
          bookingId: mockBookingId,
          providerId: mockUserId,
          startTime: new Date().toISOString(),
          status: 'active'
        };

        // Mock database calls
        (db.select as any).mockReturnValueOnce({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([mockBooking])
        });

        (db.select as any).mockReturnValueOnce({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([]) // No active sessions
        });

        (db.insert as any).mockReturnValueOnce({
          values: jest.fn().mockReturnThis(),
          returning: jest.fn().mockResolvedValue([mockTimeTracking])
        });

        (db.insert as any).mockReturnValueOnce({
          values: jest.fn().mockResolvedValue(undefined) // Activity log
        });

        const request = {
          bookingId: mockBookingId,
          description: 'Working on feature',
          hourlyRate: '50.00'
        };

        const result = await projectManagementService.startTimeTracking(mockUserId, request);

        expect(result).toEqual(mockTimeTracking);
      });

      it('should throw error if user is not the provider', async () => {
        const mockBooking = {
          id: mockBookingId,
          providerId: 'other-user',
          clientId: 'client-123'
        };

        (db.select as any).mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([mockBooking])
        });

        const request = {
          bookingId: mockBookingId,
          description: 'Working on feature'
        };

        await expect(
          projectManagementService.startTimeTracking(mockUserId, request)
        ).rejects.toThrow('Unauthorized: Only the service provider can track time');
      });

      it('should throw error if there is already an active session', async () => {
        const mockBooking = {
          id: mockBookingId,
          providerId: mockUserId,
          clientId: 'client-123'
        };

        const mockActiveSession = {
          id: 'active-123',
          providerId: mockUserId,
          status: 'active'
        };

        (db.select as any).mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([mockBooking])
        });

        (db.select as any).mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([mockActiveSession])
        });

        const request = {
          bookingId: mockBookingId,
          description: 'Working on feature'
        };

        await expect(
          projectManagementService.startTimeTracking(mockUserId, request)
        ).rejects.toThrow('You already have an active time tracking session. Please stop it first.');
      });
    });

    describe('stopTimeTracking', () => {
      it('should stop time tracking and calculate duration', async () => {
        const startTime = new Date();
        startTime.setHours(startTime.getHours() - 2); // 2 hours ago

        const mockSession = {
          id: mockTimeTrackingId,
          providerId: mockUserId,
          bookingId: mockBookingId,
          startTime: startTime.toISOString(),
          hourlyRate: '50.00',
          isBillable: true,
          status: 'active'
        };

        const mockUpdatedSession = {
          ...mockSession,
          endTime: new Date().toISOString(),
          durationMinutes: 120,
          totalAmount: '100.00000000',
          status: 'completed'
        };

        (db.select as any).mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([mockSession])
        });

        (db.update as any).mockReturnValueOnce({
          set: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([mockUpdatedSession])
        });

        (db.insert as any).mockReturnValueOnce({
          values: vi.fn().mockResolvedValue(undefined) // Activity log
        });

        const request = {
          timeTrackingId: mockTimeTrackingId,
          description: 'Completed feature work'
        };

        const result = await projectManagementService.stopTimeTracking(mockUserId, request);

        expect(result.status).toBe('completed');
        expect(result.durationMinutes).toBeGreaterThan(0);
      });

      it('should throw error if session not found', async () => {
        (db.select as any).mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([])
        });

        const request = {
          timeTrackingId: mockTimeTrackingId
        };

        await expect(
          projectManagementService.stopTimeTracking(mockUserId, request)
        ).rejects.toThrow('Time tracking session not found or already stopped');
      });
    });
  });

  describe('Deliverables', () => {
    describe('createDeliverable', () => {
      it('should create deliverable successfully', async () => {
        const mockBooking = {
          id: mockBookingId,
          providerId: mockUserId,
          clientId: 'client-123'
        };

        const mockDeliverable = {
          id: 'deliverable-123',
          bookingId: mockBookingId,
          title: 'Test Deliverable',
          deliverableType: 'file',
          status: 'pending'
        };

        (db.select as any).mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([mockBooking])
        });

        (db.insert as any).mockReturnValueOnce({
          values: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([mockDeliverable])
        });

        (db.insert as any).mockReturnValueOnce({
          values: vi.fn().mockResolvedValue(undefined) // Activity log
        });

        const request = {
          bookingId: mockBookingId,
          title: 'Test Deliverable',
          deliverableType: 'file' as const,
          description: 'Test description'
        };

        const result = await projectManagementService.createDeliverable(mockUserId, request);

        expect(result).toEqual(mockDeliverable);
      });

      it('should throw error if user has no access to booking', async () => {
        (db.select as any).mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([])
        });

        const request = {
          bookingId: mockBookingId,
          title: 'Test Deliverable',
          deliverableType: 'file' as const
        };

        await expect(
          projectManagementService.createDeliverable(mockUserId, request)
        ).rejects.toThrow('Unauthorized: Access denied to this booking');
      });
    });
  });

  describe('Milestone Payments', () => {
    describe('createMilestonePayment', () => {
      it('should create milestone payment successfully', async () => {
        const mockMilestone = {
          service_milestones: {
            id: mockMilestoneId,
            bookingId: mockBookingId
          },
          service_bookings: {
            id: mockBookingId,
            clientId: mockUserId,
            providerId: 'provider-123'
          }
        };

        const mockPayment = {
          id: 'payment-123',
          milestoneId: mockMilestoneId,
          bookingId: mockBookingId,
          amount: '100.00',
          currency: 'USD',
          paymentMethod: 'crypto',
          status: 'pending'
        };

        (db.select as any).mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          innerJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([mockMilestone])
        });

        (db.insert as any).mockReturnValueOnce({
          values: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([mockPayment])
        });

        (db.insert as any).mockReturnValueOnce({
          values: vi.fn().mockResolvedValue(undefined) // Activity log
        });

        const request = {
          milestoneId: mockMilestoneId,
          amount: '100.00',
          currency: 'USD',
          paymentMethod: 'crypto' as const
        };

        const result = await projectManagementService.createMilestonePayment(mockUserId, request);

        expect(result).toEqual(mockPayment);
      });

      it('should throw error if user is not the client', async () => {
        const mockMilestone = {
          service_milestones: {
            id: mockMilestoneId,
            bookingId: mockBookingId
          },
          service_bookings: {
            id: mockBookingId,
            clientId: 'other-user',
            providerId: 'provider-123'
          }
        };

        (db.select as any).mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          innerJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([mockMilestone])
        });

        const request = {
          milestoneId: mockMilestoneId,
          amount: '100.00',
          currency: 'USD',
          paymentMethod: 'crypto' as const
        };

        await expect(
          projectManagementService.createMilestonePayment(mockUserId, request)
        ).rejects.toThrow('Unauthorized: Only the client can create milestone payments');
      });
    });
  });

  describe('Communication', () => {
    describe('createProjectThread', () => {
      it('should create project thread successfully', async () => {
        const mockBooking = {
          id: mockBookingId,
          providerId: 'provider-123',
          clientId: mockUserId
        };

        const mockThread = {
          id: 'thread-123',
          bookingId: mockBookingId,
          threadType: 'general',
          title: 'Project Discussion',
          createdBy: mockUserId
        };

        (db.select as any).mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([mockBooking])
        });

        (db.insert as any).mockReturnValueOnce({
          values: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([mockThread])
        });

        (db.insert as any).mockReturnValueOnce({
          values: vi.fn().mockResolvedValue(undefined) // Activity log
        });

        const request = {
          bookingId: mockBookingId,
          threadType: 'general' as const,
          title: 'Project Discussion'
        };

        const result = await projectManagementService.createProjectThread(mockUserId, request);

        expect(result).toEqual(mockThread);
      });
    });

    describe('sendProjectMessage', () => {
      it('should send project message successfully', async () => {
        const mockThread = {
          project_threads: {
            id: 'thread-123',
            bookingId: mockBookingId,
            milestoneId: null,
            title: 'Project Discussion'
          },
          service_bookings: {
            id: mockBookingId,
            providerId: 'provider-123',
            clientId: mockUserId
          }
        };

        const mockMessage = {
          id: 'message-123',
          threadId: 'thread-123',
          bookingId: mockBookingId,
          senderId: mockUserId,
          content: 'Hello, how is the project going?',
          messageType: 'text'
        };

        (db.select as any).mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          innerJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([mockThread])
        });

        (db.insert as any).mockReturnValueOnce({
          values: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([mockMessage])
        });

        (db.update as any).mockReturnValueOnce({
          set: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue(undefined)
        });

        (db.insert as any).mockReturnValueOnce({
          values: vi.fn().mockResolvedValue(undefined) // Activity log
        });

        const request = {
          threadId: 'thread-123',
          content: 'Hello, how is the project going?'
        };

        const result = await projectManagementService.sendProjectMessage(mockUserId, request);

        expect(result).toEqual(mockMessage);
      });
    });
  });

  describe('Approvals', () => {
    describe('createApproval', () => {
      it('should create approval successfully', async () => {
        const mockBooking = {
          id: mockBookingId,
          clientId: mockUserId,
          providerId: 'provider-123'
        };

        const mockApproval = {
          id: 'approval-123',
          bookingId: mockBookingId,
          approvalType: 'milestone',
          approverId: mockUserId,
          status: 'pending'
        };

        (db.select as any).mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([mockBooking])
        });

        (db.insert as any).mockReturnValueOnce({
          values: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([mockApproval])
        });

        (db.insert as any).mockReturnValueOnce({
          values: vi.fn().mockResolvedValue(undefined) // Activity log
        });

        const request = {
          bookingId: mockBookingId,
          approvalType: 'milestone' as const
        };

        const result = await projectManagementService.createApproval(mockUserId, request);

        expect(result).toEqual(mockApproval);
      });
    });

    describe('processApproval', () => {
      it('should process approval successfully', async () => {
        const mockApproval = {
          project_approvals: {
            id: 'approval-123',
            bookingId: mockBookingId,
            milestoneId: mockMilestoneId,
            approvalType: 'milestone'
          },
          service_bookings: {
            id: mockBookingId,
            clientId: mockUserId,
            providerId: 'provider-123'
          }
        };

        const mockUpdatedApproval = {
          id: 'approval-123',
          status: 'approved',
          feedback: 'Looks good!',
          approvedAt: new Date().toISOString()
        };

        (db.select as any).mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          innerJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([mockApproval])
        });

        (db.update as any).mockReturnValueOnce({
          set: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([mockUpdatedApproval])
        });

        (db.insert as any).mockReturnValueOnce({
          values: vi.fn().mockResolvedValue(undefined) // Activity log
        });

        const request = {
          approvalId: 'approval-123',
          status: 'approved' as const,
          feedback: 'Looks good!'
        };

        const result = await projectManagementService.processApproval(mockUserId, request);

        expect(result).toEqual(mockUpdatedApproval);
      });
    });
  });

  describe('File Management', () => {
    describe('uploadProjectFile', () => {
      it('should upload project file successfully', async () => {
        const mockBooking = {
          id: mockBookingId,
          providerId: mockUserId,
          clientId: 'client-123'
        };

        const mockFile = {
          id: 'file-123',
          bookingId: mockBookingId,
          fileName: 'document.pdf',
          fileHash: 'hash123',
          fileSize: 1024,
          fileType: 'application/pdf',
          versionNumber: 1,
          uploaderId: mockUserId
        };

        (db.select as any).mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([mockBooking])
        });

        (db.select as any).mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockResolvedValue([]) // No existing files
        });

        (db.insert as any).mockReturnValueOnce({
          values: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([mockFile])
        });

        (db.insert as any).mockReturnValueOnce({
          values: vi.fn().mockResolvedValue(undefined) // Activity log
        });

        const request = {
          bookingId: mockBookingId,
          fileName: 'document.pdf',
          fileHash: 'hash123',
          fileSize: 1024,
          fileType: 'application/pdf'
        };

        const result = await projectManagementService.uploadProjectFile(mockUserId, request);

        expect(result).toEqual(mockFile);
      });

      it('should increment version number for existing files', async () => {
        const mockBooking = {
          id: mockBookingId,
          providerId: mockUserId,
          clientId: 'client-123'
        };

        const existingFile = {
          versionNumber: 2
        };

        const mockFile = {
          id: 'file-123',
          bookingId: mockBookingId,
          fileName: 'document.pdf',
          versionNumber: 3,
          uploaderId: mockUserId
        };

        (db.select as any).mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([mockBooking])
        });

        (db.select as any).mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockResolvedValue([existingFile])
        });

        (db.update as any).mockReturnValueOnce({
          set: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue(undefined)
        });

        (db.insert as any).mockReturnValueOnce({
          values: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([mockFile])
        });

        (db.insert as any).mockReturnValueOnce({
          values: vi.fn().mockResolvedValue(undefined) // Activity log
        });

        const request = {
          bookingId: mockBookingId,
          fileName: 'document.pdf',
          fileHash: 'hash123',
          fileSize: 1024,
          fileType: 'application/pdf'
        };

        const result = await projectManagementService.uploadProjectFile(mockUserId, request);

        expect(result.versionNumber).toBe(3);
      });
    });
  });
});