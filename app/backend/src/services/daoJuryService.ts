import { databaseService } from './databaseService';
import { 
  moderationAppeals, 
  appealJurors, 
  juryVotingSessions, 
  jurorEligibility,
  moderationAuditLog,
  reputationHistory,
  users
} from '../db/schema';
import { eq, and, sql, desc, asc, gt, lt, inArray, not } from 'drizzle-orm';
import { z } from 'zod';
import crypto from 'crypto';

// Types and interfaces
export interface JurorEligibilityCheck {
  userId: string;
  isEligible: boolean;
  reputationScore: number;
  totalStake: number;
  activeCases: number;
  reason?: string;
}

export interface JurorSelection {
  appealId: number;
  selectedJurors: string[];
  selectionRound: number;
  requiredStake: string;
}

export interface VoteCommitment {
  jurorId: string;
  appealId: number;
  commitment: string; // Hash of vote + nonce
  timestamp: Date;
}

export interface VoteReveal {
  jurorId: string;
  appealId: number;
  vote: 'uphold' | 'overturn' | 'partial';
  nonce: string;
  timestamp: Date;
}

export interface VotingResult {
  appealId: number;
  finalDecision: 'uphold' | 'overturn' | 'partial';
  totalVotes: number;
  upholdVotes: number;
  overturnVotes: number;
  partialVotes: number;
  participationRate: number;
}

export interface JurorReward {
  jurorId: string;
  appealId: number;
  rewardAmount: string;
  slashedAmount: string;
  reason: string;
}

// Validation schemas
const JurorSelectionSchema = z.object({
  appealId: z.number().positive(),
  requiredJurors: z.number().min(3).max(15).default(5),
  minimumStake: z.string().regex(/^\d+(\.\d{1,8})?$/).default("50"),
  minimumReputation: z.number().min(0).max(1).default(0.6)
});

const VoteCommitmentSchema = z.object({
  jurorId: z.string().uuid(),
  appealId: z.number().positive(),
  commitment: z.string().length(64) // SHA-256 hash
});

const VoteRevealSchema = z.object({
  jurorId: z.string().uuid(),
  appealId: z.number().positive(),
  vote: z.enum(['uphold', 'overturn', 'partial']),
  nonce: z.string().min(32) // Random nonce for commitment
});

export class DaoJuryService {
  private getDb() {
    return databaseService.getDatabase();
  }

  /**
   * Check if a user is eligible to serve as a juror
   */
  async checkJurorEligibility(userId: string): Promise<JurorEligibilityCheck> {
    try {
      const db = this.getDb();
      
      // Get juror eligibility record
      const eligibilityRecord = await db
        .select()
        .from(jurorEligibility)
        .where(eq(jurorEligibility.userId, userId))
        .limit(1);

      if (eligibilityRecord.length === 0) {
        // Create initial eligibility record for new user
        await this.initializeJurorEligibility(userId);
        return {
          userId,
          isEligible: true,
          reputationScore: 1.0,
          totalStake: 0,
          activeCases: 0
        };
      }

      const record = eligibilityRecord[0];

      // Check eligibility criteria
      const now = new Date();
      const isNotSuspended = !record.suspensionUntil || record.suspensionUntil < now;
      const hasMinimumReputation = parseFloat(record.reputationScore || '0') >= 0.6;
      const hasMinimumStake = parseFloat(record.totalStake || '0') >= 50;
      const notOverloaded = (record.activeCases || 0) < 3; // Max 3 concurrent cases

      const isEligible = record.isEligible && 
                        isNotSuspended && 
                        hasMinimumReputation && 
                        hasMinimumStake && 
                        notOverloaded;

      let reason: string | undefined;
      if (!isEligible) {
        if (!record.isEligible) reason = 'Account suspended or disabled';
        else if (!isNotSuspended) reason = 'Temporarily suspended';
        else if (!hasMinimumReputation) reason = 'Reputation score too low';
        else if (!hasMinimumStake) reason = 'Insufficient stake';
        else if (!notOverloaded) reason = 'Too many active cases';
      }

      return {
        userId,
        isEligible,
        reputationScore: parseFloat(record.reputationScore || '0'),
        totalStake: parseFloat(record.totalStake || '0'),
        activeCases: record.activeCases || 0,
        reason
      };
    } catch (error) {
      console.error('Error checking juror eligibility:', error);
      return {
        userId,
        isEligible: false,
        reputationScore: 0,
        totalStake: 0,
        activeCases: 0,
        reason: 'Error checking eligibility'
      };
    }
  }

