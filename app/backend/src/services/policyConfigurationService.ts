import { db } from '../db';
import { moderationPolicies, moderationVendors } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';

export interface PolicyRule {
  id: number;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidenceThreshold: number;
  action: 'allow' | 'limit' | 'block' | 'review';
  reputationModifier: number;
  description: string;
  isActive: boolean;
}

export interface VendorConfig {
  id: number;
  vendorName: string;
  vendorType: 'text' | 'image' | 'video' | 'link' | 'custom';
  apiEndpoint?: string;
  isEnabled: boolean;
  weight: number;
  costPerRequest: number;
  avgLatencyMs: number;
  successRate: number;
  lastHealthCheck?: Date;
  configuration: Record<string, any>;
}

export interface PolicyTemplate {
  name: string;
  description: string;
  policies: Omit<PolicyRule, 'id'>[];
}

export class PolicyConfigurationService {
  private policyCache: Map<string, PolicyRule[]> = new Map();
  private vendorCache: Map<string, VendorConfig> = new Map();
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes
  private lastPolicyCacheUpdate: number = 0;
  private lastVendorCacheUpdate: number = 0;

  /**
   * Get all active policies
   */
  async getAllPolicies(): Promise<PolicyRule[]> {
    try {
      const policies = await db
        .select()
        .from(moderationPolicies)
        .orderBy(desc(moderationPolicies.confidenceThreshold));

      return policies.map(policy => ({
        id: policy.id,
        category: policy.category,
        severity: policy.severity as 'low' | 'medium' | 'high' | 'critical',
        confidenceThreshold: parseFloat(policy.confidenceThreshold || '0'),
        action: policy.action as 'allow' | 'limit' | 'block' | 'review',
        reputationModifier: parseFloat(policy.reputationModifier || '1'),
        description: policy.description || '',
        isActive: policy.isActive ?? true
      }));
    } catch (error) {
      console.error('Failed to get policies:', error);
      return [];
    }
  }

  /**
   * Get policies by category
   */
  async getPoliciesByCategory(category: string): Promise<PolicyRule[]> {
    try {
      const policies = await db
        .select()
        .from(moderationPolicies)
        .where(and(
          eq(moderationPolicies.category, category),
          eq(moderationPolicies.isActive, true)
        ))
        .orderBy(desc(moderationPolicies.confidenceThreshold));

      return policies.map(policy => ({
        id: policy.id,
        category: policy.category,
        severity: policy.severity as 'low' | 'medium' | 'high' | 'critical',
        confidenceThreshold: parseFloat(policy.confidenceThreshold || '0'),
        action: policy.action as 'allow' | 'limit' | 'block' | 'review',
        reputationModifier: parseFloat(policy.reputationModifier || '1'),
        description: policy.description || '',
        isActive: policy.isActive ?? true
      }));
    } catch (error) {
      console.error('Failed to get policies by category:', error);
      return [];
    }
  }

  /**
   * Create a new policy
   */
  async createPolicy(policy: Omit<PolicyRule, 'id'>): Promise<PolicyRule | null> {
    try {
      const result = await db
        .insert(moderationPolicies)
        .values({
          category: policy.category,
          severity: policy.severity,
          confidenceThreshold: policy.confidenceThreshold.toString(),
          action: policy.action,
          reputationModifier: policy.reputationModifier.toString(),
          description: policy.description,
          isActive: policy.isActive
        })
        .returning();

      if (result.length > 0) {
        const created = result[0];
        return {
          id: created.id,
          category: created.category,
          severity: created.severity as 'low' | 'medium' | 'high' | 'critical',
          confidenceThreshold: parseFloat(created.confidenceThreshold || '0'),
          action: created.action as 'allow' | 'limit' | 'block' | 'review',
          reputationModifier: parseFloat(created.reputationModifier || '1'),
          description: created.description || '',
          isActive: created.isActive ?? true
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to create policy:', error);
      return null;
    }
  }

  /**
   * Update an existing policy
   */
  async updatePolicy(id: number, updates: Partial<Omit<PolicyRule, 'id'>>): Promise<boolean> {
    try {
      const updateData: any = {};
      
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.severity !== undefined) updateData.severity = updates.severity;
      if (updates.confidenceThreshold !== undefined) updateData.confidenceThreshold = updates.confidenceThreshold.toString();
      if (updates.action !== undefined) updateData.action = updates.action;
      if (updates.reputationModifier !== undefined) updateData.reputationModifier = updates.reputationModifier.toString();
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
      
      updateData.updatedAt = new Date();

      await db
        .update(moderationPolicies)
        .set(updateData)
        .where(eq(moderationPolicies.id, id));

      // Invalidate cache
      this.lastPolicyCacheUpdate = 0;
      
      return true;
    } catch (error) {
      console.error('Failed to update policy:', error);
      return false;
    }
  }

  /**
   * Delete a policy
   */
  async deletePolicy(id: number): Promise<boolean> {
    try {
      await db
        .update(moderationPolicies)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(moderationPolicies.id, id));

      // Invalidate cache
      this.lastPolicyCacheUpdate = 0;
      
      return true;
    } catch (error) {
      console.error('Failed to delete policy:', error);
      return false;
    }
  }

