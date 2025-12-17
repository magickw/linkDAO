import { safeLogger } from '../utils/safeLogger';
import { db } from '../db';
import { communityMembers, communities } from '../db/schema';
import { eq, and, or, inArray, sql, count } from 'drizzle-orm';

interface BulkMemberOperation {
  type: 'add' | 'remove' | 'update_role' | 'update_reputation' | 'ban' | 'unban';
  memberAddresses: string[];
  role?: 'member' | 'moderator' | 'admin';
  reputation?: number;
  reason?: string;
}

interface BulkMemberResult {
  successful: string[];
  failed: Array<{
    address: string;
    error: string;
  }>;
  summary: {
    total: number;
    processed: number;
    successful: number;
    failed: number;
  };
}

interface MemberImportData {
  addresses: string[];
  defaultRole?: 'member' | 'moderator' | 'admin';
  defaultReputation?: number;
  sendWelcomeMessage?: boolean;
  skipExisting?: boolean;
}

interface MemberExportOptions {
  format: 'csv' | 'json' | 'xlsx';
  includeInactive?: boolean;
  fields?: Array<'address' | 'role' | 'reputation' | 'joinedAt' | 'lastActivityAt' | 'isActive'>;
}

export class BulkMemberManagementService {
  private static instance: BulkMemberManagementService;

  private constructor() {}

  public static getInstance(): BulkMemberManagementService {
    if (!BulkMemberManagementService.instance) {
      BulkMemberManagementService.instance = new BulkMemberManagementService();
    }
    return BulkMemberManagementService.instance;
  }