  /**
   * Select random jurors for an appeal case with conflict detection
   */
  async selectJurors(params: {
    appealId: number;
    requiredJurors?: number;
    minimumStake?: string;
    minimumReputation?: number;
  }): Promise<{ success: boolean; selection?: JurorSelection; error?: string }> {
    try {
      const validatedParams = JurorSelectionSchema.parse(params);

      // Check if appeal exists and is in correct state
      const db = this.getDb();
      const appeal = await db
        .select()
        .from(moderationAppeals)
        .where(eq(moderationAppeals.id, validatedParams.appealId))
        .limit(1);

      if (appeal.length === 0) {
        return { success: false, error: 'Appeal not found' };
      }

      if (appeal[0].status !== 'open') {
        return { success: false, error: 'Appeal is not in selection phase' };
      }

      // Get eligible jurors excluding conflicts
      const eligibleJurors = await this.getEligibleJurors({
        appealId: validatedParams.appealId,
        minimumStake: validatedParams.minimumStake,
        minimumReputation: validatedParams.minimumReputation,
        excludeConflicts: true
      });

      if (eligibleJurors.length < validatedParams.requiredJurors) {
        return { 
          success: false, 
          error: `Insufficient eligible jurors. Need ${validatedParams.requiredJurors}, found ${eligibleJurors.length}` 
        };
      }

      // Randomly select jurors using weighted selection based on reputation
      const selectedJurors = this.weightedRandomSelection(
        eligibleJurors,
        validatedParams.requiredJurors
      );

      // Create jury voting session
      const votingSession = await this.createVotingSession(validatedParams.appealId, selectedJurors);

      // Assign jurors to the appeal
      const selectionRound = 1; // Could be incremented for re-selections
      await this.assignJurorsToAppeal(
        validatedParams.appealId,
        selectedJurors,
        selectionRound,
        validatedParams.minimumStake
      );

      // Update appeal status
      await db
        .update(moderationAppeals)
        .set({ 
          status: 'jury_selection',
          updatedAt: new Date()
        })
        .where(eq(moderationAppeals.id, validatedParams.appealId));

      // Log jury selection
      await this.logJuryActivity(
        validatedParams.appealId,
        'jurors_selected',
        'system',
        {
          selectedJurors: selectedJurors.map(j => j.userId),
          selectionRound,
          votingSessionId: votingSession.id
        }
      );

      return {
        success: true,
        selection: {
          appealId: validatedParams.appealId,
          selectedJurors: selectedJurors.map(j => j.userId),
          selectionRound,
          requiredStake: validatedParams.minimumStake
        }
      };
    } catch (error) {
      console.error('Error selecting jurors:', error);
      if (error instanceof z.ZodError) {
        return { success: false, error: 'Invalid selection parameters: ' + error.errors.map(e => e.message).join(', ') };
      }
      return { success: false, error: 'Failed to select jurors' };
    }
  }

