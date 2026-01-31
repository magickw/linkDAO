import { safeLogger } from '../utils/safeLogger';
import { databaseService } from './databaseService';
import { moderation_appeals, moderationCases, appeal_jurors } from '../db/schema';
import { eq, and, avg, count } from 'drizzle-orm';
import { ModerationErrorHandler, ModerationErrorType } from '../utils/moderationErrorHandler';

export interface AppealExplanation {
  appealId: number;
  caseId: number;
  appellantId: string;
  decision: 'uphold' | 'overturn' | 'partial';
  explanation: string;
  rationale: string;
  keyFactors: string[];
  jurorConsensus: number;
  totalJurors: number;
  generatedAt: Date;
}

export interface AppealExplanationTemplate {
  decision: 'uphold' | 'overturn' | 'partial';
  category: string;
  template: string;
  variables: string[];
}

/**
 * Service for generating and managing appeal explanations for users
 */
export class AppealExplanationService {
  private explanationTemplates: Map<string, AppealExplanationTemplate[]> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  /**
   * Initialize explanation templates for different scenarios
   */
  private initializeTemplates() {
    // Uphold templates
    this.addTemplate('uphold', 'harassment', [
      {
        decision: 'uphold',
        category: 'harassment',
        template: 'After reviewing your appeal, the jury has decided to uphold the moderation decision. The content was found to violate our harassment policy because {reason}. The jury consensus was {consensus}% in favor of upholding this decision.',
        variables: ['reason', 'consensus']
      }
    ]);

    this.addTemplate('uphold', 'spam', [
      {
        decision: 'uphold',
        category: 'spam',
        template: 'Your appeal has been reviewed, and the jury has upheld the spam violation. The content was identified as spam because {reason}. {totalJurors} jurors participated in the review.',
        variables: ['reason', 'totalJurors']
      }
    ]);

    // Overturn templates
    this.addTemplate('overturn', 'harassment', [
      {
        decision: 'overturn',
        category: 'harassment',
        template: 'Good news! The jury has overturned the moderation decision. After careful review, {totalJurors} jurors determined that the content does not violate our harassment policy. The original decision has been reversed.',
        variables: ['totalJurors']
      }
    ]);

    this.addTemplate('overturn', 'spam', [
      {
        decision: 'overturn',
        category: 'spam',
        template: 'Your appeal has been successful! The jury has overturned the spam violation. The content was reviewed by {totalJurors} jurors who determined it was not spam. Your content has been restored.',
        variables: ['totalJurors']
      }
    ]);

    // Partial templates
    this.addTemplate('partial', 'harassment', [
      {
        decision: 'partial',
        category: 'harassment',
        template: 'The jury has reached a partial decision on your appeal. While some elements of the content were found to be problematic, the full moderation action has been reduced. The jury consensus was {consensus}% for partial overturn.',
        variables: ['consensus']
      }
    ]);

    this.addTemplate('partial', 'spam', [
      {
        decision: 'partial',
        category: 'spam',
        template: 'Your appeal resulted in a partial decision. The jury found that some aspects of the content warranted moderation, but not as severely as originally determined. The content has been modified rather than removed.',
        variables: []
      }
    ]);

    // Default templates
    this.addTemplate('uphold', 'default', [
      {
        decision: 'uphold',
        category: 'default',
        template: 'After reviewing your appeal, the jury has decided to uphold the moderation decision. {totalJurors} jurors reviewed the case, and {consensus}% agreed with the original decision.',
        variables: ['totalJurors', 'consensus']
      }
    ]);

    this.addTemplate('overturn', 'default', [
      {
        decision: 'overturn',
        category: 'default',
        template: 'Your appeal has been successful! The jury has overturned the moderation decision. {totalJurors} jurors reviewed your case and determined the original decision was incorrect.',
        variables: ['totalJurors']
      }
    ]);

    this.addTemplate('partial', 'default', [
      {
        decision: 'partial',
        category: 'default',
        template: 'The jury has reached a partial decision on your appeal. After review, the jury determined that a modified action was appropriate. {totalJurors} jurors participated in the decision.',
        variables: ['totalJurors']
      }
    ]);
  }

  /**
   * Add a template to the collection
   */
  private addTemplate(decision: string, category: string, templates: AppealExplanationTemplate[]) {
    const key = `${decision}:${category}`;
    const existing = this.explanationTemplates.get(key) || [];
    this.explanationTemplates.set(key, [...existing, ...templates]);
  }

