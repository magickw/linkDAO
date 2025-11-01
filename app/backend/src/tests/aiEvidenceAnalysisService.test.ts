import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { aiEvidenceAnalysisService, AIEvidenceAnalysisService } from '../services/aiEvidenceAnalysisService';

// Mock dependencies
jest.mock('openai');
jest.mock('@tensorflow/tfjs-node');
jest.mock('sharp');
jest.mock('../db');

describe('AIEvidenceAnalysisService', () => {
  let service: AIEvidenceAnalysisService;

  beforeEach(() => {
    service = new AIEvidenceAnalysisService();
    jest.clearAllMocks();
  });

  describe('analyzeEvidence', () => {
    it('should analyze text evidence successfully', async () => {
      const evidenceId = 'test_evidence_1';
      const text = 'I never received the product I ordered. Order #12345 was placed on January 15th.';
      
      const result = await service.analyzeEvidence(evidenceId, 'text', text);
      
      expect(result).toBeDefined();
      expect(result.evidenceId).toBe(evidenceId);
      expect(result.analysisType).toBe('text');
      expect(result.authenticity).toBeDefined();
      expect(result.relevance).toBeDefined();
      expect(result.content).toBeDefined();
      expect(typeof result.authenticity.score).toBe('number');
      expect(result.authenticity.score).toBeGreaterThanOrEqual(0);
      expect(result.authenticity.score).toBeLessThanOrEqual(1);
    });

    it('should analyze image evidence successfully', async () => {
      const evidenceId = 'test_evidence_2';
      const imageBuffer = Buffer.from('fake image data');
      
      const result = await service.analyzeEvidence(evidenceId, 'image', imageBuffer);
      
      expect(result).toBeDefined();
      expect(result.evidenceId).toBe(evidenceId);
      expect(result.analysisType).toBe('image');
      expect(result.authenticity).toBeDefined();
      expect(result.relevance).toBeDefined();
      expect(result.content).toBeDefined();
    });

    it('should analyze document evidence successfully', async () => {
      const evidenceId = 'test_evidence_3';
      const documentBuffer = Buffer.from('fake document data');
      
      const result = await service.analyzeEvidence(evidenceId, 'document', documentBuffer);
      
      expect(result).toBeDefined();
      expect(result.evidenceId).toBe(evidenceId);
      expect(result.analysisType).toBe('document');
      expect(result.authenticity).toBeDefined();
      expect(result.relevance).toBeDefined();
      expect(result.content).toBeDefined();
    });

    it('should throw error for unsupported evidence type', async () => {
      const evidenceId = 'test_evidence_4';
      const content = 'test content';
      
      await expect(
        service.analyzeEvidence(evidenceId, 'unsupported' as any, content)
      ).rejects.toThrow('Unsupported evidence type: unsupported');
    });
  });

  describe('analyzeTextEvidence', () => {
    it('should detect AI-generated content', async () => {
      const evidenceId = 'test_ai_text';
      const aiText = 'As an AI, I cannot provide information about this dispute.';
      
      const result = await service.analyzeTextEvidence(evidenceId, aiText);
      
      expect(result.authenticity.flags).toContain('possible_ai_generated');
      expect(result.authenticity.score).toBeLessThan(0.8);
    });

    it('should extract entities from text', async () => {
      const evidenceId = 'test_entities';
      const text = 'Contact me at john@example.com or call 555-123-4567 about order #12345';
      
      const result = await service.analyzeTextEvidence(evidenceId, text);
      
      expect(result.content.entities).toContain('john@example.com');
      expect(result.content.entities).toContain('555-123-4567');
      expect(result.content.entities).toContain('#12345');
    });

    it('should calculate sentiment correctly', async () => {
      const evidenceId = 'test_sentiment';
      const positiveText = 'I am very satisfied with the excellent service and great product quality.';
      
      const result = await service.analyzeTextEvidence(evidenceId, positiveText);
      
      expect(result.content.sentiment).toBeGreaterThan(0);
    });

    it('should detect low coherence text', async () => {
      const evidenceId = 'test_coherence';
      const incoherentText = 'Product bad. Money want. No good service. Angry customer.';
      
      const result = await service.analyzeTextEvidence(evidenceId, incoherentText);
      
      expect(result.content.metadata.coherence).toBeLessThan(0.5);
    });
  });

  describe('analyzeImageEvidence', () => {
    it('should detect image manipulation', async () => {
      const evidenceId = 'test_manipulation';
      const imageBuffer = Buffer.from('manipulated image data');
      
      // Mock manipulation detection to return positive result
      const originalDetectManipulation = (service as any).detectImageManipulation;
      (service as any).detectImageManipulation = jest.fn().mockResolvedValue({
        manipulationDetected: true,
        manipulationScore: 0.8,
        manipulationTypes: ['clone_stamp', 'color_adjustment'],
        metadata: { dimensions: { width: 1024, height: 768 }, format: 'jpeg', fileSize: 1024 },
        contentAnalysis: { objects: [], inappropriate: false }
      });
      
      const result = await service.analyzeImageEvidence(evidenceId, imageBuffer);
      
      expect(result.authenticity.flags).toContain('clone_stamp');
      expect(result.authenticity.score).toBeLessThan(0.8);
      expect(result.riskFactors).toContain('Image manipulation detected');
      
      // Restore original method
      (service as any).detectImageManipulation = originalDetectManipulation;
    });

    it('should analyze image content', async () => {
      const evidenceId = 'test_content';
      const imageBuffer = Buffer.from('product image data');
      
      const result = await service.analyzeImageEvidence(evidenceId, imageBuffer);
      
      expect(result.content.entities).toBeDefined();
      expect(Array.isArray(result.content.entities)).toBe(true);
      expect(result.relevance.categories).toBeDefined();
    });
  });

  describe('findSimilarEvidence', () => {
    it('should find similar evidence based on content', async () => {
      const evidenceId = 'test_similar';
      const analysisResult = {
        evidenceId,
        analysisType: 'text' as const,
        authenticity: { score: 0.8, confidence: 0.9, flags: [] },
        relevance: { 
          score: 0.7, 
          keywords: ['product', 'order', 'delivery'], 
          categories: ['transaction_evidence'] 
        },
        content: { 
          summary: 'Customer complaint about delivery', 
          entities: ['product', 'order'], 
          metadata: {} 
        },
        riskFactors: [],
        recommendations: []
      };
      
      const similarEvidence = await service.findSimilarEvidence(evidenceId, analysisResult);
      
      expect(Array.isArray(similarEvidence)).toBe(true);
      similarEvidence.forEach(item => {
        expect(item).toHaveProperty('evidenceId');
        expect(item).toHaveProperty('similarity');
        expect(item).toHaveProperty('disputeId');
        expect(typeof item.similarity).toBe('number');
        expect(item.similarity).toBeGreaterThanOrEqual(0);
        expect(item.similarity).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Text Analysis Helper Methods', () => {
    it('should extract keywords correctly', async () => {
      const text = 'The product delivery was delayed and the customer service was unhelpful';
      const keywords = (service as any).extractKeywords(text);
      
      expect(Array.isArray(keywords)).toBe(true);
      expect(keywords).toContain('product');
      expect(keywords).toContain('delivery');
      expect(keywords).toContain('customer');
      expect(keywords).not.toContain('the'); // Stop word should be filtered
    });

    it('should calculate sentiment for negative text', async () => {
      const negativeText = 'This product is terrible and awful, very disappointed';
      const sentiment = (service as any).calculateSentiment(negativeText);
      
      expect(sentiment).toBeLessThan(0);
    });

    it('should detect repeated phrases', async () => {
      const textWithRepeats = 'This is a test sentence. This is a test sentence. Different content here.';
      const repeatedPhrases = (service as any).findRepeatedPhrases(textWithRepeats);
      
      expect(repeatedPhrases.length).toBeGreaterThan(0);
    });

    it('should categorize text correctly', async () => {
      const keywords = ['order', 'delivery', 'payment', 'refund'];
      const categories = (service as any).categorizeText('test text', keywords);
      
      expect(categories).toContain('transaction_evidence');
      expect(categories).toContain('delivery_evidence');
    });
  });

  describe('Image Analysis Helper Methods', () => {
    it('should calculate image authenticity score', async () => {
      const manipulationAnalysis = {
        manipulationDetected: false,
        manipulationScore: 0.1,
        manipulationTypes: [],
        metadata: {},
        contentAnalysis: {}
      };
      const metadataAnalysis = { metadata: { density: 72 } };
      const contentAnalysis = { inappropriate: false };
      
      const result = (service as any).calculateImageAuthenticity(
        manipulationAnalysis,
        metadataAnalysis,
        contentAnalysis
      );
      
      expect(result.score).toBeGreaterThan(0.8);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should identify image risk factors', async () => {
      const manipulationAnalysis = {
        manipulationDetected: true,
        manipulationScore: 0.7,
        manipulationTypes: ['clone_stamp'],
        metadata: {},
        contentAnalysis: {}
      };
      const contentAnalysis = { inappropriate: true };
      
      const risks = (service as any).identifyImageRiskFactors(manipulationAnalysis, contentAnalysis);
      
      expect(risks).toContain('Image manipulation detected');
      expect(risks).toContain('Inappropriate content detected');
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully in text analysis', async () => {
      const evidenceId = 'test_error';
      const invalidText = null;
      
      await expect(
        service.analyzeTextEvidence(evidenceId, invalidText as any)
      ).rejects.toThrow();
    });

    it('should handle errors gracefully in image analysis', async () => {
      const evidenceId = 'test_error';
      const invalidBuffer = null;
      
      await expect(
        service.analyzeImageEvidence(evidenceId, invalidBuffer as any)
      ).rejects.toThrow();
    });
  });

  describe('Performance Tests', () => {
    it('should analyze text evidence within reasonable time', async () => {
      const evidenceId = 'test_performance';
      const longText = 'This is a test. '.repeat(1000); // 1000 repetitions
      
      const startTime = Date.now();
      const result = await service.analyzeTextEvidence(evidenceId, longText);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result).toBeDefined();
    });

    it('should handle multiple concurrent analyses', async () => {
      const promises = [];
      
      for (let i = 0; i < 5; i++) {
        const promise = service.analyzeTextEvidence(
          `concurrent_test_${i}`,
          `Test evidence content ${i}`
        );
        promises.push(promise);
      }
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result.evidenceId).toBe(`concurrent_test_${index}`);
      });
    });
  });
});