  /**
   * Submit a vote commitment (commit phase of commit-reveal voting)
   */
  async submitVoteCommitment(commitment: VoteCommitment): Promise<{ success: boolean; error?: string }> {
    try {
      const validatedCommitment = VoteCommitmentSchema.parse(commitment);

      // Check if juror is assigned to this appeal
      const db = this.getDb();
      const jurorAssignment = await db
        .select()
        .from(appealJurors)
        .where(
          and(
            eq(appealJurors.appealId, validatedCommitment.appealId),
            eq(appealJurors.jurorId, validatedCommitment.jurorId),
            eq(appealJurors.status, 'selected')
          )
        )
        .limit(1);

      if (jurorAssignment.length === 0) {
        return { success: false, error: 'Juror not assigned to this appeal' };
      }

      // Check if we're in commit phase
      const votingSession = await this.getCurrentVotingSession(validatedCommitment.appealId);
      if (!votingSession) {
        return { success: false, error: 'No active voting session' };
      }

      const now = new Date();
      if (now < votingSession.commitPhaseStart || now > votingSession.commitPhaseEnd) {
        return { success: false, error: 'Not in commit phase' };
      }

      // Check if juror already committed
      if (jurorAssignment[0].voteCommitment) {
        return { success: false, error: 'Vote already committed' };
      }

      // Store commitment
      await db
        .update(appealJurors)
        .set({
          voteCommitment: validatedCommitment.commitment,
          voteTimestamp: validatedCommitment.timestamp
        })
        .where(
          and(
            eq(appealJurors.appealId, validatedCommitment.appealId),
            eq(appealJurors.jurorId, validatedCommitment.jurorId)
          )
        );

      // Update voting session committed count
      await db
        .update(juryVotingSessions)
        .set({
          committedVotes: sql`${juryVotingSessions.committedVotes} + 1`,
          updatedAt: new Date()
        })
        .where(eq(juryVotingSessions.id, votingSession.id));

      // Log commitment
      await this.logJuryActivity(
        validatedCommitment.appealId,
        'vote_committed',
        validatedCommitment.jurorId,
        { commitment: validatedCommitment.commitment }
      );

      return { success: true };
    } catch (error) {
      console.error('Error submitting vote commitment:', error);
      if (error instanceof z.ZodError) {
        return { success: false, error: 'Invalid commitment data: ' + error.errors.map(e => e.message).join(', ') };
      }
      return { success: false, error: 'Failed to submit vote commitment' };
    }
  }

  /**
   * Reveal a vote (reveal phase of commit-reveal voting)
   */
  async revealVote(reveal: VoteReveal): Promise<{ success: boolean; error?: string }> {
    try {
      const validatedReveal = VoteRevealSchema.parse(reveal);

      // Check if juror is assigned and has committed
      const db = this.getDb();
      const jurorAssignment = await db
        .select()
        .from(appealJurors)
        .where(
          and(
            eq(appealJurors.appealId, validatedReveal.appealId),
            eq(appealJurors.jurorId, validatedReveal.jurorId)
          )
        )
        .limit(1);

      if (jurorAssignment.length === 0) {
        return { success: false, error: 'Juror not assigned to this appeal' };
      }

      const assignment = jurorAssignment[0];
      if (!assignment.voteCommitment) {
        return { success: false, error: 'No vote commitment found' };
      }

      // Check if we're in reveal phase
      const votingSession = await this.getCurrentVotingSession(validatedReveal.appealId);
      if (!votingSession) {
        return { success: false, error: 'No active voting session' };
      }

      const now = new Date();
      if (now < votingSession.revealPhaseStart || now > votingSession.revealPhaseEnd) {
        return { success: false, error: 'Not in reveal phase' };
      }

      // Verify commitment matches reveal
      const expectedCommitment = this.generateVoteCommitment(validatedReveal.vote, validatedReveal.nonce);
      if (expectedCommitment !== assignment.voteCommitment) {
        return { success: false, error: 'Vote commitment does not match reveal' };
      }

      // Store revealed vote
      await db
        .update(appealJurors)
        .set({
          voteReveal: validatedReveal.vote,
          voteTimestamp: validatedReveal.timestamp
        })
        .where(
          and(
            eq(appealJurors.appealId, validatedReveal.appealId),
            eq(appealJurors.jurorId, validatedReveal.jurorId)
          )
        );

      // Update voting session revealed count
      await db
        .update(juryVotingSessions)
        .set({
          revealedVotes: sql`${juryVotingSessions.revealedVotes} + 1`,
          updatedAt: new Date()
        })
        .where(eq(juryVotingSessions.id, votingSession.id));

      // Log vote reveal
      await this.logJuryActivity(
        validatedReveal.appealId,
        'vote_revealed',
        validatedReveal.jurorId,
        { vote: validatedReveal.vote }
      );

      // Check if all votes are revealed and finalize if needed
      await this.checkAndFinalizeVoting(validatedReveal.appealId);

      return { success: true };
    } catch (error) {
      console.error('Error revealing vote:', error);
      if (error instanceof z.ZodError) {
        return { success: false, error: 'Invalid reveal data: ' + error.errors.map(e => e.message).join(', ') };
      }
      return { success: false, error: 'Failed to reveal vote' };
    }
  }

