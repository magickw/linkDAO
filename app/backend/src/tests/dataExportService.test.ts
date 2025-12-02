import { DataExportService, ExportFormat } from '../services/dataExportService';

// Mock the email service
jest.mock('../services/emailService', () => ({
  emailService: {
    sendEmail: jest.fn().mockResolvedValue(true)
  }
}));

// Mock file system operations
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn().mockResolvedValue(Buffer.from('test content')),
    stat: jest.fn().mockResolvedValue({ size: 1024 }),
    rename: jest.fn().mockResolvedValue(undefined)
  }
}));

describe('DataExportService', () => {
  let dataExportService: DataExportService;
  const mockUserId = 'user123';
  const mockCategories = ['profile', 'posts'];
  const mockFormat: ExportFormat = { type: 'json' };

  beforeEach(() => {
    dataExportService = DataExportService.getInstance();
    // Clear any existing scheduled exports
    // @ts-ignore - accessing private property for testing
    dataExportService.scheduledExports.clear();
    // @ts-ignore - accessing private property for testing
    dataExportService.exportJobs.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('exportUserData', () => {
    it('should create an export job and generate export file', async () => {
      const request = {
        userId: mockUserId,
        categories: mockCategories,
        format: mockFormat
      };

      const job = await dataExportService.exportUserData(request);

      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
      expect(job.userId).toBe(mockUserId);
      expect(job.status).toBe('completed');
      expect(job.format).toEqual(mockFormat);
      expect(job.categories).toEqual(mockCategories);
      expect(job.filePath).toBeDefined();
      expect(job.fileSize).toBeGreaterThan(0);
    });

    it('should handle export errors gracefully', async () => {
      // Mock fetchUserData to throw an error
      // @ts-ignore - accessing private method for testing
      const originalFetchUserData = dataExportService.fetchUserData;
      // @ts-ignore - accessing private method for testing
      dataExportService.fetchUserData = jest.fn().mockRejectedValue(new Error('Export failed'));

      const request = {
        userId: mockUserId,
        categories: mockCategories,
        format: mockFormat
      };

      await expect(dataExportService.exportUserData(request)).rejects.toThrow('Export failed');

      // Restore original method
      // @ts-ignore - accessing private method for testing
      dataExportService.fetchUserData = originalFetchUserData;
    });
  });

  describe('scheduleExport', () => {
    it('should schedule a new export', async () => {
      const config = {
        userId: mockUserId,
        name: 'Daily Export',
        schedule: '0 0 * * *', // daily at midnight
        format: mockFormat,
        categories: mockCategories,
        emailDelivery: true,
        emailRecipients: ['test@example.com'],
        archiveExports: true,
        isActive: true
      };

      const scheduledExport = await dataExportService.scheduleExport(config);

      expect(scheduledExport).toBeDefined();
      expect(scheduledExport.id).toBeDefined();
      expect(scheduledExport.userId).toBe(mockUserId);
      expect(scheduledExport.name).toBe('Daily Export');
      expect(scheduledExport.schedule).toBe('0 0 * * *');
      expect(scheduledExport.format).toEqual(mockFormat);
      expect(scheduledExport.categories).toEqual(mockCategories);
      expect(scheduledExport.emailDelivery).toBe(true);
      expect(scheduledExport.emailRecipients).toEqual(['test@example.com']);
      expect(scheduledExport.archiveExports).toBe(true);
      expect(scheduledExport.isActive).toBe(true);
      expect(scheduledExport.createdAt).toBeDefined();
      expect(scheduledExport.updatedAt).toBeDefined();
      expect(scheduledExport.nextRun).toBeDefined();
    });
  });

  describe('updateScheduledExport', () => {
    it('should update an existing scheduled export', async () => {
      // First create a scheduled export
      const config = {
        userId: mockUserId,
        name: 'Daily Export',
        schedule: '0 0 * * *',
        format: mockFormat,
        categories: mockCategories,
        emailDelivery: false,
        emailRecipients: [],
        archiveExports: false,
        isActive: true
      };

      const scheduledExport = await dataExportService.scheduleExport(config);
      
      // Update the scheduled export
      const updates = {
        name: 'Weekly Export',
        schedule: '0 0 * * 0', // weekly on Sunday
        emailDelivery: true,
        emailRecipients: ['updated@example.com']
      };

      const updatedExport = await dataExportService.updateScheduledExport(scheduledExport.id, updates);

      expect(updatedExport).toBeDefined();
      expect(updatedExport.id).toBe(scheduledExport.id);
      expect(updatedExport.name).toBe('Weekly Export');
      expect(updatedExport.schedule).toBe('0 0 * * 0');
      expect(updatedExport.emailDelivery).toBe(true);
      expect(updatedExport.emailRecipients).toEqual(['updated@example.com']);
      expect(updatedExport.updatedAt.getTime()).toBeGreaterThan(scheduledExport.updatedAt.getTime());
    });

    it('should throw an error if scheduled export not found', async () => {
      await expect(dataExportService.updateScheduledExport('nonexistent', { name: 'Updated' }))
        .rejects.toThrow('Scheduled export with id nonexistent not found');
    });
  });

  describe('getScheduledExport', () => {
    it('should return a scheduled export by ID', async () => {
      // Create a scheduled export
      const config = {
        userId: mockUserId,
        name: 'Test Export',
        schedule: '0 0 * * *',
        format: mockFormat,
        categories: mockCategories,
        emailDelivery: false,
        emailRecipients: [],
        archiveExports: false,
        isActive: true
      };

      const scheduledExport = await dataExportService.scheduleExport(config);
      
      // Get the scheduled export
      const retrievedExport = dataExportService.getScheduledExport(scheduledExport.id);

      expect(retrievedExport).toBeDefined();
      expect(retrievedExport?.id).toBe(scheduledExport.id);
      expect(retrievedExport?.name).toBe('Test Export');
    });

    it('should return null if scheduled export not found', () => {
      const retrievedExport = dataExportService.getScheduledExport('nonexistent');
      expect(retrievedExport).toBeNull();
    });
  });

  describe('listScheduledExports', () => {
    it('should list all scheduled exports', async () => {
      // Create multiple scheduled exports
      await dataExportService.scheduleExport({
        userId: mockUserId,
        name: 'Export 1',
        schedule: '0 0 * * *',
        format: mockFormat,
        categories: mockCategories,
        emailDelivery: false,
        emailRecipients: [],
        archiveExports: false,
        isActive: true
      });

      await dataExportService.scheduleExport({
        userId: 'user456',
        name: 'Export 2',
        schedule: '0 0 * * 0',
        format: { type: 'csv' },
        categories: ['messages'],
        emailDelivery: true,
        emailRecipients: ['test@example.com'],
        archiveExports: true,
        isActive: false
      });

      const exports = dataExportService.listScheduledExports();

      expect(exports).toHaveLength(2);
      expect(exports[0].name).toBe('Export 2'); // Most recent first
      expect(exports[1].name).toBe('Export 1');
    });

    it('should filter scheduled exports by user ID', async () => {
      // Create multiple scheduled exports
      await dataExportService.scheduleExport({
        userId: mockUserId,
        name: 'Export 1',
        schedule: '0 0 * * *',
        format: mockFormat,
        categories: mockCategories,
        emailDelivery: false,
        emailRecipients: [],
        archiveExports: false,
        isActive: true
      });

      await dataExportService.scheduleExport({
        userId: 'user456',
        name: 'Export 2',
        schedule: '0 0 * * 0',
        format: { type: 'csv' },
        categories: ['messages'],
        emailDelivery: true,
        emailRecipients: ['test@example.com'],
        archiveExports: true,
        isActive: true
      });

      const exports = dataExportService.listScheduledExports({ userId: mockUserId });

      expect(exports).toHaveLength(1);
      expect(exports[0].userId).toBe(mockUserId);
      expect(exports[0].name).toBe('Export 1');
    });

    it('should filter scheduled exports by active status', async () => {
      // Create multiple scheduled exports
      await dataExportService.scheduleExport({
        userId: mockUserId,
        name: 'Active Export',
        schedule: '0 0 * * *',
        format: mockFormat,
        categories: mockCategories,
        emailDelivery: false,
        emailRecipients: [],
        archiveExports: false,
        isActive: true
      });

      await dataExportService.scheduleExport({
        userId: mockUserId,
        name: 'Inactive Export',
        schedule: '0 0 * * 0',
        format: { type: 'csv' },
        categories: ['messages'],
        emailDelivery: true,
        emailRecipients: ['test@example.com'],
        archiveExports: true,
        isActive: false
      });

      const activeExports = dataExportService.listScheduledExports({ isActive: true });
      const inactiveExports = dataExportService.listScheduledExports({ isActive: false });

      expect(activeExports).toHaveLength(1);
      expect(activeExports[0].name).toBe('Active Export');
      expect(inactiveExports).toHaveLength(1);
      expect(inactiveExports[0].name).toBe('Inactive Export');
    });
  });

  describe('deleteScheduledExport', () => {
    it('should delete a scheduled export', async () => {
      // Create a scheduled export
      const config = {
        userId: mockUserId,
        name: 'Test Export',
        schedule: '0 0 * * *',
        format: mockFormat,
        categories: mockCategories,
        emailDelivery: false,
        emailRecipients: [],
        archiveExports: false,
        isActive: true
      };

      const scheduledExport = await dataExportService.scheduleExport(config);
      
      // Delete the scheduled export
      const deleted = await dataExportService.deleteScheduledExport(scheduledExport.id);

      expect(deleted).toBe(true);
      
      // Verify it's no longer retrievable
      const retrievedExport = dataExportService.getScheduledExport(scheduledExport.id);
      expect(retrievedExport).toBeNull();
    });

    it('should return false if scheduled export not found', async () => {
      const deleted = await dataExportService.deleteScheduledExport('nonexistent');
      expect(deleted).toBe(false);
    });
  });

  describe('executeScheduledExport', () => {
    it('should execute a scheduled export', async () => {
      // Create a scheduled export
      const config = {
        userId: mockUserId,
        name: 'Test Export',
        schedule: '0 0 * * *',
        format: mockFormat,
        categories: mockCategories,
        emailDelivery: false,
        emailRecipients: [],
        archiveExports: false,
        isActive: true
      };

      const scheduledExport = await dataExportService.scheduleExport(config);
      
      // Execute the scheduled export
      const job = await dataExportService.executeScheduledExport(scheduledExport.id);

      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
      expect(job.userId).toBe(mockUserId);
      expect(job.status).toBe('completed');
      expect(job.format).toEqual(mockFormat);
      expect(job.categories).toEqual(mockCategories);
    });

    it('should throw an error if scheduled export not found', async () => {
      await expect(dataExportService.executeScheduledExport('nonexistent'))
        .rejects.toThrow('Scheduled export with id nonexistent not found');
    });

    it('should throw an error if scheduled export is not active', async () => {
      // Create an inactive scheduled export
      const config = {
        userId: mockUserId,
        name: 'Test Export',
        schedule: '0 0 * * *',
        format: mockFormat,
        categories: mockCategories,
        emailDelivery: false,
        emailRecipients: [],
        archiveExports: false,
        isActive: false
      };

      const scheduledExport = await dataExportService.scheduleExport(config);
      
      await expect(dataExportService.executeScheduledExport(scheduledExport.id))
        .rejects.toThrow('Scheduled export is not active');
    });
  });

  describe('export job management', () => {
    it('should get an export job by ID', async () => {
      const request = {
        userId: mockUserId,
        categories: mockCategories,
        format: mockFormat
      };

      const job = await dataExportService.exportUserData(request);
      const retrievedJob = dataExportService.getExportJob(job.id);

      expect(retrievedJob).toBeDefined();
      expect(retrievedJob?.id).toBe(job.id);
    });

    it('should list export jobs with filtering', async () => {
      // Create multiple export jobs
      const request1 = {
        userId: mockUserId,
        categories: mockCategories,
        format: mockFormat
      };

      const request2 = {
        userId: 'user456',
        categories: ['messages'],
        format: { type: 'csv' }
      };

      await dataExportService.exportUserData(request1);
      await dataExportService.exportUserData(request2);

      const allJobs = dataExportService.listExportJobs();
      const userJobs = dataExportService.listExportJobs({ userId: mockUserId });

      expect(allJobs.length).toBeGreaterThanOrEqual(2);
      expect(userJobs.length).toBeGreaterThanOrEqual(1);
      expect(userJobs[0].userId).toBe(mockUserId);
    });

    it('should cancel an export job', async () => {
      // Mock the export to take some time so we can cancel it
      // @ts-ignore - accessing private method for testing
      const originalGenerateExportFile = dataExportService.generateExportFile;
      // @ts-ignore - accessing private method for testing
      dataExportService.generateExportFile = jest.fn().mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({ filePath: '/test/path', fileSize: 1024 });
          }, 100);
        });
      });

      const request = {
        userId: mockUserId,
        categories: mockCategories,
        format: mockFormat
      };

      // Start the export
      const jobPromise = dataExportService.exportUserData(request);
      
      // Get the job ID (it should be in pending state)
      // @ts-ignore - accessing private property for testing
      const jobId = Array.from(dataExportService.exportJobs.keys())[0];
      
      // Cancel the job
      const cancelled = dataExportService.cancelExportJob(jobId);
      expect(cancelled).toBe(true);

      // Wait for the job to complete and check status
      const job = await jobPromise.catch(() => {
        // @ts-ignore - accessing private property for testing
        return dataExportService.exportJobs.get(jobId);
      });
      
      expect(job.status).toBe('cancelled');

      // Restore original method
      // @ts-ignore - accessing private method for testing
      dataExportService.generateExportFile = originalGenerateExportFile;
    });
  });

  describe('format conversion', () => {
    it('should convert data to CSV format', () => {
      // @ts-ignore - accessing private method for testing
      const csvContent = dataExportService.convertToCSV({
        metadata: {
          exportDate: new Date(),
          format: 'csv',
          version: '1.0',
          dataCategories: ['test']
        },
        data: {
          test: [{ id: 1, name: 'Test' }]
        }
      });

      expect(csvContent).toContain('# Export Metadata');
      expect(csvContent).toContain('# test');
      expect(csvContent).toContain('id,name');
      expect(csvContent).toContain('1,Test');
    });

    it('should convert data to Excel format', () => {
      // @ts-ignore - accessing private method for testing
      const excelBuffer = dataExportService.convertToExcel({
        metadata: {
          exportDate: new Date(),
          format: 'excel',
          version: '1.0',
          dataCategories: ['test']
        },
        data: {
          test: [{ id: 1, name: 'Test' }]
        }
      });

      expect(excelBuffer).toBeInstanceOf(Buffer);
      expect(excelBuffer.length).toBeGreaterThan(0);
    });
  });
});