  /**
   * Get all vendor configurations
   */
  async getAllVendors(): Promise<VendorConfig[]> {
    try {
      const vendors = await db
        .select()
        .from(moderationVendors);

      return vendors.map(vendor => ({
        id: vendor.id,
        vendorName: vendor.vendorName,
        vendorType: vendor.vendorType as 'text' | 'image' | 'video' | 'link' | 'custom',
        apiEndpoint: vendor.apiEndpoint || undefined,
        isEnabled: vendor.isEnabled ?? true,
        weight: parseFloat(vendor.weight || '1'),
        costPerRequest: parseFloat(vendor.costPerRequest || '0'),
        avgLatencyMs: vendor.avgLatencyMs || 0,
        successRate: parseFloat(vendor.successRate || '1'),
        lastHealthCheck: vendor.lastHealthCheck || undefined,
        configuration: typeof vendor.configuration === 'string' 
          ? JSON.parse(vendor.configuration) 
          : vendor.configuration || {}
      }));
    } catch (error) {
      console.error('Failed to get vendors:', error);
      return [];
    }
  }

  /**
   * Update vendor configuration
   */
  async updateVendor(id: number, updates: Partial<Omit<VendorConfig, 'id'>>): Promise<boolean> {
    try {
      const updateData: any = {};
      
      if (updates.vendorName !== undefined) updateData.vendorName = updates.vendorName;
      if (updates.vendorType !== undefined) updateData.vendorType = updates.vendorType;
      if (updates.apiEndpoint !== undefined) updateData.apiEndpoint = updates.apiEndpoint;
      if (updates.isEnabled !== undefined) updateData.isEnabled = updates.isEnabled;
      if (updates.weight !== undefined) updateData.weight = updates.weight.toString();
      if (updates.costPerRequest !== undefined) updateData.costPerRequest = updates.costPerRequest.toString();
      if (updates.avgLatencyMs !== undefined) updateData.avgLatencyMs = updates.avgLatencyMs;
      if (updates.successRate !== undefined) updateData.successRate = updates.successRate.toString();
      if (updates.lastHealthCheck !== undefined) updateData.lastHealthCheck = updates.lastHealthCheck;
      if (updates.configuration !== undefined) updateData.configuration = JSON.stringify(updates.configuration);
      
      updateData.updatedAt = new Date();

      await db
        .update(moderationVendors)
        .set(updateData)
        .where(eq(moderationVendors.id, id));

      // Invalidate cache
      this.lastVendorCacheUpdate = 0;
      
      return true;
    } catch (error) {
      console.error('Failed to update vendor:', error);
      return false;
    }
  }

  /**
   * Bulk update thresholds for a category
   */
  async bulkUpdateThresholds(category: string, thresholdAdjustment: number): Promise<boolean> {
    try {
      // Get all policies for the category
      const policies = await this.getPoliciesByCategory(category);
      
      // Update each policy's threshold
      const updatePromises = policies.map(policy => {
        const newThreshold = Math.max(0.1, Math.min(1.0, policy.confidenceThreshold * thresholdAdjustment));
        return this.updatePolicy(policy.id, { confidenceThreshold: newThreshold });
      });

      const results = await Promise.all(updatePromises);
      return results.every(result => result === true);
    } catch (error) {
      console.error('Failed to bulk update thresholds:', error);
      return false;
    }
  }