  /**
   * Aggregate voting results and finalize decision
   */
  async finalizeVoting(appealId: number): Promise<{ success: boolean; result?: VotingResult; error?: string }> {
    try {
      // Get all revealed votes for the appeal
      const db = this.getDb();
      const votes = await db
        .select()
        .from(appealJurors)
        .where(
          and(
            eq(appealJurors.appealId, appealId),
            eq(appealJurors.status, 'selected')
          )
        );

      const revealedVotes = votes.filter(v => v.voteReveal);
      const totalVotes = votes.length;

      if (revealedVotes.length === 0) {
        return { success: false, error: 'No votes revealed' };
      }

      // Count votes
      const voteCounts = {
        uphold: revealedVotes.filter(v => v.voteReveal === 'uphold').length,
        overturn: revealedVotes.filter(v => v.voteReveal === 'overturn').length,
        partial: revealedVotes.filter(v => v.voteReveal === 'partial').length
      };

      // Determine final decision (simple majority)
      let finalDecision: 'uphold' | 'overturn' | 'partial';
      if (voteCounts.overturn > voteCounts.uphold && voteCounts.overturn > voteCounts.partial) {
        finalDecision = 'overturn';
      } else if (voteCounts.partial > voteCounts.uphold && voteCounts.partial > voteCounts.overturn) {
        finalDecision = 'partial';
      } else {
        finalDecision = 'uphold'; // Default to uphold in case of ties
      }

      // Update appeal with final decision
      await db
        .update(moderationAppeals)
        .set({
          status: 'decided',
          juryDecision: finalDecision,
          updatedAt: new Date()
        })
        .where(eq(moderationAppeals.id, appealId));

      // Update voting session
      const votingSession = await this.getCurrentVotingSession(appealId);
      if (votingSession) {
        await db
          .update(juryVotingSessions)
          .set({
            status: 'completed',
            finalDecision,
            updatedAt: new Date()
          })
          .where(eq(juryVotingSessions.id, votingSession.id));
      }

      // Process juror rewards and slashing
      await this.processJurorRewards(appealId, finalDecision, votes);

      // Log decision finalization
      await this.logJuryActivity(
        appealId,
        'decision_finalized',
        'system',
        {
          finalDecision,
          voteCounts,
          participationRate: revealedVotes.length / totalVotes
        }
      );

      const result: VotingResult = {
        appealId,
        finalDecision,
        totalVotes,
        upholdVotes: voteCounts.uphold,
        overturnVotes: voteCounts.overturn,
        partialVotes: voteCounts.partial,
        participationRate: revealedVotes.length / totalVotes
      };

      return { success: true, result };
    } catch (error) {
      console.error('Error finalizing voting:', error);
      return { success: false, error: 'Failed to finalize voting' };
    }
  }

  /**
   * Process juror rewards and slashing based on voting outcome
   */
  async processJurorRewards(
    appealId: number,
    finalDecision: string,
    jurors: any[]
  ): Promise<JurorReward[]> {
    try {
      const db = this.getDb();
      const rewards: JurorReward[] = [];

      // Base reward for participation
      const baseReward = '10';
      const consensusBonus = '5';
      const slashingPenalty = '25';

      for (const juror of jurors) {
        let rewardAmount = '0';
        let slashedAmount = '0';
        let reason = '';

        if (juror.voteReveal) {
          // Participated in voting
          rewardAmount = baseReward;
          reason = 'Participation reward';

          // Bonus for voting with majority
          if (juror.voteReveal === finalDecision) {
            rewardAmount = (parseFloat(baseReward) + parseFloat(consensusBonus)).toString();
            reason = 'Participation + consensus bonus';
          }
        } else {
          // Did not participate - slash stake
          slashedAmount = slashingPenalty;
          reason = 'Non-participation penalty';
        }

        // Update juror record
        await db
          .update(appealJurors)
          .set({
            rewardAmount,
            slashedAmount,
            status: 'completed'
          })
          .where(
            and(
              eq(appealJurors.appealId, appealId),
              eq(appealJurors.jurorId, juror.jurorId)
            )
          );

        // Update juror eligibility stats
        await this.updateJurorStats(juror.jurorId, {
          participated: !!juror.voteReveal,
          correctDecision: juror.voteReveal === finalDecision,
          rewardAmount: parseFloat(rewardAmount),
          slashedAmount: parseFloat(slashedAmount)
        });

        rewards.push({
          jurorId: juror.jurorId,
          appealId,
          rewardAmount,
          slashedAmount,
          reason
        });
      }

      return rewards;
    } catch (error) {
      console.error('Error processing juror rewards:', error);
      return [];
    }
  }

