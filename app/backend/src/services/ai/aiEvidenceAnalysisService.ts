import { OpenAI } from 'openai';
import { safeLogger } from '../../utils/safeLogger';
import * as tf from '@tensorflow/tfjs-node';
let sharp;
let sharpAvailable = false;

// Dynamically import sharp with error handling
try {
  sharp = require('sharp');
  sharpAvailable = true;
  console.log('✅ Sharp module loaded successfully in aiEvidenceAnalysisService');
} catch (error) {
  console.warn('⚠️ Sharp module not available in aiEvidenceAnalysisService:', error.message);
  sharp = {
    resize: () => ({ toBuffer: () => Promise.reject(new Error('Sharp not available')) })
  };
}
import crypto from 'crypto';
import { db } from '../../db';
import { disputes } from '../../db/schema';
import { eq } from 'drizzle-orm';

export interface EvidenceAnalysisResult {
  evidenceId: string;
  analysisType: 'text' | 'image' | 'document';
  authenticity: {
    score: number; // 0-1, higher is more authentic
    confidence: number; // 0-1, confidence in the score
    flags: string[]; // Potential manipulation indicators
  };
  relevance: {
    score: number; // 0-1, higher is more relevant
    keywords: string[];
    categories: string[];
  };
  content: {
    summary: string;
    entities: string[];
    sentiment?: number; // -1 to 1 for text
    metadata: Record<string, any>;
  };
  riskFactors: string[];
  recommendations: string[];
}

export interface ImageAnalysisResult {
  manipulationDetected: boolean;
  manipulationScore: number;
  manipulationTypes: string[];
  metadata: {
    dimensions: { width: number; height: number };
    format: string;
    fileSize: number;
    exifData?: Record<string, any>;
  };
  contentAnalysis: {
    objects: Array<{ name: string; confidence: number; bbox?: number[] }>;
    text?: string;
    faces?: number;
    inappropriate?: boolean;
  };
}

export interface TextAnalysisResult {
  language: string;
  sentiment: number;
  entities: Array<{ text: string; type: string; confidence: number }>;
  keywords: string[];
  coherence: number;
  authenticity: number;
  plagiarismScore?: number;
}

export interface DocumentAnalysisResult {
  documentType: string;
  authenticity: number;
  extractedText: string;
  structure: {
    pages: number;
    sections: string[];
    tables?: number;
    images?: number;
  };
  verification: {
    signatures?: boolean;
    watermarks?: boolean;
    timestamps?: Date[];
  };
}