  /**
   * Apply a policy template
   */
  async applyPolicyTemplate(template: PolicyTemplate): Promise<boolean> {
    try {
      // Deactivate existing policies that match template categories
      const templateCategories = [...new Set(template.policies.map(p => p.category))];
      
      for (const category of templateCategories) {
        const existingPolicies = await this.getPoliciesByCategory(category);
        for (const policy of existingPolicies) {
          await this.updatePolicy(policy.id, { isActive: false });
        }
      }

      // Create new policies from template
      const createPromises = template.policies.map(policy => this.createPolicy(policy));
      const results = await Promise.all(createPromises);
      
      return results.every(result => result !== null);
    } catch (error) {
      console.error('Failed to apply policy template:', error);
      return false;
    }
  }

  /**
   * Get predefined policy templates
   */
  getPolicyTemplates(): PolicyTemplate[] {
    return [
      {
        name: 'Strict Moderation',
        description: 'High security with low tolerance for violations',
        policies: [
          {
            category: 'hate_speech',
            severity: 'critical',
            confidenceThreshold: 0.85,
            action: 'block',
            reputationModifier: -0.3,
            description: 'Strict hate speech detection',
            isActive: true
          },
          {
            category: 'harassment',
            severity: 'high',
            confidenceThreshold: 0.80,
            action: 'block',
            reputationModifier: -0.2,
            description: 'Strict harassment detection',
            isActive: true
          },
          {
            category: 'spam',
            severity: 'medium',
            confidenceThreshold: 0.70,
            action: 'limit',
            reputationModifier: -0.1,
            description: 'Strict spam detection',
            isActive: true
          },
          {
            category: 'scam',
            severity: 'critical',
            confidenceThreshold: 0.75,
            action: 'block',
            reputationModifier: -0.4,
            description: 'Strict scam detection',
            isActive: true
          }
        ]
      },
      {
        name: 'Balanced Moderation',
        description: 'Balanced approach with moderate thresholds',
        policies: [
          {
            category: 'hate_speech',
            severity: 'critical',
            confidenceThreshold: 0.90,
            action: 'block',
            reputationModifier: -0.25,
            description: 'Balanced hate speech detection',
            isActive: true
          },
          {
            category: 'harassment',
            severity: 'high',
            confidenceThreshold: 0.85,
            action: 'review',
            reputationModifier: -0.15,
            description: 'Balanced harassment detection',
            isActive: true
          },
          {
            category: 'spam',
            severity: 'medium',
            confidenceThreshold: 0.80,
            action: 'limit',
            reputationModifier: -0.05,
            description: 'Balanced spam detection',
            isActive: true
          },
          {
            category: 'scam',
            severity: 'critical',
            confidenceThreshold: 0.85,
            action: 'block',
            reputationModifier: -0.3,
            description: 'Balanced scam detection',
            isActive: true
          }
        ]
      },
      {
        name: 'Lenient Moderation',
        description: 'Permissive approach prioritizing free expression',
        policies: [
          {
            category: 'hate_speech',
            severity: 'critical',
            confidenceThreshold: 0.95,
            action: 'review',
            reputationModifier: -0.2,
            description: 'Lenient hate speech detection',
            isActive: true
          },
          {
            category: 'harassment',
            severity: 'high',
            confidenceThreshold: 0.90,
            action: 'review',
            reputationModifier: -0.1,
            description: 'Lenient harassment detection',
            isActive: true
          },
          {
            category: 'spam',
            severity: 'medium',
            confidenceThreshold: 0.85,
            action: 'limit',
            reputationModifier: -0.03,
            description: 'Lenient spam detection',
            isActive: true
          },
          {
            category: 'scam',
            severity: 'critical',
            confidenceThreshold: 0.90,
            action: 'block',
            reputationModifier: -0.25,
            description: 'Lenient scam detection (still strict for safety)',
            isActive: true
          }
        ]
      },
      {
        name: 'Crypto-Focused',
        description: 'Specialized for crypto/Web3 content with enhanced scam detection',
        policies: [
          {
            category: 'scam',
            severity: 'critical',
            confidenceThreshold: 0.70,
            action: 'block',
            reputationModifier: -0.5,
            description: 'Enhanced crypto scam detection',
            isActive: true
          },
          {
            category: 'seed_phrase',
            severity: 'critical',
            confidenceThreshold: 0.95,
            action: 'block',
            reputationModifier: 0,
            description: 'Seed phrase exposure protection',
            isActive: true
          },
          {
            category: 'fake_content',
            severity: 'high',
            confidenceThreshold: 0.80,
            action: 'review',
            reputationModifier: -0.15,
            description: 'Fake project/token detection',
            isActive: true
          },
          {
            category: 'hate_speech',
            severity: 'critical',
            confidenceThreshold: 0.90,
            action: 'block',
            reputationModifier: -0.25,
            description: 'Standard hate speech detection',
            isActive: true
          }
        ]
      }
    ];
  }

