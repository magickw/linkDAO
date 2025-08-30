import { contentStagingService } from '../services/contentStagingService';
import fs from 'fs/promises';
import path from 'path';

// Mock IPFS
jest.mock('ipfs-http-client', () => ({
  create: jest.fn(() => ({
    add: jest.fn().mockResolvedValue({ cid: { toString: () => 'QmTest123' } })
  }))
}));

// Mock fs operations
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('ContentStagingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue(Buffer.from('test content'));
    mockFs.unlink.mockResolvedValue(undefined);
    mockFs.readdir.mockResolvedValue(['test.staged'] as any);
    mockFs.stat.mockResolvedValue({
      mtime: new Date(),
      size: 100
    } as any);
  });

  describe('validateContent', () => {
    it('should validate text content successfully', async () => {
      const result = await contentStagingService.validateContent('Hello world');
      
      expect(result.isValid).toBe(true);
      expect(result.contentType).toBe('text');
      expect(result.size).toBeGreaterThan(0);
      expect(result.hash).toBeDefined();
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty content', async () => {
      const result = await contentStagingService.validateContent('');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Content cannot be empty');
    });

    it('should reject content that is too large', async () => {
      const largeContent = 'x'.repeat(101 * 1024 * 1024); // 101MB
      const result = await contentStagingService.validateContent(largeContent);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('exceeds maximum allowed size');
    });

    it('should validate image MIME type', async () => {
      const buffer = Buffer.from('fake image data');
      const result = await contentStagingService.validateContent(buffer, 'image/jpeg', 'test.jpg');
      
      expect(result.isValid).toBe(true);
      expect(result.contentType).toBe('image');
    });

    it('should reject disallowed MIME types', async () => {
      const buffer = Buffer.from('fake executable');
      const result = await contentStagingService.validateContent(buffer, 'application/x-executable', 'test.exe');
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('MIME type application/x-executable is not allowed');
    });

    it('should reject suspicious file extensions', async () => {
      const buffer = Buffer.from('fake content');
      const result = await contentStagingService.validateContent(buffer, 'text/plain', 'malware.exe');
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('File extension .exe is not allowed');
    });

    it('should detect malicious patterns in text', async () => {
      const maliciousText = '<script>alert("xss")</script>';
      const result = await contentStagingService.validateContent(maliciousText);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('potentially malicious patterns');
    });

    it('should warn about very long lines', async () => {
      const longLineText = 'x'.repeat(15000);
      const result = await contentStagingService.validateContent(longLineText);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings[0]).toContain('very long lines');
    });
  });

  describe('stageContent', () => {
    it('should stage valid content successfully', async () => {
      const content = 'Test content for staging';
      const metadata = { source: 'test' };
      
      const staged = await contentStagingService.stageContent(content, metadata);
      
      expect(staged.id).toBeDefined();
      expect(staged.contentType).toBe('text');
      expect(staged.size).toBe(Buffer.from(content).length);
      expect(staged.hash).toBeDefined();
      expect(staged.metadata.source).toBe('test');
      expect(staged.createdAt).toBeInstanceOf(Date);
      expect(staged.expiresAt).toBeInstanceOf(Date);
      
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('.staged'),
        Buffer.from(content)
      );
    });

    it('should reject invalid content during staging', async () => {
      const invalidContent = '';
      
      await expect(contentStagingService.stageContent(invalidContent))
        .rejects.toThrow('Content validation failed');
    });

    it('should handle buffer content', async () => {
      const buffer = Buffer.from('binary content');
      
      const staged = await contentStagingService.stageContent(buffer, {}, 'image/jpeg', 'test.jpg');
      
      expect(staged.contentType).toBe('image');
      expect(staged.originalName).toBe('test.jpg');
      expect(staged.mimeType).toBe('image/jpeg');
    });
  });

  describe('getStagedContent', () => {
    it('should retrieve staged content', async () => {
      const testId = 'test-id';
      const expectedContent = Buffer.from('test content');
      mockFs.readFile.mockResolvedValueOnce(expectedContent);
      
      const result = await contentStagingService.getStagedContent(testId);
      
      expect(result).toEqual(expectedContent);
      expect(mockFs.readFile).toHaveBeenCalledWith(
        expect.stringContaining(`${testId}.staged`)
      );
    });

    it('should return null for non-existent content', async () => {
      mockFs.readFile.mockRejectedValueOnce(new Error('File not found'));
      
      const result = await contentStagingService.getStagedContent('non-existent');
      
      expect(result).toBeNull();
    });
  });

  describe('removeStagedContent', () => {
    it('should remove staged content successfully', async () => {
      const testId = 'test-id';
      
      const result = await contentStagingService.removeStagedContent(testId);
      
      expect(result).toBe(true);
      expect(mockFs.unlink).toHaveBeenCalledWith(
        expect.stringContaining(`${testId}.staged`)
      );
    });

    it('should handle removal errors gracefully', async () => {
      mockFs.unlink.mockRejectedValueOnce(new Error('File not found'));
      
      const result = await contentStagingService.removeStagedContent('non-existent');
      
      expect(result).toBe(false);
    });
  });

  describe('publishToIPFS', () => {
    it('should publish content to IPFS and clean up', async () => {
      const testId = 'test-id';
      const testContent = Buffer.from('test content');
      mockFs.readFile.mockResolvedValueOnce(testContent);
      
      const cid = await contentStagingService.publishToIPFS(testId);
      
      expect(cid).toBe('QmTest123');
      expect(mockFs.unlink).toHaveBeenCalled(); // Cleanup called
    });

    it('should return null if content not found', async () => {
      mockFs.readFile.mockRejectedValueOnce(new Error('File not found'));
      
      const cid = await contentStagingService.publishToIPFS('non-existent');
      
      expect(cid).toBeNull();
    });
  });

  describe('cleanupExpiredContent', () => {
    it('should clean up expired files', async () => {
      const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      mockFs.readdir.mockResolvedValueOnce(['old.staged', 'new.staged', 'other.txt'] as any);
      mockFs.stat
        .mockResolvedValueOnce({ mtime: oldDate, size: 100 } as any) // old file
        .mockResolvedValueOnce({ mtime: new Date(), size: 100 } as any) // new file
        .mockResolvedValueOnce({ mtime: new Date(), size: 100 } as any); // other file (ignored)
      
      const cleanedCount = await contentStagingService.cleanupExpiredContent();
      
      expect(cleanedCount).toBe(1);
      expect(mockFs.unlink).toHaveBeenCalledTimes(1);
    });

    it('should handle cleanup errors gracefully', async () => {
      mockFs.readdir.mockRejectedValueOnce(new Error('Directory not found'));
      
      const cleanedCount = await contentStagingService.cleanupExpiredContent();
      
      expect(cleanedCount).toBe(0);
    });
  });

  describe('getStagingStats', () => {
    it('should return staging statistics', async () => {
      const file1Date = new Date('2023-01-01');
      const file2Date = new Date('2023-01-02');
      
      mockFs.readdir.mockResolvedValueOnce(['file1.staged', 'file2.staged', 'other.txt'] as any);
      mockFs.stat
        .mockResolvedValueOnce({ mtime: file1Date, size: 100 } as any)
        .mockResolvedValueOnce({ mtime: file2Date, size: 200 } as any)
        .mockResolvedValueOnce({ mtime: new Date(), size: 50 } as any); // other file (ignored)
      
      const stats = await contentStagingService.getStagingStats();
      
      expect(stats.totalFiles).toBe(2);
      expect(stats.totalSize).toBe(300);
      expect(stats.oldestFile).toEqual(file1Date);
      expect(stats.newestFile).toEqual(file2Date);
    });

    it('should handle empty staging directory', async () => {
      mockFs.readdir.mockResolvedValueOnce([] as any);
      
      const stats = await contentStagingService.getStagingStats();
      
      expect(stats.totalFiles).toBe(0);
      expect(stats.totalSize).toBe(0);
      expect(stats.oldestFile).toBeNull();
      expect(stats.newestFile).toBeNull();
    });

    it('should handle stats errors gracefully', async () => {
      mockFs.readdir.mockRejectedValueOnce(new Error('Directory not found'));
      
      const stats = await contentStagingService.getStagingStats();
      
      expect(stats.totalFiles).toBe(0);
      expect(stats.totalSize).toBe(0);
      expect(stats.oldestFile).toBeNull();
      expect(stats.newestFile).toBeNull();
    });
  });
});