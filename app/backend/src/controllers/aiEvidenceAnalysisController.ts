import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { aiEvidenceAnalysisService, EvidenceAnalysisResult } from '../services/aiEvidenceAnalysisService';
import multer from 'multer';
import path from 'path';

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

export class AIEvidenceAnalysisController {
  /**
   * Analyze uploaded evidence file
   */
  async analyzeEvidenceFile(req: Request, res: Response): Promise<void> {
    try {
      const { disputeId, evidenceType, description } = req.body;
      const file = req.file;

      if (!file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      if (!disputeId || !evidenceType) {
        res.status(400).json({ error: 'Missing required fields: disputeId, evidenceType' });
        return;
      }

      // Determine analysis type based on file type
      let analysisType: 'text' | 'image' | 'document';
      if (file.mimetype.startsWith('image/')) {
        analysisType = 'image';
      } else if (file.mimetype === 'text/plain') {
        analysisType = 'text';
      } else {
        analysisType = 'document';
      }

      // Generate evidence ID
      const evidenceId = `evidence_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Prepare content for analysis
      let content: Buffer | string;
      if (analysisType === 'text') {
        content = file.buffer.toString('utf-8');
      } else {
        content = file.buffer;
      }

      // Perform AI analysis
      const analysisResult = await aiEvidenceAnalysisService.analyzeEvidence(
        evidenceId,
        analysisType,
        content,
        {
          filename: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          disputeId,
          description
        }
      );

      // Find similar evidence
      const similarEvidence = await aiEvidenceAnalysisService.findSimilarEvidence(
        evidenceId,
        analysisResult
      );

      res.json({
        success: true,
        evidenceId,
        analysis: analysisResult,
        similarEvidence: similarEvidence.slice(0, 5), // Top 5 similar pieces
        recommendations: this.generateProcessingRecommendations(analysisResult)
      });

    } catch (error) {
      safeLogger.error('Error analyzing evidence file:', error);
      res.status(500).json({ 
        error: 'Failed to analyze evidence',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Analyze text evidence
   */
  async analyzeTextEvidence(req: Request, res: Response): Promise<void> {
    try {
      const { disputeId, text, evidenceType, description } = req.body;

      if (!disputeId || !text || !evidenceType) {
        res.status(400).json({ error: 'Missing required fields: disputeId, text, evidenceType' });
        return;
      }

      // Generate evidence ID
      const evidenceId = `text_evidence_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Perform AI analysis
      const analysisResult = await aiEvidenceAnalysisService.analyzeEvidence(
        evidenceId,
        'text',
        text,
        {
          disputeId,
          evidenceType,
          description,
          length: text.length
        }
      );

      // Find similar evidence
      const similarEvidence = await aiEvidenceAnalysisService.findSimilarEvidence(
        evidenceId,
        analysisResult
      );

      res.json({
        success: true,
        evidenceId,
        analysis: analysisResult,
        similarEvidence: similarEvidence.slice(0, 5),
        recommendations: this.generateProcessingRecommendations(analysisResult)
      });

    } catch (error) {
      safeLogger.error('Error analyzing text evidence:', error);
      res.status(500).json({ 
        error: 'Failed to analyze text evidence',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Batch analyze multiple evidence items
   */
  async batchAnalyzeEvidence(req: Request, res: Response): Promise<void> {
    try {
      const { disputeId, evidenceItems } = req.body;

      if (!disputeId || !Array.isArray(evidenceItems) || evidenceItems.length === 0) {
        res.status(400).json({ error: 'Missing required fields: disputeId, evidenceItems array' });
        return;
      }

      const results = [];
      const errors = [];

      for (const [index, item] of evidenceItems.entries()) {
        try {
          const evidenceId = `batch_evidence_${Date.now()}_${index}`;
          
          let analysisType: 'text' | 'image' | 'document';
          if (item.type === 'text') {
            analysisType = 'text';
          } else if (item.type === 'image') {
            analysisType = 'image';
          } else {
            analysisType = 'document';
          }

          const analysisResult = await aiEvidenceAnalysisService.analyzeEvidence(
            evidenceId,
            analysisType,
            item.content,
            {
              disputeId,
              evidenceType: item.evidenceType,
              description: item.description,
              batchIndex: index
            }
          );

          results.push({
            index,
            evidenceId,
            analysis: analysisResult,
            status: 'success'
          });

        } catch (error) {
          errors.push({
            index,
            error: error instanceof Error ? error.message : 'Unknown error',
            status: 'failed'
          });
        }
      }

      // Generate batch summary
      const batchSummary = this.generateBatchSummary(results);

      res.json({
        success: true,
        processed: results.length,
        failed: errors.length,
        results,
        errors,
        batchSummary
      });

    } catch (error) {
      safeLogger.error('Error in batch analysis:', error);
      res.status(500).json({ 
        error: 'Failed to perform batch analysis',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get evidence analysis results
   */
  async getAnalysisResults(req: Request, res: Response): Promise<void> {
    try {
      const { evidenceId } = req.params;

      if (!evidenceId) {
        res.status(400).json({ error: 'Evidence ID is required' });
        return;
      }

      // In production, retrieve from database
      // For now, return mock data
      const mockAnalysis: EvidenceAnalysisResult = {
        evidenceId,
        analysisType: 'image',
        authenticity: {
          score: 0.85,
          confidence: 0.9,
          flags: []
        },
        relevance: {
          score: 0.78,
          keywords: ['product', 'receipt', 'damage'],
          categories: ['transaction_evidence']
        },
        content: {
          summary: 'Image shows product damage and receipt',
          entities: ['product', 'receipt'],
          metadata: {
            width: 1024,
            height: 768,
            format: 'jpeg'
          }
        },
        riskFactors: [],
        recommendations: ['Evidence appears authentic and relevant']
      };

      res.json({
        success: true,
        analysis: mockAnalysis
      });

    } catch (error) {
      safeLogger.error('Error retrieving analysis results:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve analysis results',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Compare evidence authenticity
   */
  async compareEvidenceAuthenticity(req: Request, res: Response): Promise<void> {
    try {
      const { evidenceIds } = req.body;

      if (!Array.isArray(evidenceIds) || evidenceIds.length < 2) {
        res.status(400).json({ error: 'At least 2 evidence IDs required for comparison' });
        return;
      }

      const comparisons = [];

      // Compare each pair of evidence
      for (let i = 0; i < evidenceIds.length; i++) {
        for (let j = i + 1; j < evidenceIds.length; j++) {
          const comparison = await this.compareEvidencePair(evidenceIds[i], evidenceIds[j]);
          comparisons.push(comparison);
        }
      }

      // Generate comparison summary
      const summary = this.generateComparisonSummary(comparisons);

      res.json({
        success: true,
        comparisons,
        summary
      });

    } catch (error) {
      safeLogger.error('Error comparing evidence authenticity:', error);
      res.status(500).json({ 
        error: 'Failed to compare evidence authenticity',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get evidence manipulation detection results
   */
  async getManipulationDetection(req: Request, res: Response): Promise<void> {
    try {
      const { evidenceId } = req.params;

      if (!evidenceId) {
        res.status(400).json({ error: 'Evidence ID is required' });
        return;
      }

      // Mock manipulation detection results
      const manipulationResults = {
        evidenceId,
        manipulationDetected: false,
        manipulationScore: 0.15,
        manipulationTypes: [],
        confidence: 0.92,
        technicalAnalysis: {
          compressionArtifacts: 'normal',
          noisePatterns: 'consistent',
          edgeAnalysis: 'natural',
          colorHistogram: 'normal'
        },
        recommendations: [
          'Evidence appears to be unmanipulated',
          'High confidence in authenticity assessment'
        ]
      };

      res.json({
        success: true,
        manipulation: manipulationResults
      });

    } catch (error) {
      safeLogger.error('Error getting manipulation detection results:', error);
      res.status(500).json({ 
        error: 'Failed to get manipulation detection results',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Private helper methods

  private generateProcessingRecommendations(analysisResult: EvidenceAnalysisResult): string[] {
    const recommendations = [...analysisResult.recommendations];

    // Add processing-specific recommendations
    if (analysisResult.authenticity.score < 0.6) {
      recommendations.push('Consider requesting additional verification');
    }

    if (analysisResult.relevance.score < 0.5) {
      recommendations.push('Evidence may not be directly relevant to the dispute');
    }

    if (analysisResult.riskFactors.length > 2) {
      recommendations.push('Multiple risk factors detected - manual review recommended');
    }

    if (analysisResult.authenticity.confidence < 0.7) {
      recommendations.push('Low confidence in analysis - consider expert review');
    }

    return recommendations;
  }

  private generateBatchSummary(results: any[]): any {
    if (results.length === 0) {
      return { message: 'No results to summarize' };
    }

    const authenticityScores = results.map(r => r.analysis.authenticity.score);
    const relevanceScores = results.map(r => r.analysis.relevance.score);
    const riskFactorCounts = results.map(r => r.analysis.riskFactors.length);

    return {
      totalEvidence: results.length,
      averageAuthenticity: authenticityScores.reduce((a, b) => a + b, 0) / authenticityScores.length,
      averageRelevance: relevanceScores.reduce((a, b) => a + b, 0) / relevanceScores.length,
      highRiskEvidence: results.filter(r => r.analysis.riskFactors.length > 2).length,
      lowAuthenticityEvidence: results.filter(r => r.analysis.authenticity.score < 0.6).length,
      recommendationsCount: results.reduce((sum, r) => sum + r.analysis.recommendations.length, 0)
    };
  }

  private async compareEvidencePair(evidenceId1: string, evidenceId2: string): Promise<any> {
    // Mock comparison - in production, retrieve actual analysis results
    return {
      evidence1: evidenceId1,
      evidence2: evidenceId2,
      similarityScore: Math.random() * 0.5 + 0.3, // 0.3-0.8 range
      authenticityDifference: Math.random() * 0.2, // 0-0.2 range
      consistencyScore: Math.random() * 0.4 + 0.6, // 0.6-1.0 range
      conflictingElements: Math.random() > 0.7 ? ['timestamp_mismatch'] : [],
      recommendation: Math.random() > 0.5 ? 'Evidence appears consistent' : 'Minor inconsistencies detected'
    };
  }

  private generateComparisonSummary(comparisons: any[]): any {
    const similarityScores = comparisons.map(c => c.similarityScore);
    const consistencyScores = comparisons.map(c => c.consistencyScore);
    const conflictCount = comparisons.filter(c => c.conflictingElements.length > 0).length;

    return {
      totalComparisons: comparisons.length,
      averageSimilarity: similarityScores.reduce((a, b) => a + b, 0) / similarityScores.length,
      averageConsistency: consistencyScores.reduce((a, b) => a + b, 0) / consistencyScores.length,
      conflictingPairs: conflictCount,
      overallConsistency: conflictCount === 0 ? 'high' : conflictCount < comparisons.length / 2 ? 'medium' : 'low'
    };
  }
}

// Create multer middleware for file uploads
export const uploadEvidence = upload.single('evidence');
export const uploadMultipleEvidence = upload.array('evidence', 10);

export const aiEvidenceAnalysisController = new AIEvidenceAnalysisController();
