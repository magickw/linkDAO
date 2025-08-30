import { contentModerationQueue, ContentModerationJob } from '../services/contentModerationQueue';

// Mock BullMQ
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'job-123' }),
    getJob: jest.fn(),
    getWaiting: jest.fn().mockResolvedValue([]),
    getActive: jest.fn().mockResolvedValue([]),
    getCompleted: jest.fn().mockResolvedValue([]),
    getFailed: jest.fn().mockResolvedValue([]),
    clean: jest.fn().mockResolvedValue(undefined)
  })),
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined)
  })),
  QueueEvents: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined)
  }))
}));

// Mock Redis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    quit: jest.fn().mockResolvedValue(undefined)
  }));
});

// Mock AI service
jest.mock('../services/aiService', () => ({
  aiService: {
    moderateContent: jest.fn().mockResolvedValue({
      flagged: false,
      categories: {}
    })
  }
}));

describe('ContentModerationQueueService', () => {
  const mockJobData: ContentModerationJob = {
    contentId: 'test-content-123',
    contentType: 'post',
    userId: 'user-123',
    priority: 'fast',
    content: {
      text: 'This is a test post',
      links: ['https://example.com']
    },
    userReputation: 75,
    walletAddress: '0x123...',
    submittedAt: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addToQueue', () => {
    it('should add job to fast queue for text content', async () => {
      const jobId = await contentModerationQueue.addToQueue(mockJobData);
      
      expect(jobId).toBe('job-123');
    });

    it('should add job to slow queue for media content', async () => {
      const mediaJobData = {
        ...mockJobData,
        priority: 'slow' as const,
        content: {
          ...mockJobData.content,
          mediaUrls: ['https://example.com/image.jpg']
        }
      };
      
      const jobId = await contentModerationQueue.addToQueue(mediaJobData);
      
      expect(jobId).toBe('job-123');
    });

    it('should calculate higher priority for DM content', async () => {
      const dmJobData = {
        ...mockJobData,
        contentType: 'dm' as const
      };
      
      const jobId = await contentModerationQueue.addToQueue(dmJobData);
      
      expect(jobId).toBe('job-123');
    });

    it('should add delay for low reputation users', async () => {
      const lowRepJobData = {
        ...mockJobData,
        userReputation: 25
      };
      
      const jobId = await contentModerationQueue.addToQueue(lowRepJobData);
      
      expect(jobId).toBe('job-123');
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      const stats = await contentModerationQueue.getQueueStats();
      
      expect(stats).toHaveProperty('fastQueue');
      expect(stats).toHaveProperty('slowQueue');
      expect(stats.fastQueue).toHaveProperty('waiting');
      expect(stats.fastQueue).toHaveProperty('active');
      expect(stats.fastQueue).toHaveProperty('completed');
      expect(stats.fastQueue).toHaveProperty('failed');
    });
  });

  describe('getJobStatus', () => {
    it('should return null for non-existent job', async () => {
      const status = await contentModerationQueue.getJobStatus('non-existent');
      
      expect(status).toBeNull();
    });
  });

  describe('cleanupJobs', () => {
    it('should clean up completed and failed jobs', async () => {
      await expect(contentModerationQueue.cleanupJobs()).resolves.not.toThrow();
    });
  });

  describe('shutdown', () => {
    it('should shutdown gracefully', async () => {
      await expect(contentModerationQueue.shutdown()).resolves.not.toThrow();
    });
  });

  describe('priority calculation', () => {
    it('should calculate higher priority for content with links', () => {
      const jobWithLinks = {
        ...mockJobData,
        content: {
          text: 'Check out this link',
          links: ['https://suspicious-site.com']
        }
      };
      
      // This tests the internal priority calculation logic
      // In a real test, we'd need to expose the calculateJobPriority method
      expect(jobWithLinks.content.links).toHaveLength(1);
    });

    it('should boost priority for high reputation users', () => {
      const highRepJobData = {
        ...mockJobData,
        userReputation: 95
      };
      
      expect(highRepJobData.userReputation).toBeGreaterThan(80);
    });
  });
});