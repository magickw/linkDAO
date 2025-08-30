import { projectManagementService } from '../services/projectManagementService';

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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Time Tracking', () => {
    it('should be defined', () => {
      expect(projectManagementService).toBeDefined();
      expect(projectManagementService.startTimeTracking).toBeDefined();
      expect(projectManagementService.stopTimeTracking).toBeDefined();
      expect(projectManagementService.getTimeTrackingByBooking).toBeDefined();
      expect(projectManagementService.getActiveTimeTracking).toBeDefined();
    });
  });

  describe('Deliverables', () => {
    it('should have deliverable methods', () => {
      expect(projectManagementService.createDeliverable).toBeDefined();
      expect(projectManagementService.updateDeliverable).toBeDefined();
      expect(projectManagementService.getDeliverablesByBooking).toBeDefined();
    });
  });

  describe('Communication', () => {
    it('should have communication methods', () => {
      expect(projectManagementService.createProjectThread).toBeDefined();
      expect(projectManagementService.sendProjectMessage).toBeDefined();
      expect(projectManagementService.getProjectThreads).toBeDefined();
      expect(projectManagementService.getProjectMessages).toBeDefined();
    });
  });

  describe('Milestone Payments', () => {
    it('should have payment methods', () => {
      expect(projectManagementService.createMilestonePayment).toBeDefined();
      expect(projectManagementService.processMilestonePayment).toBeDefined();
    });
  });

  describe('Approvals', () => {
    it('should have approval methods', () => {
      expect(projectManagementService.createApproval).toBeDefined();
      expect(projectManagementService.processApproval).toBeDefined();
    });
  });

  describe('File Management', () => {
    it('should have file management methods', () => {
      expect(projectManagementService.uploadProjectFile).toBeDefined();
      expect(projectManagementService.getProjectFiles).toBeDefined();
    });
  });

  describe('Dashboard', () => {
    it('should have dashboard method', () => {
      expect(projectManagementService.getProjectDashboard).toBeDefined();
    });
  });
});