  /**
   * Generate explanation for an appeal
   */
  async generateExplanation(appealId: number): Promise<AppealExplanation> {
    try {
      const db = databaseService.getDatabase();

      // Get appeal data
      const [appeal] = await db
        .select()
        .from(moderation_appeals)
        .where(eq(moderation_appeals.id, appealId));

      if (!appeal) {
        throw ModerationErrorHandler.handleBusinessLogicError(
          ModerationErrorType.MODERATION_CASE_NOT_FOUND,
          'Appeal not found',
          { appealId }
        );
      }

      // Check if appeal has been decided
      if (appeal.status !== 'decided' && appeal.status !== 'executed') {
        throw ModerationErrorHandler.handleBusinessLogicError(
          ModerationErrorType.UNAUTHORIZED_MODERATION_ACTION,
          'Appeal has not been decided yet',
          { appealId, status: appeal.status }
        );
      }

      // Get moderation case details
      const [caseData] = await db
        .select()
        .from(moderationCases)
        .where(eq(moderationCases.id, appeal.caseId));

      if (!caseData) {
        throw ModerationErrorHandler.handleBusinessLogicError(
          ModerationErrorType.MODERATION_CASE_NOT_FOUND,
          'Moderation case not found',
          { caseId: appeal.caseId }
        );
      }

      // Get juror voting data
      const jurorVotes = await db
        .select()
        .from(appeal_jurors)
        .where(eq(appeal_jurors.appealId, appealId));

      const totalJurors = jurorVotes.length;
      const consensus = this.calculateJurorConsensus(jurorVotes, appeal.juryDecision);

      // Generate explanation based on decision and category
      const explanation = this.generateExplanationText(
        appeal.juryDecision,
        caseData.reasonCode || 'default',
        {
          reason: caseData.reasonCode || 'content policy violation',
          consensus: consensus.toFixed(0),
          totalJurors: totalJurors.toString()
        }
      );

      // Generate rationale
      const rationale = this.generateRationale(
        appeal.juryDecision,
        caseData,
        jurorVotes
      );

      // Extract key factors
      const keyFactors = this.extractKeyFactors(caseData, jurorVotes);

      const appealExplanation: AppealExplanation = {
        appealId,
        caseId: appeal.caseId,
        appellantId: appeal.appellantId,
        decision: appeal.juryDecision as any,
        explanation,
        rationale,
        keyFactors,
        jurorConsensus: consensus,
        totalJurors,
        generatedAt: new Date()
      };

      // Store explanation in database
      await db
        .update(moderation_appeals)
        .set({
          explanationToAppellant: explanation,
          explanationGeneratedAt: new Date()
        })
        .where(eq(moderation_appeals.id, appealId));

      safeLogger.info(`Generated appeal explanation for appeal ${appealId}`);

      return appealExplanation;

    } catch (error) {
      safeLogger.error(`Failed to generate explanation for appeal ${appealId}:`, error);
      throw ModerationErrorHandler.wrapError(error, 'generateAppealExplanation');
    }
  }

  /**
   * Generate explanation text from template
   */
  private generateExplanationText(
    decision: string,
    category: string,
    variables: Record<string, string>
  ): string {
    const key = `${decision}:${category}`;
    let templates = this.explanationTemplates.get(key);

    // Fallback to default templates if category-specific not found
    if (!templates || templates.length === 0) {
      templates = this.explanationTemplates.get(`${decision}:default`);
    }

    if (!templates || templates.length === 0) {
      // Generate a generic explanation
      return this.generateGenericExplanation(decision, variables);
    }

    // Use the first template (can be enhanced to select based on context)
    const template = templates[0];

    // Replace variables in template
    let explanation = template.template;
    for (const [key, value] of Object.entries(variables)) {
      explanation = explanation.replace(new RegExp(`{${key}}`, 'g'), value);
    }

    return explanation;
  }

  /**
   * Generate generic explanation when no template is available
   */
  private generateGenericExplanation(
    decision: string,
    variables: Record<string, string>
  ): string {
    const decisionText = {
      uphold: 'upheld',
      overturn: 'overturned',
      partial: 'partially overturned'
    };

    return `After reviewing your appeal, the jury has decided to ${decisionText[decision as keyof typeof decisionText]} the moderation decision. ${variables.totalJurors || 'Multiple'} jurors reviewed your case.`;
  }

  /**
   * Generate detailed rationale for the decision
   */
  private generateRationale(
    decision: string,
    caseData: any,
    jurorVotes: any[]
  ): string {
    const rationaleParts: string[] = [];

    // Add decision rationale
    switch (decision) {
      case 'uphold':
        rationaleParts.push('The jury determined that the content violates our community guidelines.');
        if (caseData.reasonCode) {
          rationaleParts.push(`The specific violation was: ${caseData.reasonCode}.`);
        }
        break;

      case 'overturn':
        rationaleParts.push('The jury determined that the original moderation decision was incorrect.');
        rationaleParts.push('The content does not violate our community guidelines as originally determined.');
        break;

      case 'partial':
        rationaleParts.push('The jury determined that a modified action was appropriate.');
        rationaleParts.push('While some aspects of the content warranted attention, the full moderation action was deemed too severe.');
        break;
    }

    // Add confidence-related rationale
    if (caseData.confidence !== undefined) {
      const confidencePercent = (caseData.confidence * 100).toFixed(0);
      rationaleParts.push(`The original moderation had a confidence score of ${confidencePercent}%.`);
    }

    // Add juror reasoning if available
    const jurorReasonings = jurorVotes
      .filter(j => j.voteReasoning)
      .map(j => j.voteReasoning)
      .slice(0, 3); // Take up to 3 reasonings

    if (jurorReasonings.length > 0) {
      rationaleParts.push('Key considerations from the jury:');
      jurorReasonings.forEach(reasoning => {
        rationaleParts.push(`- ${reasoning}`);
      });
    }

    return rationaleParts.join('\n\n');
  }

