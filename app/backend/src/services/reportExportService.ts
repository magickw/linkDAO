import { ReportTemplate, ReportData, ReportExecution } from '../types/reporting.js';

interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv' | 'html' | 'json';
  branding?: BrandingConfig;
  layout?: LayoutConfig;
  compression?: boolean;
  password?: string;
  watermark?: string;
}

interface BrandingConfig {
  logo?: string;
  companyName?: string;
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
  fonts?: {
    heading?: string;
    body?: string;
  };
}

interface LayoutConfig {
  pageSize?: 'A4' | 'A3' | 'Letter' | 'Legal';
  orientation?: 'portrait' | 'landscape';
  margins?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  header?: boolean;
  footer?: boolean;
  pageNumbers?: boolean;
}

interface ExportResult {
  success: boolean;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  downloadUrl?: string;
  error?: string;
  metadata?: ExportMetadata;
}

interface ExportMetadata {
  format: string;
  generatedAt: Date;
  templateId: string;
  templateName: string;
  parameters: Record<string, any>;
  pageCount?: number;
  rowCount?: number;
  compressionRatio?: number;
}

export class ReportExportService {
  private exportQueue: Map<string, ExportJob> = new Map();
  private defaultBranding: BrandingConfig = {
    companyName: 'LinkDAO Admin',
    colors: {
      primary: '#3B82F6',
      secondary: '#6B7280',
      accent: '#10B981'
    },
    fonts: {
      heading: 'Inter, sans-serif',
      body: 'Inter, sans-serif'
    }
  };

  // Main export method
  async exportReport(
    template: ReportTemplate,
    reportData: ReportData,
    options: ExportOptions
  ): Promise<ExportResult> {
    const jobId = this.generateJobId();
    
    try {
      const job: ExportJob = {
        id: jobId,
        status: 'processing',
        startTime: new Date(),
        template,
        reportData,
        options
      };

      this.exportQueue.set(jobId, job);

      let result: ExportResult;

      switch (options.format) {
        case 'pdf':
          result = await this.exportToPDF(template, reportData, options);
          break;
        case 'excel':
          result = await this.exportToExcel(template, reportData, options);
          break;
        case 'csv':
          result = await this.exportToCSV(template, reportData, options);
          break;
        case 'html':
          result = await this.exportToHTML(template, reportData, options);
          break;
        case 'json':
          result = await this.exportToJSON(template, reportData, options);
          break;
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }

      job.status = result.success ? 'completed' : 'failed';
      job.endTime = new Date();
      job.result = result;

      return result;

    } catch (error) {
      const job = this.exportQueue.get(jobId);
      if (job) {
        job.status = 'failed';
        job.endTime = new Date();
        job.error = error instanceof Error ? error.message : 'Unknown error';
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed'
      };
    }
  }

