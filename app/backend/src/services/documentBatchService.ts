/**
 * Document Batch Service
 * Handles batch generation of documents (multiple invoices, receipts, etc.)
 */

import { Queue } from 'bullmq';
import archiver from 'archiver';
import { Readable } from 'stream';
import { safeLogger } from '../utils/safeLogger';
import { S3StorageService } from './s3StorageService';
import { DocumentJobData, queueDocumentGeneration } from '../queues/documentQueue';
import { randomUUID } from 'crypto';

export interface BatchGenerationRequest {
  batchId?: string;
  documents: Array<{
    type: 'receipt' | 'tax-invoice' | 'seller-invoice';
    data: any;
    email?: string;
    sendEmail?: boolean;
  }>;
  format?: 'individual' | 'zip'; // individual files or zipped
  metadata?: Record<string, any>;
}

export interface BatchGenerationResult {
  batchId: string;
  totalDocuments: number;
  queuedDocuments: number;
  failedDocuments: number;
  zipUrl?: string;
  s3Key?: string;
  estimatedCompletionTime: number; // in seconds
}

export class DocumentBatchService {
  private documentQueue: Queue<DocumentJobData>;
  private s3StorageService: S3StorageService;
  private batchStatus: Map<string, BatchGenerationResult> = new Map();

  constructor(documentQueue: Queue<DocumentJobData>) {
    this.documentQueue = documentQueue;
    this.s3StorageService = new S3StorageService();
  }

  /**
   * Queue batch document generation
   */
  async queueBatchGeneration(request: BatchGenerationRequest): Promise<BatchGenerationResult> {
    try {
      const batchId = request.batchId || `batch-${Date.now()}-${randomUUID().substring(0, 8)}`;
      const totalDocuments = request.documents.length;

      safeLogger.info(`[DocumentBatch] Starting batch generation: ${batchId} (${totalDocuments} documents)`);

      let queuedCount = 0;
      let failedCount = 0;

      // Queue each document
      for (const doc of request.documents) {
        try {
          const jobId = `${batchId}-doc-${queuedCount + 1}`;
          const job: DocumentJobData = {
            id: jobId,
            type: doc.type,
            data: doc.data,
            email: doc.email,
            sendEmail: doc.sendEmail || false,
            priority: 5,
            metadata: {
              batchId,
              documentIndex: queuedCount + 1,
              totalInBatch: totalDocuments,
              ...request.metadata,
            },
          };

          await queueDocumentGeneration(this.documentQueue, job);
          queuedCount++;
        } catch (error) {
          safeLogger.error(`[DocumentBatch] Failed to queue document:`, error);
          failedCount++;
        }
      }

      // Calculate estimated completion time
      const estimatedTimePerDocument = 3; // 3 seconds per PDF
      const estimatedCompletionTime = queuedCount * estimatedTimePerDocument;

      const result: BatchGenerationResult = {
        batchId,
        totalDocuments,
        queuedDocuments: queuedCount,
        failedDocuments: failedCount,
        estimatedCompletionTime,
      };

      // Store batch status
      this.batchStatus.set(batchId, result);

      safeLogger.info(`[DocumentBatch] Batch queued: ${batchId} (${queuedCount}/${totalDocuments} documents)`);
      return result;
    } catch (error) {
      safeLogger.error('[DocumentBatch] Error queuing batch generation:', error);
      throw error;
    }
  }

  /**
   * Get batch status
   */
  getBatchStatus(batchId: string): BatchGenerationResult | null {
    return this.batchStatus.get(batchId) || null;
  }

  /**
   * Generate and upload batch ZIP file
   */
  async generateBatchZip(batchId: string, fileBuffers: Map<string, Buffer>): Promise<{ s3Url: string; s3Key: string }> {
    try {
      // Create ZIP archive
      const archive = archiver('zip', {
        zlib: { level: 9 }, // Maximum compression
      });

      // Pipe to buffer
      const chunks: Buffer[] = [];
      const zipStream = new Readable({
        read() {
          // Do nothing
        },
      });

      zipStream.on('data', chunk => chunks.push(chunk));

      // Add files to archive
      let fileCount = 0;
      for (const [filename, buffer] of fileBuffers.entries()) {
        archive.append(buffer, { name: filename });
        fileCount++;
      }

      await archive.finalize();

      // Combine chunks
      const zipBuffer = Buffer.concat(chunks);

      safeLogger.info(`[DocumentBatch] Generated ZIP: ${batchId} (${fileCount} files, ${zipBuffer.length} bytes)`);

      // Upload to S3
      const uploadResult = await this.s3StorageService.uploadFile(zipBuffer, {
        filename: `${batchId}-documents.zip`,
        mimeType: 'application/zip',
        folder: `batches/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}`,
      });

      return {
        s3Url: uploadResult.cdnUrl || uploadResult.s3Url,
        s3Key: uploadResult.s3Key,
      };
    } catch (error) {
      safeLogger.error('[DocumentBatch] Error generating batch ZIP:', error);
      throw error;
    }
  }

  /**
   * Export batch as CSV manifest
   */
  generateCSVManifest(batchId: string, documents: any[]): string {
    try {
      const headers = ['Document Type', 'Recipient', 'Status', 'Generated At', 'PDF URL'];
      const rows = documents.map(doc => [
        doc.type,
        doc.email || 'N/A',
        doc.status || 'pending',
        new Date().toISOString(),
        doc.pdfUrl || 'pending',
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');

      return csvContent;
    } catch (error) {
      safeLogger.error('[DocumentBatch] Error generating CSV manifest:', error);
      throw error;
    }
  }

  /**
   * Get batch completion status
   */
  async getBatchCompletionStatus(batchId: string): Promise<{
    completed: number;
    pending: number;
    failed: number;
    percentComplete: number;
  }> {
    try {
      // Get all jobs for this batch
      const jobs = await this.documentQueue.getJobs(['completed', 'pending', 'failed']);

      let completed = 0;
      let pending = 0;
      let failed = 0;

      for (const job of jobs) {
        if (job.data.metadata?.batchId === batchId) {
          const state = await job.getState();
          if (state === 'completed') {
            completed++;
          } else if (state === 'failed') {
            failed++;
          } else {
            pending++;
          }
        }
      }

      const total = completed + pending + failed;
      const percentComplete = total > 0 ? (completed / total) * 100 : 0;

      return {
        completed,
        pending,
        failed,
        percentComplete,
      };
    } catch (error) {
      safeLogger.error('[DocumentBatch] Error getting batch status:', error);
      throw error;
    }
  }

  /**
   * Cancel batch generation
   */
  async cancelBatch(batchId: string): Promise<number> {
    try {
      const jobs = await this.documentQueue.getJobs(['pending']);
      let cancelledCount = 0;

      for (const job of jobs) {
        if (job.data.metadata?.batchId === batchId) {
          await job.remove();
          cancelledCount++;
        }
      }

      safeLogger.info(`[DocumentBatch] Cancelled batch: ${batchId} (${cancelledCount} documents)`);
      return cancelledCount;
    } catch (error) {
      safeLogger.error('[DocumentBatch] Error cancelling batch:', error);
      throw error;
    }
  }
}