export class AIEvidenceAnalysisService {
  private openai: OpenAI;
  private imageModel: tf.LayersModel | null = null;
  private textModel: tf.LayersModel | null = null;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.initializeModels();
  }

  private async initializeModels(): Promise<void> {
    try {
      // In production, load pre-trained models for manipulation detection
      // For now, we'll use mock models
      safeLogger.info('Initializing AI models for evidence analysis...');
      
      // Mock model initialization
      this.imageModel = await this.createMockImageModel();
      this.textModel = await this.createMockTextModel();
      
      safeLogger.info('AI models initialized successfully');
    } catch (error) {
      safeLogger.error('Error initializing AI models:', error);
    }
  }

  /**
   * Analyze evidence comprehensively
   */
  async analyzeEvidence(
    evidenceId: string,
    evidenceType: 'text' | 'image' | 'document',
    content: Buffer | string,
    metadata?: Record<string, any>
  ): Promise<EvidenceAnalysisResult> {
    try {
      let analysisResult: EvidenceAnalysisResult;

      switch (evidenceType) {
        case 'image':
          analysisResult = await this.analyzeImageEvidence(evidenceId, content as Buffer, metadata);
          break;
        case 'text':
          analysisResult = await this.analyzeTextEvidence(evidenceId, content as string, metadata);
          break;
        case 'document':
          analysisResult = await this.analyzeDocumentEvidence(evidenceId, content as Buffer, metadata);
          break;
        default:
          throw new Error(`Unsupported evidence type: ${evidenceType}`);
      }

      // Store analysis results
      await this.storeAnalysisResults(evidenceId, analysisResult);

      return analysisResult;
    } catch (error) {
      safeLogger.error('Error analyzing evidence:', error);
      throw error;
    }
  }

  /**
   * Analyze image evidence using computer vision
   */
  async analyzeImageEvidence(
    evidenceId: string,
    imageBuffer: Buffer,
    metadata?: Record<string, any>
  ): Promise<EvidenceAnalysisResult> {
    try {
      // Image preprocessing
      const processedImage = await this.preprocessImage(imageBuffer);
      
      // Manipulation detection
      const manipulationAnalysis = await this.detectImageManipulation(processedImage);
      
      // Content analysis
      const contentAnalysis = await this.analyzeImageContent(processedImage);
      
      // Metadata analysis
      const metadataAnalysis = await this.analyzeImageMetadata(imageBuffer);
      
      // Calculate authenticity score
      const authenticityScore = this.calculateImageAuthenticity(
        manipulationAnalysis,
        metadataAnalysis,
        contentAnalysis
      );

      // Calculate relevance score
      const relevanceScore = await this.calculateImageRelevance(
        contentAnalysis,
        evidenceId
      );

      return {
        evidenceId,
        analysisType: 'image',
        authenticity: {
          score: authenticityScore.score,
          confidence: authenticityScore.confidence,
          flags: manipulationAnalysis.manipulationTypes
        },
        relevance: {
          score: relevanceScore.score,
          keywords: relevanceScore.keywords,
          categories: relevanceScore.categories
        },
        content: {
          summary: contentAnalysis.summary,
          entities: contentAnalysis.objects.map(obj => obj.name),
          metadata: {
            ...metadataAnalysis.metadata,
            manipulation: manipulationAnalysis
          }
        },
        riskFactors: this.identifyImageRiskFactors(manipulationAnalysis, contentAnalysis),
        recommendations: this.generateImageRecommendations(authenticityScore, relevanceScore)
      };
    } catch (error) {
      safeLogger.error('Error analyzing image evidence:', error);
      throw error;
    }
  }

  /**
   * Analyze text evidence using NLP
   */
  async analyzeTextEvidence(
    evidenceId: string,
    text: string,
    metadata?: Record<string, any>
  ): Promise<EvidenceAnalysisResult> {
    try {
      // Text preprocessing
      const processedText = this.preprocessText(text);
      
      // NLP analysis
      const nlpAnalysis = await this.performNLPAnalysis(processedText);
      
      // Authenticity analysis
      const authenticityAnalysis = await this.analyzeTextAuthenticity(processedText);
      
      // Relevance analysis
      const relevanceAnalysis = await this.analyzeTextRelevance(processedText, evidenceId);

      return {
        evidenceId,
        analysisType: 'text',
        authenticity: {
          score: authenticityAnalysis.authenticity,
          confidence: authenticityAnalysis.confidence,
          flags: authenticityAnalysis.flags
        },
        relevance: {
          score: relevanceAnalysis.score,
          keywords: nlpAnalysis.keywords,
          categories: relevanceAnalysis.categories
        },
        content: {
          summary: await this.generateTextSummary(processedText),
          entities: nlpAnalysis.entities.map(e => e.text),
          sentiment: nlpAnalysis.sentiment,
          metadata: {
            language: nlpAnalysis.language,
            coherence: nlpAnalysis.coherence,
            wordCount: processedText.split(' ').length
          }
        },
        riskFactors: this.identifyTextRiskFactors(nlpAnalysis, authenticityAnalysis),
        recommendations: this.generateTextRecommendations(authenticityAnalysis, relevanceAnalysis)
      };
    } catch (error) {
      safeLogger.error('Error analyzing text evidence:', error);
      throw error;
    }
  }

  /**
   * Analyze document evidence
   */
  async analyzeDocumentEvidence(
    evidenceId: string,
    documentBuffer: Buffer,
    metadata?: Record<string, any>
  ): Promise<EvidenceAnalysisResult> {
    try {
      // Document processing
      const documentAnalysis = await this.processDocument(documentBuffer);
      
      // Extract and analyze text content
      const textAnalysis = await this.analyzeTextEvidence(
        evidenceId,
        documentAnalysis.extractedText,
        metadata
      );
      
      // Document-specific authenticity checks
      const docAuthenticity = await this.analyzeDocumentAuthenticity(documentAnalysis);
      
      // Combine analyses
      return {
        ...textAnalysis,
        analysisType: 'document',
        authenticity: {
          score: Math.min(textAnalysis.authenticity.score, docAuthenticity.authenticity),
          confidence: (textAnalysis.authenticity.confidence + docAuthenticity.confidence) / 2,
          flags: [...textAnalysis.authenticity.flags, ...docAuthenticity.flags]
        },
        content: {
          ...textAnalysis.content,
          metadata: {
            ...textAnalysis.content.metadata,
            document: documentAnalysis
          }
        },
        riskFactors: [
          ...textAnalysis.riskFactors,
          ...this.identifyDocumentRiskFactors(documentAnalysis, docAuthenticity)
        ],
        recommendations: [
          ...textAnalysis.recommendations,
          ...this.generateDocumentRecommendations(docAuthenticity)
        ]
      };
    } catch (error) {
      safeLogger.error('Error analyzing document evidence:', error);
      throw error;
    }
  }

  /**
   * Find similar evidence patterns
   */
  async findSimilarEvidence(
    evidenceId: string,
    analysisResult: EvidenceAnalysisResult
  ): Promise<Array<{ evidenceId: string; similarity: number; disputeId: string }>> {
    try {
      // Get all evidence from database
      const allEvidence = await db.select().from(disputes);
      
      const similarities: Array<{ evidenceId: string; similarity: number; disputeId: string }> = [];
      
      for (const evidence of allEvidence) {
        if (evidence.id.toString() === evidenceId) continue;
        
        // Calculate similarity based on content and metadata
        const similarity = await this.calculateEvidenceSimilarity(
          analysisResult,
          evidence
        );
        
        if (similarity > 0.7) { // High similarity threshold
          similarities.push({
            evidenceId: evidence.id.toString(),
            similarity,
            disputeId: evidence.escrowId
          });
        }
      }
      
      return similarities.sort((a, b) => b.similarity - a.similarity);
    } catch (error) {
      safeLogger.error('Error finding similar evidence:', error);
      return [];
    }
  }

  // Private helper methods

  private async preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
    try {
      // Normalize image format and size
      return await sharp(imageBuffer)
        .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 90 })
        .toBuffer();
    } catch (error) {
      safeLogger.error('Error preprocessing image:', error);
      throw error;
    }
  }

  private async detectImageManipulation(imageBuffer: Buffer): Promise<ImageAnalysisResult> {
    try {
      // Mock implementation - in production, use specialized models
      const mockAnalysis: ImageAnalysisResult = {
        manipulationDetected: Math.random() > 0.8,
        manipulationScore: Math.random() * 0.3, // Low manipulation score for most images
        manipulationTypes: [],
        metadata: {
          dimensions: { width: 1024, height: 1024 },
          format: 'jpeg',
          fileSize: imageBuffer.length
        },
        contentAnalysis: {
          objects: [
            { name: 'product', confidence: 0.9 },
            { name: 'packaging', confidence: 0.7 }
          ],
          inappropriate: false
        }
      };

      // Add manipulation types if detected
      if (mockAnalysis.manipulationDetected) {
        mockAnalysis.manipulationTypes = ['color_adjustment', 'clone_stamp'];
      }

      return mockAnalysis;
    } catch (error) {
      safeLogger.error('Error detecting image manipulation:', error);
      throw error;
    }
  }

  private async analyzeImageContent(imageBuffer: Buffer): Promise<any> {
    try {
      // Mock content analysis - in production, use computer vision APIs
      return {
        summary: 'Image shows product packaging and documentation',
        objects: [
          { name: 'product', confidence: 0.9 },
          { name: 'receipt', confidence: 0.8 },
          { name: 'packaging', confidence: 0.7 }
        ],
        text: 'Product receipt #12345',
        faces: 0,
        inappropriate: false
      };
    } catch (error) {
      safeLogger.error('Error analyzing image content:', error);
      throw error;
    }
  }

  private async analyzeImageMetadata(imageBuffer: Buffer): Promise<any> {
    try {
      // Extract EXIF data and other metadata
      const metadata = await sharp(imageBuffer).metadata();
      
      return {
        metadata: {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          density: metadata.density,
          hasProfile: metadata.hasProfile,
          channels: metadata.channels
        }
      };
    } catch (error) {
      safeLogger.error('Error analyzing image metadata:', error);
      return { metadata: {} };
    }
  }

  private calculateImageAuthenticity(
    manipulationAnalysis: ImageAnalysisResult,
    metadataAnalysis: any,
    contentAnalysis: any
  ): { score: number; confidence: number } {
    let score = 1.0;
    let confidence = 0.8;

    // Reduce score based on manipulation detection
    if (manipulationAnalysis.manipulationDetected) {
      score -= manipulationAnalysis.manipulationScore;
      confidence = Math.max(0.6, confidence - 0.2);
    }

    // Check for suspicious metadata patterns
    if (!metadataAnalysis.metadata.density) {
      score -= 0.1;
    }

    return { score: Math.max(0, score), confidence };
  }

  private async calculateImageRelevance(
    contentAnalysis: any,
    evidenceId: string
  ): Promise<{ score: number; keywords: string[]; categories: string[] }> {
    try {
      // Get dispute context to determine relevance
      const evidence = await db.select()
        .from(disputes)
        .where(eq(disputes.id, parseInt(evidenceId)))
        .limit(1);

      if (evidence.length === 0) {
        return { score: 0.5, keywords: [], categories: [] };
      }

      // Mock relevance calculation
      const keywords = contentAnalysis.objects.map((obj: any) => obj.name);
      const categories = ['product_evidence', 'documentation'];
      
      // Calculate relevance based on dispute type and content
      let score = 0.7;
      if (keywords.includes('product')) score += 0.2;
      if (keywords.includes('receipt')) score += 0.1;

      return {
        score: Math.min(1.0, score),
        keywords,
        categories
      };
    } catch (error) {
      safeLogger.error('Error calculating image relevance:', error);
      return { score: 0.5, keywords: [], categories: [] };
    }
  }

  private preprocessText(text: string): string {
    // Clean and normalize text
    return text
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s.,!?-]/g, '');
  }

  private async performNLPAnalysis(text: string): Promise<TextAnalysisResult> {
    try {
      // Mock NLP analysis - in production, use advanced NLP models
      const words = text.split(' ');
      const entities = this.extractEntities(text);
      const keywords = this.extractKeywords(text);
      
      return {
        language: 'en',
        sentiment: this.calculateSentiment(text),
        entities,
        keywords,
        coherence: this.calculateCoherence(text),
        authenticity: this.calculateTextAuthenticity(text)
      };
    } catch (error) {
      safeLogger.error('Error performing NLP analysis:', error);
      throw error;
    }
  }

  private extractEntities(text: string): Array<{ text: string; type: string; confidence: number }> {
    // Mock entity extraction
    const entities = [];
    
    // Look for common patterns
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const phoneRegex = /\b\d{3}-\d{3}-\d{4}\b/g;
    const orderRegex = /#\d+/g;
    
    const emails = text.match(emailRegex) || [];
    const phones = text.match(phoneRegex) || [];
    const orders = text.match(orderRegex) || [];
    
    emails.forEach(email => entities.push({ text: email, type: 'EMAIL', confidence: 0.9 }));
    phones.forEach(phone => entities.push({ text: phone, type: 'PHONE', confidence: 0.9 }));
    orders.forEach(order => entities.push({ text: order, type: 'ORDER_ID', confidence: 0.8 }));
    
    return entities;
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction
    const words = text.toLowerCase().split(/\s+/);
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    
    const wordFreq: Record<string, number> = {};
    words.forEach(word => {
      if (word.length > 3 && !stopWords.has(word)) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    });
    
    return Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  private calculateSentiment(text: string): number {
    // Simple sentiment analysis
    const positiveWords = ['good', 'great', 'excellent', 'satisfied', 'happy', 'pleased'];
    const negativeWords = ['bad', 'terrible', 'awful', 'disappointed', 'angry', 'frustrated'];
    
    const words = text.toLowerCase().split(/\s+/);
    let score = 0;
    
    words.forEach(word => {
      if (positiveWords.includes(word)) score += 1;
      if (negativeWords.includes(word)) score -= 1;
    });
    
    return Math.max(-1, Math.min(1, score / words.length * 10));
  }

  private calculateCoherence(text: string): number {
    // Simple coherence calculation based on sentence structure
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length === 0) return 0;
    
    let coherenceScore = 0.5;
    
    // Check for logical flow indicators
    const transitionWords = ['however', 'therefore', 'furthermore', 'additionally', 'consequently'];
    const hasTransitions = transitionWords.some(word => text.toLowerCase().includes(word));
    
    if (hasTransitions) coherenceScore += 0.2;
    if (sentences.length > 1) coherenceScore += 0.1;
    
    return Math.min(1.0, coherenceScore);
  }

  private calculateTextAuthenticity(text: string): number {
    // Simple authenticity check
    let score = 0.8;
    
    // Check for suspicious patterns
    const repeatedPhrases = this.findRepeatedPhrases(text);
    if (repeatedPhrases.length > 3) score -= 0.2;
    
    // Check for coherence
    const coherence = this.calculateCoherence(text);
    if (coherence < 0.3) score -= 0.3;
    
    return Math.max(0, score);
  }

  private findRepeatedPhrases(text: string): string[] {
    const phrases = text.split(/[.!?]+/);
    const repeated = [];
    
    for (let i = 0; i < phrases.length; i++) {
      for (let j = i + 1; j < phrases.length; j++) {
        if (phrases[i].trim() === phrases[j].trim() && phrases[i].trim().length > 10) {
          repeated.push(phrases[i].trim());
        }
      }
    }
    
    return [...new Set(repeated)];
  }

  private async analyzeTextAuthenticity(text: string): Promise<{
    authenticity: number;
    confidence: number;
    flags: string[];
  }> {
    const flags = [];
    let authenticity = this.calculateTextAuthenticity(text);
    let confidence = 0.7;
    
    // Check for AI-generated content patterns
    if (this.detectAIGenerated(text)) {
      flags.push('possible_ai_generated');
      authenticity -= 0.3;
    }
    
    // Check for copy-paste patterns
    if (this.detectCopyPaste(text)) {
      flags.push('possible_copy_paste');
      authenticity -= 0.2;
    }
    
    return { authenticity: Math.max(0, authenticity), confidence, flags };
  }

  private detectAIGenerated(text: string): boolean {
    // Simple heuristics for AI-generated content
    const aiIndicators = [
      'as an ai', 'i am an artificial', 'i cannot', 'i do not have the ability',
      'it is important to note', 'please note that'
    ];
    
    return aiIndicators.some(indicator => 
      text.toLowerCase().includes(indicator)
    );
  }

  private detectCopyPaste(text: string): boolean {
    // Check for formatting inconsistencies that might indicate copy-paste
    const lines = text.split('\n');
    const fontChanges = lines.filter(line => 
      line.includes('font-') || line.includes('style=') || line.includes('<')
    );
    
    return fontChanges.length > 0;
  }

  private async analyzeTextRelevance(
    text: string,
    evidenceId: string
  ): Promise<{ score: number; categories: string[] }> {
    try {
      // Get dispute context
      const evidence = await db.select()
        .from(disputes)
        .where(eq(disputes.id, parseInt(evidenceId)))
        .limit(1);

      if (evidence.length === 0) {
        return { score: 0.5, categories: [] };
      }

      const keywords = this.extractKeywords(text);
      const categories = this.categorizeText(text, keywords);
      
      // Calculate relevance based on dispute context
      let score = 0.6;
      
      // Boost score for relevant keywords
      const relevantKeywords = ['order', 'product', 'delivery', 'payment', 'refund'];
      const hasRelevantKeywords = relevantKeywords.some(keyword => 
        text.toLowerCase().includes(keyword)
      );
      
      if (hasRelevantKeywords) score += 0.3;
      
      return { score: Math.min(1.0, score), categories };
    } catch (error) {
      safeLogger.error('Error analyzing text relevance:', error);
      return { score: 0.5, categories: [] };
    }
  }

  private categorizeText(text: string, keywords: string[]): string[] {
    const categories = [];
    
    if (keywords.some(k => ['order', 'purchase', 'buy'].includes(k))) {
      categories.push('transaction_evidence');
    }
    
    if (keywords.some(k => ['delivery', 'shipping', 'received'].includes(k))) {
      categories.push('delivery_evidence');
    }
    
    if (keywords.some(k => ['communication', 'message', 'email'].includes(k))) {
      categories.push('communication_evidence');
    }
    
    return categories;
  }

  private async generateTextSummary(text: string): Promise<string> {
    try {
      if (text.length < 100) return text;
      
      // Simple extractive summarization
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      if (sentences.length <= 2) return text;
      
      // Take first and last sentences as summary
      return `${sentences[0].trim()}. ${sentences[sentences.length - 1].trim()}.`;
    } catch (error) {
      safeLogger.error('Error generating text summary:', error);
      return text.substring(0, 200) + '...';
    }
  }

  private async processDocument(documentBuffer: Buffer): Promise<DocumentAnalysisResult> {
    try {
      // Mock document processing - in production, use OCR and document analysis
      return {
        documentType: 'receipt',
        authenticity: 0.8,
        extractedText: 'Order #12345\nProduct: Widget\nAmount: $99.99\nDate: 2024-01-15',
        structure: {
          pages: 1,
          sections: ['header', 'items', 'total'],
          tables: 1,
          images: 0
        },
        verification: {
          signatures: false,
          watermarks: false,
          timestamps: [new Date('2024-01-15')]
        }
      };
    } catch (error) {
      safeLogger.error('Error processing document:', error);
      throw error;
    }
  }

  private async analyzeDocumentAuthenticity(
    documentAnalysis: DocumentAnalysisResult
  ): Promise<{ authenticity: number; confidence: number; flags: string[] }> {
    const flags = [];
    let authenticity = documentAnalysis.authenticity;
    let confidence = 0.8;
    
    // Check for document integrity
    if (!documentAnalysis.verification.timestamps?.length) {
      flags.push('missing_timestamps');
      authenticity -= 0.2;
    }
    
    if (documentAnalysis.structure.pages === 0) {
      flags.push('empty_document');
      authenticity -= 0.5;
    }
    
    return { authenticity: Math.max(0, authenticity), confidence, flags };
  }

  private identifyImageRiskFactors(
    manipulationAnalysis: ImageAnalysisResult,
    contentAnalysis: any
  ): string[] {
    const risks = [];
    
    if (manipulationAnalysis.manipulationDetected) {
      risks.push('Image manipulation detected');
    }
    
    if (manipulationAnalysis.manipulationScore > 0.5) {
      risks.push('High manipulation probability');
    }
    
    if (contentAnalysis.inappropriate) {
      risks.push('Inappropriate content detected');
    }
    
    return risks;
  }

  private identifyTextRiskFactors(
    nlpAnalysis: TextAnalysisResult,
    authenticityAnalysis: any
  ): string[] {
    const risks = [];
    
    if (authenticityAnalysis.flags.includes('possible_ai_generated')) {
      risks.push('Possible AI-generated content');
    }
    
    if (authenticityAnalysis.flags.includes('possible_copy_paste')) {
      risks.push('Possible copy-paste content');
    }
    
    if (nlpAnalysis.coherence < 0.3) {
      risks.push('Low text coherence');
    }
    
    return risks;
  }

  private identifyDocumentRiskFactors(
    documentAnalysis: DocumentAnalysisResult,
    authenticityAnalysis: any
  ): string[] {
    const risks = [];
    
    if (authenticityAnalysis.flags.includes('missing_timestamps')) {
      risks.push('Document lacks proper timestamps');
    }
    
    if (documentAnalysis.authenticity < 0.5) {
      risks.push('Low document authenticity score');
    }
    
    return risks;
  }

  private generateImageRecommendations(
    authenticityScore: { score: number; confidence: number },
    relevanceScore: { score: number; keywords: string[]; categories: string[] }
  ): string[] {
    const recommendations = [];
    
    if (authenticityScore.score < 0.7) {
      recommendations.push('Request additional verification for this image');
    }
    
    if (relevanceScore.score < 0.6) {
      recommendations.push('Consider requesting more relevant evidence');
    }
    
    if (authenticityScore.confidence < 0.7) {
      recommendations.push('Manual review recommended due to low confidence');
    }
    
    return recommendations;
  }

  private generateTextRecommendations(
    authenticityAnalysis: any,
    relevanceAnalysis: any
  ): string[] {
    const recommendations = [];
    
    if (authenticityAnalysis.authenticity < 0.6) {
      recommendations.push('Verify authenticity of text evidence');
    }
    
    if (relevanceAnalysis.score < 0.5) {
      recommendations.push('Request more specific evidence');
    }
    
    if (authenticityAnalysis.flags.length > 0) {
      recommendations.push('Manual review required due to authenticity concerns');
    }
    
    return recommendations;
  }

  private generateDocumentRecommendations(authenticityAnalysis: any): string[] {
    const recommendations = [];
    
    if (authenticityAnalysis.authenticity < 0.7) {
      recommendations.push('Verify document authenticity');
    }
    
    if (authenticityAnalysis.flags.includes('missing_timestamps')) {
      recommendations.push('Request timestamped version of document');
    }
    
    return recommendations;
  }

  private async calculateEvidenceSimilarity(
    analysisResult: EvidenceAnalysisResult,
    evidence: any
  ): Promise<number> {
    try {
      // Simple similarity calculation based on keywords and categories
      // In production, use more sophisticated similarity measures
      
      if (!evidence.description) return 0;
      
      const keywords1 = analysisResult.relevance.keywords;
      const keywords2 = this.extractKeywords(evidence.description);
      
      const intersection = keywords1.filter(k => keywords2.includes(k));
      const union = [...new Set([...keywords1, ...keywords2])];
      
      return union.length > 0 ? intersection.length / union.length : 0;
    } catch (error) {
      safeLogger.error('Error calculating evidence similarity:', error);
      return 0;
    }
  }

  private async storeAnalysisResults(
    evidenceId: string,
    analysisResult: EvidenceAnalysisResult
  ): Promise<void> {
    try {
      // In production, store in a dedicated analysis results table
      safeLogger.info(`Storing analysis results for evidence ${evidenceId}:`, {
        authenticity: analysisResult.authenticity.score,
        relevance: analysisResult.relevance.score,
        riskFactors: analysisResult.riskFactors.length
      });
    } catch (error) {
      safeLogger.error('Error storing analysis results:', error);
    }
  }

  private async createMockImageModel(): Promise<tf.LayersModel> {
    // Create a simple mock model for demonstration
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [224 * 224 * 3], units: 128, activation: 'relu' }),
        tf.layers.dense({ units: 64, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'sigmoid' })
      ]
    });
    
    return model;
  }

  private async createMockTextModel(): Promise<tf.LayersModel> {
    // Create a simple mock model for demonstration
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [100], units: 64, activation: 'relu' }),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'sigmoid' })
      ]
    });
    
    return model;
  }
}

export const aiEvidenceAnalysisService = new AIEvidenceAnalysisService();