  /**
   * Add multiple members to a community
   */
  async addMembersToCommunity(
    communityId: string,
    memberAddresses: string[],
    options: {
      defaultRole?: 'member' | 'moderator' | 'admin';
      defaultReputation?: number;
      sendWelcomeMessage?: boolean;
      skipExisting?: boolean;
    } = {}
  ): Promise<BulkMemberResult> {
    try {
      const { defaultRole = 'member', defaultReputation = 0, sendWelcomeMessage = false, skipExisting = true } = options;
      
      const result: BulkMemberResult = {
        successful: [],
        failed: [],
        summary: {
          total: memberAddresses.length,
          processed: 0,
          successful: 0,
          failed: 0
        }
      };

      // Get community details to verify permissions
      const community = await db
        .select({ id: communities.id, creatorAddress: communities.moderators })
        .from(communities)
        .where(eq(communities.id, communityId))
        .limit(1);

      if (!community) {
        throw new Error('Community not found');
      }

      // Process each member address
      for (const address of memberAddresses) {
        try {
          // Validate address format
          if (!this.isValidAddress(address)) {
            result.failed.push({
              address,
              error: 'Invalid wallet address format'
            });
            continue;
          }

          // Check if member already exists (if skipExisting is true)
          if (skipExisting) {
            const existingMember = await db
              .select()
              .from(communityMembers)
              .where(
                and(
                  eq(communityMembers.communityId, communityId),
                  eq(communityMembers.userAddress, address)
                )
              )
              .limit(1);

            if (existingMember.length > 0) {
              result.successful.push(address);
              continue;
            }
          }

          // Add member to community
          await db.insert(communityMembers).values({
            communityId,
            userAddress: address,
            role: defaultRole,
            reputation: defaultReputation,
            contributions: 0,
            isActive: true,
            joinedAt: new Date(),
            lastActivityAt: new Date()
          });

          result.successful.push(address);

          // Send welcome message if requested
          if (sendWelcomeMessage) {
            await this.sendWelcomeMessage(communityId, address);
          }

        } catch (error) {
          result.failed.push({
            address,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }

        result.summary.processed++;
      }

      result.summary.successful = result.successful.length;
      result.summary.failed = result.failed.length;

      return result;
    } catch (error) {
      safeLogger.error('Error adding members to community:', error);
      throw new Error('Failed to add members to community');
    }
  }

  /**
   * Remove multiple members from a community
   */
  async removeMembersFromCommunity(
    communityId: string,
    memberAddresses: string[],
    options: {
      reason?: string;
      notifyMembers?: boolean;
    } = {}
  ): Promise<BulkMemberResult> {
    try {
      const { reason, notifyMembers = false } = options;
      
      const result: BulkMemberResult = {
        successful: [],
        failed: [],
        summary: {
          total: memberAddresses.length,
          processed: 0,
          successful: 0,
          failed: 0
        }
      };

      // Process each member address
      for (const address of memberAddresses) {
        try {
          // Remove member from community
          const deleteResult = await db
            .delete(communityMembers)
            .where(
              and(
                eq(communityMembers.communityId, communityId),
                eq(communityMembers.userAddress, address)
              )
            )
            .returning();

          if (deleteResult.length > 0) {
            result.successful.push(address);

            // Send notification if requested
            if (notifyMembers) {
              await this.sendRemovalMessage(communityId, address, reason);
            }
          } else {
            result.failed.push({
              address,
              error: 'Member not found in community'
            });
          }

        } catch (error) {
          result.failed.push({
            address,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }

        result.summary.processed++;
      }

      result.summary.successful = result.successful.length;
      result.summary.failed = result.failed.length;

      return result;
    } catch (error) {
      safeLogger.error('Error removing members from community:', error);
      throw new Error('Failed to remove members from community');
    }
  }

  /**
   * Update roles for multiple members
   */
  async updateMemberRoles(
    communityId: string,
    memberAddresses: string[],
    newRole: 'member' | 'moderator' | 'admin',
    reason?: string
  ): Promise<BulkMemberResult> {
    try {
      const result: BulkMemberResult = {
        successful: [],
        failed: [],
        summary: {
          total: memberAddresses.length,
          processed: 0,
          successful: 0,
          failed: 0
        }
      };

      // Process each member address
      for (const address of memberAddresses) {
        try {
          const updateResult = await db
            .update(communityMembers)
            .set({ role: newRole })
            .where(
              and(
                eq(communityMembers.communityId, communityId),
                eq(communityMembers.userAddress, address),
                eq(communityMembers.isActive, true)
              )
            )
            .returning();

          if (updateResult.length > 0) {
            result.successful.push(address);
            
            // Log role change for audit
            safeLogger.info('Member role updated', {
              communityId,
              memberAddress: address,
              newRole,
              reason
            });
          } else {
            result.failed.push({
              address,
              error: 'Member not found or inactive'
            });
          }

        } catch (error) {
          result.failed.push({
            address,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }

        result.summary.processed++;
      }

      result.summary.successful = result.successful.length;
      result.summary.failed = result.failed.length;

      return result;
    } catch (error) {
      safeLogger.error('Error updating member roles:', error);
      throw new Error('Failed to update member roles');
    }
  }

  /**
   * Update reputation for multiple members
   */
  async updateMemberReputation(
    communityId: string,
    memberAddresses: string[],
    reputationChange: number,
    reason?: string
  ): Promise<BulkMemberResult> {
    try {
      const result: BulkMemberResult = {
        successful: [],
        failed: [],
        summary: {
          total: memberAddresses.length,
          processed: 0,
          successful: 0,
          failed: 0
        }
      };

      // Process each member address
      for (const address of memberAddresses) {
        try {
          const currentReputation = await this.getMemberReputation(communityId, address);
          const newReputation = Math.max(0, currentReputation + reputationChange);

          const updateResult = await db
            .update(communityMembers)
            .set({ 
              reputation: newReputation,
              contributions: sql`${communityMembers.contributions} + ${Math.max(0, reputationChange)}`
            })
            .where(
              and(
                eq(communityMembers.communityId, communityId),
                eq(communityMembers.userAddress, address),
                eq(communityMembers.isActive, true)
              )
            )
            .returning();

          if (updateResult.length > 0) {
            result.successful.push(address);
            
            // Log reputation change for audit
            safeLogger.info('Member reputation updated', {
              communityId,
              memberAddress: address,
              oldReputation: currentReputation,
              newReputation,
              reputationChange,
              reason
            });
          } else {
            result.failed.push({
              address,
              error: 'Member not found or inactive'
            });
          }

        } catch (error) {
          result.failed.push({
            address,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }

        result.summary.processed++;
      }

      result.summary.successful = result.successful.length;
      result.summary.failed = result.failed.length;

      return result;
    } catch (error) {
      safeLogger.error('Error updating member reputation:', error);
      throw new Error('Failed to update member reputation');
    }
  }

  /**
   * Ban multiple members from a community
   */
  async banMembers(
    communityId: string,
    memberAddresses: string[],
    reason: string,
    banDuration?: number // in days
  ): Promise<BulkMemberResult> {
    try {
      const result: BulkMemberResult = {
        successful: [],
        failed: [],
        summary: {
          total: memberAddresses.length,
          processed: 0,
          successful: 0,
          failed: 0
        }
      };

      // Calculate ban expiry date if duration is specified
      const banExpiry = banDuration 
        ? new Date(Date.now() + banDuration * 24 * 60 * 60 * 1000)
        : undefined;

      // Process each member address
      for (const address of memberAddresses) {
        try {
          const updateResult = await db
            .update(communityMembers)
            .set({ 
              isActive: false,
              bannedAt: new Date(),
              banExpiry: banExpiry,
              banReason: reason
            })
            .where(
              and(
                eq(communityMembers.communityId, communityId),
                eq(communityMembers.userAddress, address),
                eq(communityMembers.isActive, true)
              )
            )
            .returning();

          if (updateResult.length > 0) {
            result.successful.push(address);
            
            // Log ban for audit
            safeLogger.warn('Member banned', {
              communityId,
              memberAddress: address,
              reason,
              banExpiry
            });
          } else {
            result.failed.push({
              address,
              error: 'Member not found or already banned'
            });
          }

        } catch (error) {
          result.failed.push({
            address,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }

        result.summary.processed++;
      }

      result.summary.successful = result.successful.length;
      result.summary.failed = result.failed.length;

      return result;
    } catch (error) {
      safeLogger.error('Error banning members:', error);
      throw new Error('Failed to ban members');
    }
  }

  /**
   * Unban multiple members
   */
  async unbanMembers(
    communityId: string,
    memberAddresses: string[]
  ): Promise<BulkMemberResult> {
    try {
      const result: BulkMemberResult = {
        successful: [],
        failed: [],
        summary: {
          total: memberAddresses.length,
          processed: 0,
          successful: 0,
          failed: 0
        }
      };

      // Process each member address
      for (const address of memberAddresses) {
        try {
          const updateResult = await db
            .update(communityMembers)
            .set({ 
              isActive: true,
              bannedAt: null,
              banExpiry: null,
              banReason: null
            })
            .where(
              and(
                eq(communityMembers.communityId, communityId),
                eq(communityMembers.userAddress, address),
                eq(communityMembers.isActive, false)
              )
            )
            .returning();

          if (updateResult.length > 0) {
            result.successful.push(address);
            
            // Log unban for audit
            safeLogger.info('Member unbanned', {
              communityId,
              memberAddress: address
            });
          } else {
            result.failed.push({
              address,
              error: 'Member not found or not banned'
            });
          }

        } catch (error) {
          result.failed.push({
            address,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }

        result.summary.processed++;
      }

      result.summary.successful = result.successful.length;
      result.summary.failed = result.failed.length;

      return result;
    } catch (error) {
      safeLogger.error('Error unbanning members:', error);
      throw new Error('Failed to unban members');
    }
  }

  /**
   * Import members from CSV data
   */
  async importMembersFromCSV(
    communityId: string,
    csvData: string,
    options: MemberImportData = {}
  ): Promise<BulkMemberResult & { duplicates: string[] }> {
    try {
      const { addresses, defaultRole = 'member', defaultReputation = 0 } = options;

      // Parse CSV data
      const lines = csvData.split('\n').filter(line => line.trim());
      const addresses: string[] = [];
      const duplicates: string[] = [];

      for (const line of lines) {
        const address = line.trim();
        if (address && this.isValidAddress(address)) {
          if (addresses.includes(address)) {
            duplicates.push(address);
          } else {
            addresses.push(address);
          }
        }
      }

      // Add members (duplicates will be skipped automatically)
      const result = await this.addMembersToCommunity(communityId, addresses, {
        defaultRole,
        defaultReputation,
        skipExisting: true
      });

      return {
        ...result,
        duplicates
      };
    } catch (error) {
      safeLogger.error('Error importing members from CSV:', error);
      throw new Error('Failed to import members from CSV');
    }
  }

  /**
   * Export community members to various formats
   */
  async exportMembers(
    communityId: string,
    options: MemberExportOptions = {}
  ): Promise<{
    data: string;
    filename: string;
    mimeType: string;
  }> {
    try {
      const { 
        format = 'csv', 
        includeInactive = false, 
        fields = ['address', 'role', 'reputation', 'joinedAt', 'lastActivityAt', 'isActive'] 
      } = options;

      // Get members based on options
      const whereConditions = [
        eq(communityMembers.communityId, communityId)
      ];

      if (!includeInactive) {
        whereConditions.push(eq(communityMembers.isActive, true));
      }

      const members = await db
        .select({
          userAddress: communityMembers.userAddress,
          role: communityMembers.role,
          reputation: communityMembers.reputation,
          joinedAt: communityMembers.joinedAt,
          lastActivityAt: communityMembers.lastActivityAt,
          isActive: communityMembers.isActive
        })
        .from(communityMembers)
        .where(and(...whereConditions))
        .orderBy(communityMembers.joinedAt.desc);

      // Format data based on format type
      let data: string;
      let filename: string;
      let mimeType: string;

      switch (format) {
        case 'csv':
          const headers = fields.join(',');
          const rows = members.map(member => 
            fields.map(field => {
              switch (field) {
                case 'address': return member.userAddress;
                case 'role': return member.role;
                case 'reputation': return member.reputation.toString();
                case 'joinedAt': return member.joinedAt.toISOString();
                case 'lastActivityAt': return member.lastActivityAt?.toISOString() || '';
                case 'isActive': return member.isActive ? 'true' : 'false';
                default: return '';
              }
            }).join(',')
          );

          data = [headers, ...rows].join('\n');
          filename = `community_${communityId}_members_${new Date().toISOString().split('T')[0]}.csv`;
          mimeType = 'text/csv';
          break;

        case 'json':
          const exportData = members.map(member => {
            const result: any = {};
            fields.forEach(field => {
              switch (field) {
                case 'address': result.address = member.userAddress;
                case 'role': result.role = member.role;
                case 'reputation': result.reputation = member.reputation;
                case 'joinedAt': result.joinedAt = member.joinedAt;
                case 'lastActivityAt': result.lastActivityAt = member.lastActivityAt;
                case 'isActive': result.isActive = member.isActive;
              }
            });
            return result;
          });
          data = JSON.stringify(exportData, null, 2);
          filename = `community_${communityId}_members_${new Date().toISOString().split('T')[0]}.json`;
          mimeType = 'application/json';
          break;

        case 'xlsx':
          // For XLSX, we would typically use a library like xlsx
          // For now, return CSV format
          const headers = fields.join(',');
          const rows = members.map(member => 
            fields.map(field => {
              switch (field) {
                case 'address': return member.userAddress;
                case 'role': return member.role;
                case 'reputation': return member.reputation.toString();
                case 'joinedAt': return member.joinedAt.toISOString();
                case 'lastActivityAt': return member.lastActivityAt?.toISOString() || '';
                case 'isActive': return member.isActive ? 'true' : 'false';
                default: return '';
              }
            }).join(',')
          );

          data = [headers, ...rows].join('\n');
          filename = `community_${communityId}_members_${new Date().toISOString().split('T')[0]}.csv`;
          mimeType = 'text/csv';
          break;

        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      return { data, filename, mimeType };
    } catch (error) {
      safeLogger.error('Error exporting members:', error);
      throw new Error('Failed to export members');
    }
  }

  /**
   * Get member statistics for a community
   */
  async getMemberStatistics(communityId: string): Promise<{
    total: number;
    active: number;
    banned: number;
    byRole: Record<string, number>;
    recentJoins: number;
    churnRate: number;
    activityMetrics: {
      highlyActive: number; // Active in last 7 days
      moderatelyActive: number; // Active in last 30 days
      inactive: number; // Not active in last 30 days
    };
  }> {
    try {
      // Get total members
      const totalResult = await db
        .select({ count: sql`count(*)` as count })
        .from(communityMembers)
        .where(eq(communityMembers.communityId, communityId));

      // Get active members
      const activeResult = await db
        .select({ count: sql`count(*)` as count })
        .from(communityMembers)
        .where(
          and(
            eq(communityMembers.communityId, communityId),
            eq(communityMembers.isActive, true)
          )
        );

      // Get banned members
      const bannedResult = await db
        .select({ count: sql`count(*)` as count })
        .from(communityMembers)
        .where(
          and(
            eq(communityMembers.communityId, communityId),
            eq(communityMembers.isActive, false),
            sql`communityMembers.bannedAt IS NOT NULL`
          )
        );

      // Get members by role
      const roleResults = await db
        .select({
          role: communityMembers.role,
          count: sql`count(*)` as count
        })
        .from(communityMembers)
        .where(
          and(
            eq(communityMembers.communityId, communityId),
            eq(communityMembers.isActive, true)
          )
        )
        .groupBy(communityMembers.role);

      const byRole = roleResults.reduce((acc, row) => {
          acc[row.role] = Number(row.count);
          return acc;
        }, {} as Record<string, number>);

      // Get recent joins (last 7 days)
      const recentJoinsResult = await db
        .select({ count: sql`count(*)` as count })
        .from(communityMembers)
        .where(
          and(
            eq(communityMembers.communityId, communityId),
            eq(communityMembers.isActive, true),
            sql`communityMembers.joinedAt >= NOW() - INTERVAL '7 days'`
          )
        );

      // Calculate activity metrics
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const highlyActiveResult = await db
        .select({ count: sql`count(*)` as count })
        .from(communityMembers)
        .where(
          and(
            eq(communityMembers.communityId, communityId),
            eq(communityMembers.isActive, true),
            sql`communityMembers.lastActivityAt >= NOW() - INTERVAL '7 days'`
          )
        );

      const moderatelyActiveResult = await db
        .select({ count: sql`count(*)` as count })
        .from(communityMembers)
        .where(
          and(
            eq(communityMembers.communityId, communityId),
            eq(communityMembers.isActive, true),
            sql`communityMembers.lastActivityAt >= ${thirtyDaysAgo.toISOString()}`
          )
        );

      const inactiveResult = await db
        .select({ count: sql`count(*)` as count })
        .from(communityMembers)
        .where(
          and(
            eq(communityMembers.communityId, communityId),
            eq(communityMembers.isActive, true),
            sql`communityMembers.lastActivityAt < ${thirtyDaysAgo.toISOString()}`
          )
        );

      const total = Number(totalResult[0]?.count || 0);
      const active = Number(activeResult[0]?.count || 0);
      const banned = Number(bannedResult[0]?.count || 0);
      const recentJoins = Number(recentJoinsResult[0]?.count || 0);
      const churnRate = total > 0 ? (total - active) / total * 100 : 0;

      return {
        total,
        active,
        banned,
        byRole,
        recentJoins,
        churnRate,
        activityMetrics: {
          highlyActive: Number(highlyActiveResult[0]?.count || 0),
          moderatelyActive: Number(moderatelyActiveResult[0]?.count || 0),
          inactive: Number(inactiveResult[0]?.count || 0)
        }
      };
    } catch (error) {
      safeLogger.error('Error getting member statistics:', error);
      throw new Error('Failed to get member statistics');
    }
  }

  /**
   * Validate wallet address format
   */
  private isValidAddress(address: string): boolean {
    // Basic validation for Ethereum addresses
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Get member's current reputation
   */
  private async getMemberReputation(communityId: string, memberAddress: string): Promise<number> {
    try {
      const member = await db
        .select({ reputation: communityMembers.reputation })
        .from(communityMembers)
        .where(
          and(
            eq(communityMembers.communityId, communityId),
            eq(communityMembers.userAddress, memberAddress),
            eq(communityMembers.isActive, true)
          )
        )
        .limit(1);

      return member?.reputation || 0;
    } catch (error) {
      safeLogger.error('Error getting member reputation:', error);
      return 0;
    }
  }

  /**
   * Send welcome message to member
   */
  private async sendWelcomeMessage(communityId: string, memberAddress: string): Promise<void> {
    try {
      // This would integrate with your notification system
      safeLogger.info('Welcome message sent', {
        communityId,
        memberAddress
      });
    } catch (error) {
      safeLogger.error('Error sending welcome message:', error);
    }
  }

  /**
   * Send removal message to member
   */
  private async sendRemovalMessage(communityId: string, memberAddress: string, reason?: string): Promise<void> {
    try {
      // This would integrate with your notification system
      safeLogger.info('Removal message sent', {
        communityId,
        memberAddress,
        reason
      });
    } catch (error) {
      safeLogger.error('Error sending removal message:', error);
    }
  }
}

export const bulkMemberManagementService = BulkMemberManagementService.getInstance();