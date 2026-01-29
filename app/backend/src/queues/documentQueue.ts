/**
 * Document Generation Queue
 * BullMQ-based queue for async document generation
 */

import { Queue, Worker, QueueEvents } from 'bullmq';
import { safeLogger } from '../utils/safeLogger';
import { pdfGenerationService } from '../services/pdfGenerationService';
import { invoiceService } from '../services/invoiceService';
import { emailService } from '../services/emailService';
import Redis from 'ioredis';

export type DocumentType = 'receipt' | 'tax-invoice' | 'seller-invoice';

export interface DocumentJobData {
  id: string;
  type: DocumentType;
  data: any;
  email?: string;
  sendEmail?: boolean;
  priority?: number;
  metadata?: Record<string, any>;
}

/**
 * Create and configure document generation queue
 */
export function createDocumentQueue(): Queue<DocumentJobData> {
  const redisConnection = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  const documentQueue = new Queue<DocumentJobData>('document-generation', {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: {
        age: 3600, // Keep completed jobs for 1 hour
      },
      removeOnFail: {
        age: 86400, // Keep failed jobs for 24 hours
      },
    },
  });

  safeLogger.info('[DocumentQueue] Queue initialized');
  return documentQueue;
}

/**
 * Create and configure document queue worker
 */
export function createDocumentWorker(documentQueue: Queue<DocumentJobData>): Worker<DocumentJobData> {
  const redisConnection = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  const worker = new Worker<DocumentJobData>(
    'document-generation',
    async job => {
      safeLogger.info(`[DocumentWorker] Processing job ${job.id}: ${job.data.type}`);

      try {
        const { type, data, email, sendEmail, metadata } = job.data;

        // Initialize PDF service if needed
        if (!pdfGenerationService) {
          await pdfGenerationService.initialize();
        }

        let result: any;

        switch (type) {
          case 'receipt':
            result = await pdfGenerationService.generateAndUploadPDF(
              'receipt',
              data,
              `receipts/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}`
            );

            if (sendEmail && email) {
              await emailService.sendMarketplaceReceiptEmailWithPDF(
                email,
                data.receiptNumber,
                Buffer.from(result.s3Url),
                data
              );
            }
            break;

          case 'tax-invoice':
            result = await invoiceService.generateTaxInvoicePDF(data);

            if (sendEmail && email) {
              await emailService.sendEmail({
                to: email,
                subject: `Tax Invoice ${data.invoiceNumber}`,
                html: `<p>Your tax invoice is ready: <a href="${result.s3Url}">Download PDF</a></p>`,
              });
            }
            break;

          case 'seller-invoice':
            result = await invoiceService.generateSellerInvoicePDF(data);

            if (sendEmail && email) {
              await emailService.sendEmail({
                to: email,
                subject: `Commission Statement ${data.invoiceNumber}`,
                html: `<p>Your commission statement is ready: <a href="${result.s3Url}">Download PDF</a></p>`,
              });
            }
            break;

          default:
            throw new Error(`Unknown document type: ${type}`);
        }

        safeLogger.info(`[DocumentWorker] Completed job ${job.id}: ${type}`);
        return {
          success: true,
          type,
          s3Url: result.s3Url,
          s3Key: result.s3Key,
          email: sendEmail ? email : undefined,
        };
      } catch (error) {
        safeLogger.error(`[DocumentWorker] Job ${job.id} failed:`, error);
        throw error;
      }
    },
    {
      connection: redisConnection,
      concurrency: parseInt(process.env.PDF_MAX_CONCURRENT || '5'),
      limiter: {
        max: 100, // Max 100 jobs per second
        duration: 1000,
      },
    }
  );

  // Event listeners
  worker.on('completed', job => {
    safeLogger.info(`[DocumentWorker] Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, error) => {
    safeLogger.error(`[DocumentWorker] Job ${job?.id} failed:`, error);
  });

  worker.on('error', error => {
    safeLogger.error('[DocumentWorker] Worker error:', error);
  });

  safeLogger.info('[DocumentWorker] Worker started');
  return worker;
}

/**
 * Create queue event listener
 */
export function createQueueEvents(documentQueue: Queue<DocumentJobData>): QueueEvents {
  const queueEvents = new QueueEvents('document-generation', {
    connection: new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
    }),
  });

  queueEvents.on('progress', ({ jobId, data }) => {
    safeLogger.debug(`[DocumentQueue] Job ${jobId} progress:`, data);
  });

  queueEvents.on('completed', ({ jobId, returnvalue }) => {
    safeLogger.info(`[DocumentQueue] Job ${jobId} completed:`, returnvalue);
  });

  queueEvents.on('failed', ({ jobId, failedReason }) => {
    safeLogger.error(`[DocumentQueue] Job ${jobId} failed: ${failedReason}`);
  });

  return queueEvents;
}

/**
 * Queue a document for generation
 */
export async function queueDocumentGeneration(
  documentQueue: Queue<DocumentJobData>,
  job: DocumentJobData
): Promise<string> {
  try {
    const priority = job.priority || 5;
    const queuedJob = await documentQueue.add(`generate-${job.type}`, job, {
      priority,
      jobId: job.id,
    });

    safeLogger.info(`[DocumentQueue] Job queued: ${queuedJob.id} (priority: ${priority})`);
    return queuedJob.id;
  } catch (error) {
    safeLogger.error('[DocumentQueue] Error queuing job:', error);
    throw error;
  }
}

/**
 * Get job status
 */
export async function getJobStatus(
  documentQueue: Queue<DocumentJobData>,
  jobId: string
): Promise<Record<string, any>> {
  try {
    const job = await documentQueue.getJob(jobId);

    if (!job) {
      return {
        status: 'not-found',
        message: 'Job not found',
      };
    }

    const state = await job.getState();
    const progress = job.progress();

    return {
      id: job.id,
      status: state,
      progress,
      data: job.data,
      result: job.returnvalue,
      failedReason: job.failedReason,
      attempts: job.attemptsMade,
      maxAttempts: job.opts?.attempts,
    };
  } catch (error) {
    safeLogger.error('[DocumentQueue] Error getting job status:', error);
    throw error;
  }
}

/**
 * Get queue statistics
 */
export async function getQueueStats(documentQueue: Queue<DocumentJobData>): Promise<Record<string, any>> {
  try {
    const counts = await documentQueue.getJobCounts();
    const isWorkerRunning = await documentQueue.isPaused();

    return {
      isPaused: isWorkerRunning,
      ...counts,
    };
  } catch (error) {
    safeLogger.error('[DocumentQueue] Error getting queue stats:', error);
    throw error;
  }
}