  /**
   * Validate policy configuration
   */
  validatePolicy(policy: Omit<PolicyRule, 'id'>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate category
    if (!policy.category || policy.category.trim().length === 0) {
      errors.push('Category is required');
    }

    // Validate severity
    if (!['low', 'medium', 'high', 'critical'].includes(policy.severity)) {
      errors.push('Severity must be one of: low, medium, high, critical');
    }

    // Validate confidence threshold
    if (policy.confidenceThreshold < 0 || policy.confidenceThreshold > 1) {
      errors.push('Confidence threshold must be between 0 and 1');
    }

    // Validate action
    if (!['allow', 'limit', 'block', 'review'].includes(policy.action)) {
      errors.push('Action must be one of: allow, limit, block, review');
    }

    // Validate reputation modifier
    if (policy.reputationModifier < -1 || policy.reputationModifier > 1) {
      errors.push('Reputation modifier must be between -1 and 1');
    }

    // Validate description
    if (!policy.description || policy.description.trim().length === 0) {
      errors.push('Description is required');
    }

    // Logical validations
    if (policy.action === 'allow' && policy.confidenceThreshold > 0.5) {
      errors.push('Allow actions should typically have low confidence thresholds');
    }

    if (policy.severity === 'critical' && policy.action === 'allow') {
      errors.push('Critical severity policies should not have allow actions');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get policy effectiveness metrics
   */
  async getPolicyEffectiveness(timeframe: 'day' | 'week' | 'month' = 'week'): Promise<{
    policyId: number;
    category: string;
    totalApplications: number;
    falsePositiveRate: number;
    appealOverturnRate: number;
    averageConfidence: number;
  }[]> {
    try {
      // This would require joining with moderation_cases and appeals tables
      // For now, return mock data structure
      return [];
    } catch (error) {
      console.error('Failed to get policy effectiveness:', error);
      return [];
    }
  }

  /**
   * Export current policy configuration
   */
  async exportConfiguration(): Promise<{
    policies: PolicyRule[];
    vendors: VendorConfig[];
    exportedAt: Date;
  }> {
    const policies = await this.getAllPolicies();
    const vendors = await this.getAllVendors();

    return {
      policies,
      vendors,
      exportedAt: new Date()
    };
  }

  /**
   * Import policy configuration
   */
  async importConfiguration(config: {
    policies: Omit<PolicyRule, 'id'>[];
    vendors?: Partial<Omit<VendorConfig, 'id'>>[];
  }): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Validate all policies first
      for (const policy of config.policies) {
        const validation = this.validatePolicy(policy);
        if (!validation.isValid) {
          errors.push(`Policy ${policy.category}: ${validation.errors.join(', ')}`);
        }
      }

      if (errors.length > 0) {
        return { success: false, errors };
      }

      // Deactivate all existing policies
      const existingPolicies = await this.getAllPolicies();
      for (const policy of existingPolicies) {
        await this.updatePolicy(policy.id, { isActive: false });
      }

      // Create new policies
      for (const policy of config.policies) {
        const created = await this.createPolicy(policy);
        if (!created) {
          errors.push(`Failed to create policy for category: ${policy.category}`);
        }
      }

      return { success: errors.length === 0, errors };
    } catch (error) {
      console.error('Failed to import configuration:', error);
      return { success: false, errors: ['Import failed due to system error'] };
    }
  }
}

export const policyConfigurationService = new PolicyConfigurationService();