  /**
   * Extract key factors from case data and juror votes
   */
  private extractKeyFactors(caseData: any, jurorVotes: any[]): string[] {
    const factors: string[] = [];

    // Add content type factor
    if (caseData.contentType) {
      factors.push(`Content type: ${caseData.contentType}`);
    }

    // Add risk score factor
    if (caseData.riskScore !== undefined) {
      const riskPercent = (caseData.riskScore * 100).toFixed(0);
      factors.push(`Risk assessment: ${riskPercent}%`);
    }

    // Add confidence factor
    if (caseData.confidence !== undefined) {
      const confidencePercent = (caseData.confidence * 100).toFixed(0);
      factors.push(`Moderation confidence: ${confidencePercent}%`);
    }

    // Add juror count factor
    if (jurorVotes.length > 0) {
      factors.push(`${jurorVotes.length} jurors participated in the review`);
    }

    // Add vendor factors if available
    if (caseData.vendorScores) {
      const vendors = Object.keys(caseData.vendorScores);
      if (vendors.length > 0) {
        factors.push(`Analyzed by ${vendors.length} AI moderation systems`);
      }
    }

    return factors;
  }

  /**
   * Calculate juror consensus percentage
   */
  private calculateJurorConsensus(jurorVotes: any[], decision: string): number {
    if (jurorVotes.length === 0) return 0;

    const matchingVotes = jurorVotes.filter(
      j => j.voteReveal === decision
    ).length;

    return (matchingVotes / jurorVotes.length) * 100;
  }

  /**
   * Get explanation for an appeal (from database or generate new)
   */
  async getExplanation(appealId: number): Promise<AppealExplanation | null> {
    try {
      const db = databaseService.getDatabase();

      const [appeal] = await db
        .select()
        .from(moderation_appeals)
        .where(eq(moderation_appeals.id, appealId));

      if (!appeal) {
        return null;
      }

      // If explanation already exists, return it
      if (appeal.explanationToAppellant) {
        // Get juror data for consensus calculation
        const jurorVotes = await db
          .select()
          .from(appeal_jurors)
          .where(eq(appeal_jurors.appealId, appealId));

        const consensus = this.calculateJurorConsensus(jurorVotes, appeal.juryDecision);

        return {
          appealId,
          caseId: appeal.caseId,
          appellantId: appeal.appellantId,
          decision: appeal.juryDecision as any,
          explanation: appeal.explanationToAppellant,
          rationale: '', // Would need to be stored separately or regenerated
          keyFactors: [],
          jurorConsensus: consensus,
          totalJurors: jurorVotes.length,
          generatedAt: appeal.explanationGeneratedAt || new Date()
        };
      }

      // Generate new explanation
      return await this.generateExplanation(appealId);

    } catch (error) {
      safeLogger.error(`Failed to get explanation for appeal ${appealId}:`, error);
      return null;
    }
  }

  /**
   * Batch generate explanations for multiple appeals
   */
  async batchGenerateExplanations(appealIds: number[]): Promise<Map<number, AppealExplanation>> {
    const results = new Map<number, AppealExplanation>();

    // Process in parallel with concurrency limit
    const concurrencyLimit = 5;
    for (let i = 0; i < appealIds.length; i += concurrencyLimit) {
      const batch = appealIds.slice(i, i + concurrencyLimit);
      
      const promises = batch.map(async (appealId) => {
        try {
          const explanation = await this.generateExplanation(appealId);
          results.set(appealId, explanation);
        } catch (error) {
          safeLogger.error(`Failed to generate explanation for appeal ${appealId}:`, error);
        }
      });

      await Promise.allSettled(promises);
    }

    return results;
  }

  /**
   * Add custom explanation template
   */
  addCustomTemplate(template: AppealExplanationTemplate): void {
    const key = `${template.decision}:${template.category}`;
    const existing = this.explanationTemplates.get(key) || [];
    this.explanationTemplates.set(key, [...existing, template]);
  }

  /**
   * Get all available templates
   */
  getTemplates(): Map<string, AppealExplanationTemplate[]> {
    return new Map(this.explanationTemplates);
  }
}

export const appealExplanationService = new AppealExplanationService();