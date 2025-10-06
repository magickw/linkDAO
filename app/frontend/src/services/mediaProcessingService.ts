// Mock Media Processing Service for testing
export const mediaProcessingService = {
  optimizeImage: jest.fn().mockResolvedValue(new File([''], 'test.jpg')),
  uploadToIPFS: jest.fn().mockResolvedValue('bafybeictest'),
  processMedia: jest.fn().mockResolvedValue({
    success: true,
    processedFile: new File([''], 'test.jpg')
  })
};