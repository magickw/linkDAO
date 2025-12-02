import { DataExportController } from '../controllers/dataExportController';
import { dataExportService } from '../services/dataExportService';
import { Request, Response } from 'express';

// Mock the data export service
jest.mock('../services/dataExportService', () => ({
  dataExportService: {
    exportUserData: jest.fn(),
    getExportJob: jest.fn(),
    listExportJobs: jest.fn(),
    cancelExportJob: jest.fn(),
    scheduleExport: jest.fn(),
    updateScheduledExport: jest.fn(),
    getScheduledExport: jest.fn(),
    listScheduledExports: jest.fn(),
    deleteScheduledExport: jest.fn(),
    executeScheduledExport: jest.fn()
  }
}));

describe('DataExportController', () => {
  let dataExportController: DataExportController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    dataExportController = new DataExportController();
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnThis();
    
    mockRequest = {};
    mockResponse = {
      json: mockJson,
      status: mockStatus
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('exportUserData', () => {
    it('should export user data successfully', async () => {
      const mockJob = {
        id: 'job123',
        userId: 'user123',
        status: 'pending',
        format: { type: 'json' },
        categories: ['profile'],
        createdAt: new Date()
      };

      (dataExportService.exportUserData as jest.Mock).mockResolvedValue(mockJob);

      mockRequest = {
        body: {
          userId: 'user123',
          categories: ['profile'],
          format: { type: 'json' }
        }
      };

      await dataExportController.exportUserData(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(202);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          jobId: 'job123',
          status: 'pending',
          message: 'Export job started successfully'
        }
      });
    });

    it('should return 400 if required fields are missing', async () => {
      mockRequest = {
        body: {
          userId: 'user123'
          // categories and format are missing
        }
      };

      await dataExportController.exportUserData(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'userId, categories, and format are required'
      });
    });

    it('should handle export errors', async () => {
      (dataExportService.exportUserData as jest.Mock).mockRejectedValue(new Error('Export failed'));

      mockRequest = {
        body: {
          userId: 'user123',
          categories: ['profile'],
          format: { type: 'json' }
        }
      };

      await dataExportController.exportUserData(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Export failed'
      });
    });
  });

  describe('getExportJob', () => {
    it('should get export job successfully', async () => {
      const mockJob = {
        id: 'job123',
        userId: 'user123',
        status: 'completed',
        format: { type: 'json' },
        categories: ['profile'],
        filePath: '/path/to/export.json',
        fileSize: 1024,
        createdAt: new Date(),
        startedAt: new Date(),
        completedAt: new Date()
      };

      (dataExportService.getExportJob as jest.Mock).mockReturnValue(mockJob);

      mockRequest = {
        params: {
          jobId: 'job123'
        }
      };

      await dataExportController.getExportJob(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: mockJob
      });
    });

    it('should return 404 if job not found', async () => {
      (dataExportService.getExportJob as jest.Mock).mockReturnValue(null);

      mockRequest = {
        params: {
          jobId: 'nonexistent'
        }
      };

      await dataExportController.getExportJob(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Export job not found'
      });
    });
  });

  describe('listExportJobs', () => {
    it('should list export jobs successfully', async () => {
      const mockJobs = [
        {
          id: 'job123',
          userId: 'user123',
          status: 'completed',
          format: { type: 'json' },
          categories: ['profile'],
          createdAt: new Date()
        }
      ];

      (dataExportService.listExportJobs as jest.Mock).mockReturnValue(mockJobs);

      mockRequest = {
        query: {}
      };

      await dataExportController.listExportJobs(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: mockJobs,
        total: 1
      });
    });

    it('should filter export jobs by userId and status', async () => {
      const mockJobs = [
        {
          id: 'job123',
          userId: 'user123',
          status: 'completed',
          format: { type: 'json' },
          categories: ['profile'],
          createdAt: new Date()
        }
      ];

      (dataExportService.listExportJobs as jest.Mock).mockReturnValue(mockJobs);

      mockRequest = {
        query: {
          userId: 'user123',
          status: 'completed'
        }
      };

      await dataExportController.listExportJobs(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(dataExportService.listExportJobs).toHaveBeenCalledWith({
        userId: 'user123',
        status: 'completed'
      });
    });
  });

  describe('cancelExportJob', () => {
    it('should cancel export job successfully', async () => {
      (dataExportService.cancelExportJob as jest.Mock).mockReturnValue(true);

      mockRequest = {
        params: {
          jobId: 'job123'
        }
      };

      await dataExportController.cancelExportJob(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Export job cancelled successfully'
      });
    });

    it('should return 400 if job cannot be cancelled', async () => {
      (dataExportService.cancelExportJob as jest.Mock).mockReturnValue(false);

      mockRequest = {
        params: {
          jobId: 'job123'
        }
      };

      await dataExportController.cancelExportJob(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Job cannot be cancelled (not found or not in a cancellable state)'
      });
    });
  });

  describe('scheduleExport', () => {
    it('should schedule export successfully', async () => {
      const mockScheduledExport = {
        id: 'schedule123',
        userId: 'user123',
        name: 'Daily Export',
        schedule: '0 0 * * *',
        format: { type: 'json' },
        categories: ['profile'],
        emailDelivery: false,
        emailRecipients: [],
        archiveExports: false,
        isActive: true,
        nextRun: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (dataExportService.scheduleExport as jest.Mock).mockResolvedValue(mockScheduledExport);

      mockRequest = {
        body: {
          userId: 'user123',
          name: 'Daily Export',
          schedule: '0 0 * * *',
          format: { type: 'json' },
          categories: ['profile']
        }
      };

      await dataExportController.scheduleExport(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: mockScheduledExport,
        message: 'Export scheduled successfully'
      });
    });

    it('should return 400 if required fields are missing', async () => {
      mockRequest = {
        body: {
          userId: 'user123'
          // name, schedule, format, and categories are missing
        }
      };

      await dataExportController.scheduleExport(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'userId, name, schedule, format, and categories are required'
      });
    });
  });

  describe('updateScheduledExport', () => {
    it('should update scheduled export successfully', async () => {
      const mockUpdatedExport = {
        id: 'schedule123',
        userId: 'user123',
        name: 'Weekly Export',
        schedule: '0 0 * * 0',
        format: { type: 'json' },
        categories: ['profile'],
        emailDelivery: true,
        emailRecipients: ['test@example.com'],
        archiveExports: false,
        isActive: true,
        nextRun: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (dataExportService.updateScheduledExport as jest.Mock).mockResolvedValue(mockUpdatedExport);

      mockRequest = {
        params: {
          scheduledExportId: 'schedule123'
        },
        body: {
          name: 'Weekly Export',
          schedule: '0 0 * * 0'
        }
      };

      await dataExportController.updateScheduledExport(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedExport,
        message: 'Scheduled export updated successfully'
      });
    });

    it('should return 400 if scheduledExportId is missing', async () => {
      mockRequest = {
        params: {},
        body: {
          name: 'Updated Export'
        }
      };

      await dataExportController.updateScheduledExport(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'scheduledExportId is required'
      });
    });
  });

  describe('getScheduledExport', () => {
    it('should get scheduled export successfully', async () => {
      const mockScheduledExport = {
        id: 'schedule123',
        userId: 'user123',
        name: 'Daily Export',
        schedule: '0 0 * * *',
        format: { type: 'json' },
        categories: ['profile'],
        emailDelivery: false,
        emailRecipients: [],
        archiveExports: false,
        isActive: true,
        nextRun: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (dataExportService.getScheduledExport as jest.Mock).mockReturnValue(mockScheduledExport);

      mockRequest = {
        params: {
          scheduledExportId: 'schedule123'
        }
      };

      await dataExportController.getScheduledExport(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: mockScheduledExport
      });
    });

    it('should return 404 if scheduled export not found', async () => {
      (dataExportService.getScheduledExport as jest.Mock).mockReturnValue(null);

      mockRequest = {
        params: {
          scheduledExportId: 'nonexistent'
        }
      };

      await dataExportController.getScheduledExport(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Scheduled export not found'
      });
    });
  });

  describe('listScheduledExports', () => {
    it('should list scheduled exports successfully', async () => {
      const mockScheduledExports = [
        {
          id: 'schedule123',
          userId: 'user123',
          name: 'Daily Export',
          schedule: '0 0 * * *',
          format: { type: 'json' },
          categories: ['profile'],
          emailDelivery: false,
          emailRecipients: [],
          archiveExports: false,
          isActive: true,
          nextRun: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      (dataExportService.listScheduledExports as jest.Mock).mockReturnValue(mockScheduledExports);

      mockRequest = {
        query: {}
      };

      await dataExportController.listScheduledExports(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: mockScheduledExports,
        total: 1
      });
    });

    it('should filter scheduled exports by userId and isActive', async () => {
      const mockScheduledExports = [
        {
          id: 'schedule123',
          userId: 'user123',
          name: 'Daily Export',
          schedule: '0 0 * * *',
          format: { type: 'json' },
          categories: ['profile'],
          emailDelivery: false,
          emailRecipients: [],
          archiveExports: false,
          isActive: true,
          nextRun: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      (dataExportService.listScheduledExports as jest.Mock).mockReturnValue(mockScheduledExports);

      mockRequest = {
        query: {
          userId: 'user123',
          isActive: 'true'
        }
      };

      await dataExportController.listScheduledExports(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(dataExportService.listScheduledExports).toHaveBeenCalledWith({
        userId: 'user123',
        isActive: true
      });
    });
  });

  describe('deleteScheduledExport', () => {
    it('should delete scheduled export successfully', async () => {
      (dataExportService.deleteScheduledExport as jest.Mock).mockResolvedValue(true);

      mockRequest = {
        params: {
          scheduledExportId: 'schedule123'
        }
      };

      await dataExportController.deleteScheduledExport(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Scheduled export deleted successfully'
      });
    });

    it('should return 404 if scheduled export not found', async () => {
      (dataExportService.deleteScheduledExport as jest.Mock).mockResolvedValue(false);

      mockRequest = {
        params: {
          scheduledExportId: 'nonexistent'
        }
      };

      await dataExportController.deleteScheduledExport(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Scheduled export not found'
      });
    });
  });

  describe('executeScheduledExport', () => {
    it('should execute scheduled export successfully', async () => {
      const mockJob = {
        id: 'job123',
        userId: 'user123',
        status: 'pending',
        format: { type: 'json' },
        categories: ['profile'],
        createdAt: new Date()
      };

      (dataExportService.executeScheduledExport as jest.Mock).mockResolvedValue(mockJob);

      mockRequest = {
        params: {
          scheduledExportId: 'schedule123'
        }
      };

      await dataExportController.executeScheduledExport(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          jobId: 'job123',
          status: 'pending',
          message: 'Scheduled export executed successfully'
        }
      });
    });

    it('should return 400 if scheduledExportId is missing', async () => {
      mockRequest = {
        params: {}
      };

      await dataExportController.executeScheduledExport(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'scheduledExportId is required'
      });
    });
  });

  describe('downloadExport', () => {
    it('should prepare export download successfully', async () => {
      const mockJob = {
        id: 'job123',
        userId: 'user123',
        status: 'completed',
        format: { type: 'json' },
        categories: ['profile'],
        filePath: '/path/to/export.json',
        fileSize: 1024,
        createdAt: new Date(),
        startedAt: new Date(),
        completedAt: new Date()
      };

      (dataExportService.getExportJob as jest.Mock).mockReturnValue(mockJob);

      mockRequest = {
        params: {
          jobId: 'job123'
        }
      };

      await dataExportController.downloadExport(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          filePath: '/path/to/export.json',
          fileSize: 1024,
          format: 'json'
        },
        message: 'Export file ready for download'
      });
    });

    it('should return 400 if job is not completed', async () => {
      const mockJob = {
        id: 'job123',
        userId: 'user123',
        status: 'pending',
        format: { type: 'json' },
        categories: ['profile'],
        createdAt: new Date()
      };

      (dataExportService.getExportJob as jest.Mock).mockReturnValue(mockJob);

      mockRequest = {
        params: {
          jobId: 'job123'
        }
      };

      await dataExportController.downloadExport(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Export job is not completed yet'
      });
    });
  });
});