  // PDF Export
  private async exportToPDF(
    template: ReportTemplate,
    reportData: ReportData,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      const branding = { ...this.defaultBranding, ...options.branding };
      const layout = this.getDefaultLayout(options.layout);

      // Simulate PDF generation
      await new Promise(resolve => setTimeout(resolve, 2000));

      const fileName = `${this.sanitizeFileName(template.name)}_${Date.now()}.pdf`;
      const filePath = `/exports/pdf/${fileName}`;
      const fileSize = Math.floor(Math.random() * 2000000) + 500000; // 500KB - 2.5MB

      const metadata: ExportMetadata = {
        format: 'pdf',
        generatedAt: new Date(),
        templateId: template.id,
        templateName: template.name,
        parameters: reportData.parameters,
        pageCount: Math.ceil(template.sections.length / 2) + 1
      };

      return {
        success: true,
        filePath,
        fileName,
        fileSize,
        downloadUrl: `/api/admin/reports/download${filePath}`,
        metadata
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PDF export failed'
      };
    }
  }

  // Excel Export
  private async exportToExcel(
    template: ReportTemplate,
    reportData: ReportData,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      const branding = { ...this.defaultBranding, ...options.branding };

      // Simulate Excel generation
      await new Promise(resolve => setTimeout(resolve, 1500));

      const fileName = `${this.sanitizeFileName(template.name)}_${Date.now()}.xlsx`;
      const filePath = `/exports/excel/${fileName}`;
      const fileSize = Math.floor(Math.random() * 1500000) + 300000; // 300KB - 1.8MB

      // Calculate total rows across all sections
      const totalRows = reportData.sections.reduce((sum, section) => {
        return sum + (section.data?.length || 0);
      }, 0);

      const metadata: ExportMetadata = {
        format: 'excel',
        generatedAt: new Date(),
        templateId: template.id,
        templateName: template.name,
        parameters: reportData.parameters,
        rowCount: totalRows
      };

      return {
        success: true,
        filePath,
        fileName,
        fileSize,
        downloadUrl: `/api/admin/reports/download${filePath}`,
        metadata
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Excel export failed'
      };
    }
  }

  // CSV Export
  private async exportToCSV(
    template: ReportTemplate,
    reportData: ReportData,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      // Simulate CSV generation
      await new Promise(resolve => setTimeout(resolve, 500));

      const fileName = `${this.sanitizeFileName(template.name)}_${Date.now()}.csv`;
      const filePath = `/exports/csv/${fileName}`;

      // Generate CSV content
      let csvContent = '';
      let totalRows = 0;

      for (const section of reportData.sections) {
        if (section.data && section.data.length > 0) {
          // Add section header
          csvContent += `\n"${section.sectionId} - Data"\n`;
          
          // Add column headers
          if (section.columns && section.columns.length > 0) {
            const headers = section.columns.map(col => `"${col.label}"`).join(',');
            csvContent += headers + '\n';
          }

          // Add data rows
          for (const row of section.data) {
            const values = section.columns?.map(col => {
              const value = row[col.key];
              return `"${String(value || '').replace(/"/g, '""')}"`;
            }).join(',') || '';
            csvContent += values + '\n';
            totalRows++;
          }
          csvContent += '\n';
        }
      }

      const fileSize = Buffer.byteLength(csvContent, 'utf8');

      const metadata: ExportMetadata = {
        format: 'csv',
        generatedAt: new Date(),
        templateId: template.id,
        templateName: template.name,
        parameters: reportData.parameters,
        rowCount: totalRows
      };

      return {
        success: true,
        filePath,
        fileName,
        fileSize,
        downloadUrl: `/api/admin/reports/download${filePath}`,
        metadata
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'CSV export failed'
      };
    }
  }

  // HTML Export
  private async exportToHTML(
    template: ReportTemplate,
    reportData: ReportData,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      const branding = { ...this.defaultBranding, ...options.branding };

      // Simulate HTML generation
      await new Promise(resolve => setTimeout(resolve, 800));

      const htmlContent = this.generateHTMLReport(template, reportData, branding);
      const fileName = `${this.sanitizeFileName(template.name)}_${Date.now()}.html`;
      const filePath = `/exports/html/${fileName}`;
      const fileSize = Buffer.byteLength(htmlContent, 'utf8');

      const metadata: ExportMetadata = {
        format: 'html',
        generatedAt: new Date(),
        templateId: template.id,
        templateName: template.name,
        parameters: reportData.parameters
      };

      return {
        success: true,
        filePath,
        fileName,
        fileSize,
        downloadUrl: `/api/admin/reports/download${filePath}`,
        metadata
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'HTML export failed'
      };
    }
  }

  // JSON Export
  private async exportToJSON(
    template: ReportTemplate,
    reportData: ReportData,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      // Simulate JSON generation
      await new Promise(resolve => setTimeout(resolve, 300));

      const jsonData = {
        template: {
          id: template.id,
          name: template.name,
          description: template.description,
          version: template.version
        },
        reportData,
        exportMetadata: {
          format: 'json',
          generatedAt: new Date(),
          exportOptions: options
        }
      };

      const jsonContent = JSON.stringify(jsonData, null, 2);
      const fileName = `${this.sanitizeFileName(template.name)}_${Date.now()}.json`;
      const filePath = `/exports/json/${fileName}`;
      const fileSize = Buffer.byteLength(jsonContent, 'utf8');

      const metadata: ExportMetadata = {
        format: 'json',
        generatedAt: new Date(),
        templateId: template.id,
        templateName: template.name,
        parameters: reportData.parameters
      };

      return {
        success: true,
        filePath,
        fileName,
        fileSize,
        downloadUrl: `/api/admin/reports/download${filePath}`,
        metadata
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'JSON export failed'
      };
    }
  }

  // Batch Export
  async batchExport(
    template: ReportTemplate,
    reportData: ReportData,
    formats: string[]
  ): Promise<{ [format: string]: ExportResult }> {
    const results: { [format: string]: ExportResult } = {};

    for (const format of formats) {
      try {
        const result = await this.exportReport(template, reportData, { 
          format: format as any 
        });
        results[format] = result;
      } catch (error) {
        results[format] = {
          success: false,
          error: error instanceof Error ? error.message : `Failed to export ${format}`
        };
      }
    }

    return results;
  }

  // Template Management
  async createExportTemplate(
    name: string,
    config: {
      formats: string[];
      branding: BrandingConfig;
      layout: LayoutConfig;
    }
  ): Promise<string> {
    const templateId = this.generateJobId();
    // Store template configuration (in real implementation, this would be persisted)
    return templateId;
  }

  async getExportTemplates(): Promise<any[]> {
    // Return saved export templates
    return [
      {
        id: 'default-pdf',
        name: 'Default PDF Template',
        formats: ['pdf'],
        branding: this.defaultBranding,
        layout: this.getDefaultLayout()
      },
      {
        id: 'executive-summary',
        name: 'Executive Summary',
        formats: ['pdf', 'html'],
        branding: this.defaultBranding,
        layout: { ...this.getDefaultLayout(), pageSize: 'A4' }
      }
    ];
  }

  // Job Management
  getExportJob(jobId: string): ExportJob | null {
    return this.exportQueue.get(jobId) || null;
  }

  listExportJobs(): ExportJob[] {
    return Array.from(this.exportQueue.values())
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  cancelExportJob(jobId: string): boolean {
    const job = this.exportQueue.get(jobId);
    if (job && job.status === 'processing') {
      job.status = 'cancelled';
      job.endTime = new Date();
      return true;
    }
    return false;
  }

  // Utility methods
  private generateHTMLReport(
    template: ReportTemplate,
    reportData: ReportData,
    branding: BrandingConfig
  ): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${template.name}</title>
    <style>
        body {
            font-family: ${branding.fonts?.body || 'Arial, sans-serif'};
            margin: 0;
            padding: 20px;
            color: #333;
        }
        .header {
            border-bottom: 2px solid ${branding.colors?.primary || '#3B82F6'};
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .title {
            font-family: ${branding.fonts?.heading || 'Arial, sans-serif'};
            font-size: 28px;
            font-weight: bold;
            color: ${branding.colors?.primary || '#3B82F6'};
            margin: 0;
        }
        .subtitle {
            color: ${branding.colors?.secondary || '#6B7280'};
            margin: 5px 0 0 0;
        }
        .section {
            margin: 30px 0;
            padding: 20px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
        }
        .section-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 15px;
            color: ${branding.colors?.primary || '#3B82F6'};
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        th, td {
            border: 1px solid #e5e7eb;
            padding: 8px 12px;
            text-align: left;
        }
        th {
            background-color: #f9fafb;
            font-weight: bold;
        }
        .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: ${branding.colors?.secondary || '#6B7280'};
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1 class="title">${template.name}</h1>
        <p class="subtitle">${template.description || ''}</p>
        <p class="subtitle">Generated on ${reportData.generatedAt.toLocaleDateString()}</p>
    </div>

    ${reportData.sections.map(section => `
        <div class="section">
            <h2 class="section-title">${section.sectionId}</h2>
            ${section.data && section.data.length > 0 ? `
                <table>
                    <thead>
                        <tr>
                            ${section.columns?.map(col => `<th>${col.label}</th>`).join('') || ''}
                        </tr>
                    </thead>
                    <tbody>
                        ${section.data.slice(0, 100).map(row => `
                            <tr>
                                ${section.columns?.map(col => `<td>${row[col.key] || ''}</td>`).join('') || ''}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                ${section.data.length > 100 ? `<p><em>... and ${section.data.length - 100} more rows</em></p>` : ''}
            ` : '<p>No data available</p>'}
        </div>
    `).join('')}

    <div class="footer">
        <p>Generated by ${branding.companyName || 'LinkDAO Admin'}</p>
    </div>
</body>
</html>`;
  }

  private getDefaultLayout(overrides?: Partial<LayoutConfig>): LayoutConfig {
    return {
      pageSize: 'A4',
      orientation: 'portrait',
      margins: {
        top: 20,
        right: 20,
        bottom: 20,
        left: 20
      },
      header: true,
      footer: true,
      pageNumbers: true,
      ...overrides
    };
  }

  private sanitizeFileName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9\s-_]/g, '')
      .replace(/\s+/g, '_')
      .toLowerCase();
  }

  private generateJobId(): string {
    return `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

interface ExportJob {
  id: string;
  status: 'processing' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  template: ReportTemplate;
  reportData: ReportData;
  options: ExportOptions;
  result?: ExportResult;
  error?: string;
}

export const reportExportService = new ReportExportService();