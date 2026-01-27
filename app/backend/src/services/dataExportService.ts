import { safeLogger } from '../utils/safeLogger';
import { emailService } from './emailService';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { Parser } from 'json2csv';

// Define interfaces for our data export system
export interface ExportFormat {
  type: 'csv' | 'excel' | 'json';
  options?: Record<string, any>;
}

export interface ExportData {
  metadata: {
    exportDate: Date;
    format: string;
    version: string;
    dataCategories: string[];
  };
  data: Record<string, any[]>;
}

export interface ExportRequest {
  userId: string;
  categories: string[];
  format: ExportFormat;
  includeMetadata?: boolean;
}

export interface ScheduledExport {
  id: string;
  userId: string;
  name: string;
  schedule: string; // cron expression
  format: ExportFormat;
  categories: string[];
  emailDelivery: boolean;
  emailRecipients: string[];
  archiveExports: boolean;
  lastRun?: Date;
  nextRun: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExportJob {
  id: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  format: ExportFormat;
  categories: string[];
  filePath?: string;
  fileSize?: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export class DataExportService {
  private static instance: DataExportService;
  private scheduledExports: Map<string, ScheduledExport> = new Map();
  private exportJobs: Map<string, ExportJob> = new Map();
  private exportDirectory: string;

  private constructor() {
    this.exportDirectory = path.join(process.cwd(), 'temp', 'exports');
    this.ensureExportDirectory();
    this.loadScheduledExports();
  }

  public static getInstance(): DataExportService {
    if (!DataExportService.instance) {
      DataExportService.instance = new DataExportService();
    }
    return DataExportService.instance;
  }

  /**
   * Export user data in specified format
   */
  async exportUserData(request: ExportRequest): Promise<ExportJob> {
    const jobId = this.generateId();
    const job: ExportJob = {
      id: jobId,
      userId: request.userId,
      status: 'pending',
      format: request.format,
      categories: request.categories,
      createdAt: new Date()
    };

    this.exportJobs.set(jobId, job);

    try {
      job.status = 'processing';
      job.startedAt = new Date();

      // In a real implementation, this would fetch actual data from the database
      const exportData: ExportData = await this.fetchUserData(request.userId, request.categories);

      // Generate the export file based on format
      const result = await this.generateExportFile(exportData, request.format);
      
      job.filePath = result.filePath;
      job.fileSize = result.fileSize;
      job.status = 'completed';
      job.completedAt = new Date();

      // Log the export activity
      await this.logExportActivity(request.userId, request.format.type, request.categories);

      return job;
    } catch (error) {
      safeLogger.error('Error exporting user data:', error);
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.completedAt = new Date();
      throw error;
    }
  }

  /**
   * Schedule a recurring export
   */
  async scheduleExport(config: Omit<ScheduledExport, 'id' | 'createdAt' | 'updatedAt' | 'lastRun' | 'nextRun'>): Promise<ScheduledExport> {
    const scheduledExport: ScheduledExport = {
      ...config,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      lastRun: undefined,
      nextRun: this.calculateNextRun(config.schedule)
    };

    this.scheduledExports.set(scheduledExport.id, scheduledExport);
    await this.saveScheduledExports();
    
    safeLogger.info('Export scheduled', { scheduledExportId: scheduledExport.id });
    return scheduledExport;
  }

  /**
   * Update a scheduled export
   */
  async updateScheduledExport(id: string, updates: Partial<ScheduledExport>): Promise<ScheduledExport> {
    const existing = this.scheduledExports.get(id);
    if (!existing) {
      throw new Error(`Scheduled export with id ${id} not found`);
    }

    const updated: ScheduledExport = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date()
    };

    // Recalculate next run if schedule changed
    if (updates.schedule) {
      updated.nextRun = this.calculateNextRun(updates.schedule);
    }

    this.scheduledExports.set(id, updated);
    await this.saveScheduledExports();
    
    return updated;
  }

  /**
   * Get a scheduled export by ID
   */
  getScheduledExport(id: string): ScheduledExport | null {
    return this.scheduledExports.get(id) || null;
  }

  /**
   * List scheduled exports with optional filters
   */
  listScheduledExports(filters?: {
    userId?: string;
    isActive?: boolean;
  }): ScheduledExport[] {
    let exports = Array.from(this.scheduledExports.values());

    if (filters) {
      if (filters.userId) {
        exports = exports.filter(e => e.userId === filters.userId);
      }
      if (filters.isActive !== undefined) {
        exports = exports.filter(e => e.isActive === filters.isActive);
      }
    }

    return exports.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Delete a scheduled export
   */
  async deleteScheduledExport(id: string): Promise<boolean> {
    const result = this.scheduledExports.delete(id);
    if (result) {
      await this.saveScheduledExports();
    }
    return result;
  }

  /**
   * Execute a scheduled export
   */
  async executeScheduledExport(scheduledExportId: string): Promise<ExportJob> {
    const scheduledExport = this.scheduledExports.get(scheduledExportId);
    if (!scheduledExport) {
      throw new Error(`Scheduled export with id ${scheduledExportId} not found`);
    }

    if (!scheduledExport.isActive) {
      throw new Error('Scheduled export is not active');
    }

    // Create export request
    const request: ExportRequest = {
      userId: scheduledExport.userId,
      categories: scheduledExport.categories,
      format: scheduledExport.format
    };

    // Execute the export
    const job = await this.exportUserData(request);

    // Update last run time
    scheduledExport.lastRun = new Date();
    scheduledExport.nextRun = this.calculateNextRun(scheduledExport.schedule);
    scheduledExport.updatedAt = new Date();
    await this.saveScheduledExports();

    // Handle email delivery if enabled
    if (scheduledExport.emailDelivery && job.filePath) {
      await this.deliverExportViaEmail(job, scheduledExport.emailRecipients);
    }

    // Handle archiving if enabled
    if (scheduledExport.archiveExports && job.filePath) {
      await this.archiveExport(job);
    }

    return job;
  }

  /**
   * Get export job by ID
   */
  getExportJob(id: string): ExportJob | null {
    return this.exportJobs.get(id) || null;
  }

  /**
   * List export jobs with optional filters
   */
  listExportJobs(filters?: {
    userId?: string;
    status?: ExportJob['status'];
  }): ExportJob[] {
    let jobs = Array.from(this.exportJobs.values());

    if (filters) {
      if (filters.userId) {
        jobs = jobs.filter(j => j.userId === filters.userId);
      }
      if (filters.status) {
        jobs = jobs.filter(j => j.status === filters.status);
      }
    }

    return jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Cancel an export job (if it's still pending or processing)
   */
  cancelExportJob(id: string): boolean {
    const job = this.exportJobs.get(id);
    if (!job) {
      return false;
    }

    if (job.status === 'pending' || job.status === 'processing') {
      job.status = 'cancelled';
      job.completedAt = new Date();
      return true;
    }

    return false;
  }

  // Private helper methods

  private async fetchUserData(userId: string, categories: string[]): Promise<ExportData> {
    // In a real implementation, this would fetch actual user data from the database
    // For now, we'll return mock data
    
    const data: Record<string, any[]> = {};
    
    for (const category of categories) {
      // Generate mock data based on category
      data[category] = this.generateMockDataForCategory(category, 100);
    }

    return {
      metadata: {
        exportDate: new Date(),
        format: 'json',
        version: '1.0',
        dataCategories: categories
      },
      data
    };
  }

  private generateMockDataForCategory(category: string, count: number): any[] {
    const data = [];
    
    for (let i = 0; i < count; i++) {
      switch (category) {
        case 'profile':
          data.push({
            id: `user_${i}`,
            name: `User ${i}`,
            email: `user${i}@example.com`,
            createdAt: new Date(Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000)),
            lastLogin: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000))
          });
          break;
        case 'posts':
          data.push({
            id: `post_${i}`,
            title: `Post Title ${i}`,
            content: `This is the content of post ${i}`,
            createdAt: new Date(Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000)),
            likes: Math.floor(Math.random() * 1000),
            comments: Math.floor(Math.random() * 100)
          });
          break;
        case 'messages':
          data.push({
            id: `message_${i}`,
            from: `user_${Math.floor(Math.random() * 100)}`,
            to: `user_${Math.floor(Math.random() * 100)}`,
            content: `Message content ${i}`,
            sentAt: new Date(Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000)),
            read: Math.random() > 0.5
          });
          break;
        default:
          data.push({
            id: `${category}_${i}`,
            field1: `Value ${i}`,
            field2: Math.random() * 1000,
            field3: new Date(Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000)),
            field4: Math.random() > 0.5 ? 'active' : 'inactive'
          });
      }
    }
    
    return data;
  }

  private async generateExportFile(exportData: ExportData, format: ExportFormat): Promise<{ filePath: string; fileSize: number }> {
    await fs.promises.mkdir(this.exportDirectory, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    let fileName: string;
    
    switch (format.type) {
      case 'csv':
        fileName = `export-${timestamp}.csv`;
        const csvContent = this.convertToCSV(exportData);
        const csvFilePath = path.join(this.exportDirectory, fileName);
        await fs.promises.writeFile(csvFilePath, csvContent, 'utf8');
        break;
      case 'excel':
        fileName = `export-${timestamp}.xlsx`;
        const excelBuffer = this.convertToExcel(exportData);
        const excelFilePath = path.join(this.exportDirectory, fileName);
        await fs.promises.writeFile(excelFilePath, excelBuffer);
        break;
      case 'json':
        fileName = `export-${timestamp}.json`;
        const jsonContent = JSON.stringify(exportData, null, 2);
        const jsonFilePath = path.join(this.exportDirectory, fileName);
        await fs.promises.writeFile(jsonFilePath, jsonContent, 'utf8');
        break;
      default:
        throw new Error(`Unsupported export format: ${format.type}`);
    }

    const filePath = path.join(this.exportDirectory, fileName);
    const stats = await fs.promises.stat(filePath);
    
    return {
      filePath,
      fileSize: stats.size
    };
  }

  private convertToCSV(data: ExportData): string {
    let csvContent = '';
    
    // Add metadata
    csvContent += '# Export Metadata\n';
    csvContent += `Export Date,${data.metadata.exportDate.toISOString()}\n`;
    csvContent += `Format,${data.metadata.format}\n`;
    csvContent += `Version,${data.metadata.version}\n`;
    csvContent += `Categories,${data.metadata.dataCategories.join('; ')}\n\n`;
    
    // Add data sections
    for (const [category, records] of Object.entries(data.data)) {
      if (records.length === 0) continue;
      
      csvContent += `# ${category}\n`;
      
      // Headers
      const headers = Object.keys(records[0]);
      csvContent += headers.join(',') + '\n';
      
      // Data rows
      for (const record of records) {
        const row = headers.map(header => {
          const value = record[header];
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',');
        csvContent += row + '\n';
      }
      
      csvContent += '\n';
    }
    
    return csvContent;
  }

  private convertToExcel(data: ExportData): Buffer {
    // Create a new workbook
    const wb = XLSX.utils.book_new();
    
    // Add metadata sheet
    const metadataSheet = XLSX.utils.aoa_to_sheet([
      ['Export Metadata'],
      ['Export Date', data.metadata.exportDate.toISOString()],
      ['Format', data.metadata.format],
      ['Version', data.metadata.version],
      ['Categories', data.metadata.dataCategories.join('; ')]
    ]);
    XLSX.utils.book_append_sheet(wb, metadataSheet, 'Metadata');
    
    // Add data sheets
    for (const [category, records] of Object.entries(data.data)) {
      if (records.length === 0) continue;
      
      // Convert JSON to worksheet
      const ws = XLSX.utils.json_to_sheet(records);
      XLSX.utils.book_append_sheet(wb, ws, category.substring(0, 31)); // Excel sheet names limited to 31 chars
    }
    
    // Write to buffer
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  private async deliverExportViaEmail(job: ExportJob, recipients: string[]): Promise<void> {
    if (!job.filePath) {
      throw new Error('Export file path is missing');
    }

    try {
      const fileBuffer = await fs.promises.readFile(job.filePath);
      const fileName = path.basename(job.filePath);
      
      // In a real implementation, we would attach the file to the email
      // For now, we'll just send a notification
      
      for (const recipient of recipients) {
        await emailService.sendEmail({
          to: recipient,
          subject: 'Your Scheduled Data Export is Ready',
          html: `
            <h2>Data Export Completed</h2>
            <p>Your scheduled data export has been completed successfully.</p>
            <p><strong>File:</strong> ${fileName}</p>
            <p><strong>Size:</strong> ${job.fileSize ? (job.fileSize / 1024).toFixed(2) + ' KB' : 'N/A'}</p>
            <p><strong>Format:</strong> ${job.format.type}</p>
            <p>The export file is available for download from the admin panel.</p>
          `
        });
      }
      
      safeLogger.info('Export delivered via email', { 
        jobId: job.id, 
        recipients: recipients.length 
      });
    } catch (error) {
      safeLogger.error('Error delivering export via email:', error);
      throw error;
    }
  }

  private async archiveExport(job: ExportJob): Promise<void> {
    if (!job.filePath) {
      throw new Error('Export file path is missing');
    }

    try {
      const archiveDir = path.join(this.exportDirectory, 'archives');
      await fs.promises.mkdir(archiveDir, { recursive: true });
      
      const fileName = path.basename(job.filePath);
      const archivePath = path.join(archiveDir, fileName);
      
      // Move file to archive directory
      await fs.promises.rename(job.filePath, archivePath);
      
      // Update job with new file path
      job.filePath = archivePath;
      
      safeLogger.info('Export archived', { jobId: job.id, archivePath });
    } catch (error) {
      safeLogger.error('Error archiving export:', error);
      throw error;
    }
  }

  private async logExportActivity(userId: string, format: string, categories: string[]): Promise<void> {
    // In a real implementation, this would log to a database or audit system
    safeLogger.info('User data exported', { userId, format, categories });
  }

  private calculateNextRun(schedule: string): Date {
    // In a real implementation, this would parse the cron expression
    // For now, we'll just add 24 hours
    const nextRun = new Date();
    nextRun.setDate(nextRun.getDate() + 1);
    return nextRun;
  }

  private generateId(): string {
    return `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private ensureExportDirectory(): void {
    if (!fs.existsSync(this.exportDirectory)) {
      fs.mkdirSync(this.exportDirectory, { recursive: true });
    }
  }

  private async saveScheduledExports(): Promise<void> {
    // In a real implementation, this would persist to a database
    // For now, we'll just keep in memory
  }

  private async loadScheduledExports(): Promise<void> {
    // In a real implementation, this would load from a database
    // For now, we'll just keep in memory
  }
}

export const dataExportService = DataExportService.getInstance();