  // Private helper methods

  private async initializeJurorEligibility(userId: string): Promise<void> {
    try {
      const db = this.getDb();
      await db.insert(jurorEligibility).values({
        userId,
        reputationScore: '1.0',
        totalStake: '0',
        activeCases: 0,
        completedCases: 0,
        correctDecisions: 0,
        incorrectDecisions: 0,
        isEligible: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error initializing juror eligibility:', error);
    }
  }

  private async getEligibleJurors(params: {
    appealId: number;
    minimumStake: string;
    minimumReputation: number;
    excludeConflicts: boolean;
  }): Promise<Array<{ userId: string; reputationScore: number; totalStake: number }>> {
    try {
      const db = this.getDb();
      
      // Get appeal details for conflict detection
      const appeal = await db
        .select({ appellantId: moderationAppeals.appellantId })
        .from(moderationAppeals)
        .where(eq(moderationAppeals.id, params.appealId))
        .limit(1);

      if (appeal.length === 0) return [];

      const appellantId = appeal[0].appellantId;

      // Get eligible jurors
      let query = db
        .select({
          userId: jurorEligibility.userId,
          reputationScore: jurorEligibility.reputationScore,
          totalStake: jurorEligibility.totalStake
        })
        .from(jurorEligibility)
        .where(
          and(
            eq(jurorEligibility.isEligible, true),
            gt(jurorEligibility.reputationScore, params.minimumReputation.toString()),
            gt(jurorEligibility.totalStake, params.minimumStake),
            lt(jurorEligibility.activeCases, 3)
          )
        );

      // Exclude conflicts (appellant and related parties)
      if (params.excludeConflicts) {
        query = query.where(not(eq(jurorEligibility.userId, appellantId)));
      }

      const eligibleJurors = await query;

      return eligibleJurors.map(j => ({
        userId: j.userId,
        reputationScore: parseFloat(j.reputationScore || '0'),
        totalStake: parseFloat(j.totalStake || '0')
      }));
    } catch (error) {
      console.error('Error getting eligible jurors:', error);
      return [];
    }
  }

  private weightedRandomSelection(
    jurors: Array<{ userId: string; reputationScore: number; totalStake: number }>,
    count: number
  ): Array<{ userId: string; reputationScore: number; totalStake: number }> {
    // Create weighted selection based on reputation score
    const weights = jurors.map(j => j.reputationScore);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    
    const selected: Array<{ userId: string; reputationScore: number; totalStake: number }> = [];
    const available = [...jurors];

    for (let i = 0; i < count && available.length > 0; i++) {
      const random = Math.random() * totalWeight;
      let cumulativeWeight = 0;
      let selectedIndex = 0;

      for (let j = 0; j < available.length; j++) {
        cumulativeWeight += available[j].reputationScore;
        if (random <= cumulativeWeight) {
          selectedIndex = j;
          break;
        }
      }

      selected.push(available[selectedIndex]);
      available.splice(selectedIndex, 1);
    }

    return selected;
  }

  private async createVotingSession(
    appealId: number,
    selectedJurors: Array<{ userId: string }>
  ): Promise<{ id: number }> {
    const db = this.getDb();
    
    const now = new Date();
    const commitPhaseStart = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now
    const commitPhaseEnd = new Date(commitPhaseStart.getTime() + 24 * 60 * 60 * 1000); // 24 hours
    const revealPhaseStart = commitPhaseEnd;
    const revealPhaseEnd = new Date(revealPhaseStart.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    const result = await db
      .insert(juryVotingSessions)
      .values({
        appealId,
        sessionRound: 1,
        commitPhaseStart,
        commitPhaseEnd,
        revealPhaseStart,
        revealPhaseEnd,
        requiredJurors: selectedJurors.length,
        selectedJurors: selectedJurors.length,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning({ id: juryVotingSessions.id });

    return result[0];
  }

  private async assignJurorsToAppeal(
    appealId: number,
    jurors: Array<{ userId: string }>,
    selectionRound: number,
    stakeAmount: string
  ): Promise<void> {
    const db = this.getDb();
    
    const assignments = jurors.map(juror => ({
      appealId,
      jurorId: juror.userId,
      selectionRound,
      status: 'selected' as const,
      stakeAmount,
      createdAt: new Date()
    }));

    await db.insert(appealJurors).values(assignments);

    // Update active cases count for each juror
    for (const juror of jurors) {
      await db
        .update(jurorEligibility)
        .set({
          activeCases: sql`${jurorEligibility.activeCases} + 1`,
          lastActivity: new Date(),
          updatedAt: new Date()
        })
        .where(eq(jurorEligibility.userId, juror.userId));
    }
  }

  private async getCurrentVotingSession(appealId: number): Promise<any> {
    const db = this.getDb();
    const sessions = await db
      .select()
      .from(juryVotingSessions)
      .where(
        and(
          eq(juryVotingSessions.appealId, appealId),
          eq(juryVotingSessions.status, 'active')
        )
      )
      .limit(1);

    return sessions.length > 0 ? sessions[0] : null;
  }

  private generateVoteCommitment(vote: string, nonce: string): string {
    return crypto.createHash('sha256').update(vote + nonce).digest('hex');
  }

  private async checkAndFinalizeVoting(appealId: number): Promise<void> {
    const votingSession = await this.getCurrentVotingSession(appealId);
    if (!votingSession) return;

    // Check if all jurors have revealed or reveal phase has ended
    const now = new Date();
    const allRevealed = votingSession.revealedVotes >= votingSession.selectedJurors;
    const revealPhaseEnded = now > votingSession.revealPhaseEnd;

    if (allRevealed || revealPhaseEnded) {
      await this.finalizeVoting(appealId);
    }
  }

  private async updateJurorStats(
    jurorId: string,
    stats: {
      participated: boolean;
      correctDecision: boolean;
      rewardAmount: number;
      slashedAmount: number;
    }
  ): Promise<void> {
    try {
      const db = this.getDb();
      
      const updates: any = {
        activeCases: sql`${jurorEligibility.activeCases} - 1`,
        completedCases: sql`${jurorEligibility.completedCases} + 1`,
        updatedAt: new Date()
      };

      if (stats.participated) {
        if (stats.correctDecision) {
          updates.correctDecisions = sql`${jurorEligibility.correctDecisions} + 1`;
        } else {
          updates.incorrectDecisions = sql`${jurorEligibility.incorrectDecisions} + 1`;
        }
      }

      // Update reputation based on performance
      const reputationChange = stats.participated 
        ? (stats.correctDecision ? 0.01 : -0.005)
        : -0.02; // Penalty for non-participation

      updates.reputationScore = sql`GREATEST(0, LEAST(1, ${jurorEligibility.reputationScore} + ${reputationChange}))`;

      await db
        .update(jurorEligibility)
        .set(updates)
        .where(eq(jurorEligibility.userId, jurorId));
    } catch (error) {
      console.error('Error updating juror stats:', error);
    }
  }

  private async logJuryActivity(
    appealId: number,
    actionType: string,
    actorId: string,
    details: any
  ): Promise<void> {
    try {
      const db = this.getDb();
      await db.insert(moderationAuditLog).values({
        actionType: `jury_${actionType}`,
        actorId,
        actorType: actorId === 'system' ? 'system' : 'user',
        targetId: appealId.toString(),
        targetType: 'appeal',
        newState: JSON.stringify(details),
        reasoning: `Jury ${actionType}`,
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Error logging jury activity:', error);
    }
  }
}

export const daoJuryService = new DaoJuryService();