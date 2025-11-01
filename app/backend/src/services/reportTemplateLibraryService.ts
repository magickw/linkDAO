import { ReportTemplate } from '../types/reporting';

interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  templates: string[];
}

interface TemplateUsageStats {
  templateId: string;
  usageCount: number;
  lastUsed: Date;
  averageRating: number;
  totalRatings: number;
  createdReports: number;
  sharedCount: number;
}

interface TemplateRating {
  id: string;
  templateId: string;
  userId: string;
  rating: number;
  comment?: string;
  createdAt: Date;
}

interface TemplateShare {
  id: string;
  templateId: string;
  sharedBy: string;
  sharedWith: string[];
  shareType: 'view' | 'edit' | 'copy';
  expiresAt?: Date;
  createdAt: Date;
  isActive: boolean;
}

interface TemplateVersion {
  id: string;
  templateId: string;
  version: number;
  changes: string[];
  createdBy: string;
  createdAt: Date;
  isActive: boolean;
}

export class ReportTemplateLibraryService {
  private categories: Map<string, TemplateCategory> = new Map();
  private usageStats: Map<string, TemplateUsageStats> = new Map();
  private ratings: Map<string, TemplateRating> = new Map();
  private shares: Map<string, TemplateShare> = new Map();
  private versions: Map<string, TemplateVersion[]> = new Map();

  constructor() {
    this.initializeDefaultCategories();
  }

  // Category Management
  async createCategory(category: Omit<TemplateCategory, 'id' | 'templates'>): Promise<TemplateCategory> {
    const newCategory: TemplateCategory = {
      ...category,
      id: this.generateId(),
      templates: []
    };

    this.categories.set(newCategory.id, newCategory);
    return newCategory;
  }

  async getCategories(): Promise<TemplateCategory[]> {
    return Array.from(this.categories.values())
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async getCategory(id: string): Promise<TemplateCategory | null> {
    return this.categories.get(id) || null;
  }

  async updateCategory(id: string, updates: Partial<TemplateCategory>): Promise<TemplateCategory> {
    const existing = this.categories.get(id);
    if (!existing) {
      throw new Error(`Category with id ${id} not found`);
    }

    const updated = { ...existing, ...updates, id: existing.id };
    this.categories.set(id, updated);
    return updated;
  }

  async deleteCategory(id: string): Promise<boolean> {
    const category = this.categories.get(id);
    if (!category) return false;

    // Don't delete if category has templates
    if (category.templates.length > 0) {
      throw new Error('Cannot delete category with templates');
    }

    return this.categories.delete(id);
  }

  // Template Categorization
  async addTemplateToCategory(templateId: string, categoryId: string): Promise<void> {
    const category = this.categories.get(categoryId);
    if (!category) {
      throw new Error(`Category with id ${categoryId} not found`);
    }

    if (!category.templates.includes(templateId)) {
      category.templates.push(templateId);
      this.categories.set(categoryId, category);
    }
  }

  async removeTemplateFromCategory(templateId: string, categoryId: string): Promise<void> {
    const category = this.categories.get(categoryId);
    if (!category) return;

    category.templates = category.templates.filter(id => id !== templateId);
    this.categories.set(categoryId, category);
  }

  async getTemplatesByCategory(categoryId: string): Promise<string[]> {
    const category = this.categories.get(categoryId);
    return category ? category.templates : [];
  }

  // Search and Discovery
  async searchTemplates(query: {
    text?: string;
    category?: string;
    tags?: string[];
    createdBy?: string;
    isPublic?: boolean;
    minRating?: number;
    sortBy?: 'name' | 'created' | 'updated' | 'usage' | 'rating';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }): Promise<{
    templates: ReportTemplate[];
    total: number;
    facets: {
      categories: { id: string; name: string; count: number }[];
      tags: { tag: string; count: number }[];
      creators: { userId: string; count: number }[];
    };
  }> {
    // This would integrate with the reportBuilderService to get actual templates
    // For now, return mock data
    const mockTemplates: ReportTemplate[] = [
      {
        id: 'tpl_1',
        name: 'User Analytics Dashboard',
        description: 'Comprehensive user behavior and engagement analytics',
        category: 'analytics',
        sections: [],
        parameters: [],
        scheduling: { enabled: false, frequency: 'daily', timezone: 'UTC', recipients: [], format: 'pdf' },
        permissions: { view: [], edit: [], delete: [], schedule: [], share: [] },
        createdBy: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        isPublic: true,
        tags: ['analytics', 'users', 'dashboard']
      }
    ];

    // Apply filters
    let filteredTemplates = mockTemplates;

    if (query.text) {
      const searchText = query.text.toLowerCase();
      filteredTemplates = filteredTemplates.filter(t => 
        t.name.toLowerCase().includes(searchText) ||
        t.description?.toLowerCase().includes(searchText) ||
        t.tags.some(tag => tag.toLowerCase().includes(searchText))
      );
    }

    if (query.category) {
      filteredTemplates = filteredTemplates.filter(t => t.category === query.category);
    }

    if (query.tags && query.tags.length > 0) {
      filteredTemplates = filteredTemplates.filter(t => 
        query.tags!.some(tag => t.tags.includes(tag))
      );
    }

    if (query.createdBy) {
      filteredTemplates = filteredTemplates.filter(t => t.createdBy === query.createdBy);
    }

    if (query.isPublic !== undefined) {
      filteredTemplates = filteredTemplates.filter(t => t.isPublic === query.isPublic);
    }

    if (query.minRating) {
      filteredTemplates = filteredTemplates.filter(t => {
        const stats = this.usageStats.get(t.id);
        return stats ? stats.averageRating >= query.minRating! : false;
      });
    }

    // Apply sorting
    if (query.sortBy) {
      filteredTemplates.sort((a, b) => {
        let comparison = 0;
        
        switch (query.sortBy) {
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'created':
            comparison = a.createdAt.getTime() - b.createdAt.getTime();
            break;
          case 'updated':
            comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
            break;
          case 'usage':
            const usageA = this.usageStats.get(a.id)?.usageCount || 0;
            const usageB = this.usageStats.get(b.id)?.usageCount || 0;
            comparison = usageA - usageB;
            break;
          case 'rating':
            const ratingA = this.usageStats.get(a.id)?.averageRating || 0;
            const ratingB = this.usageStats.get(b.id)?.averageRating || 0;
            comparison = ratingA - ratingB;
            break;
        }

        return query.sortOrder === 'desc' ? -comparison : comparison;
      });
    }

    // Apply pagination
    const total = filteredTemplates.length;
    const offset = query.offset || 0;
    const limit = query.limit || 50;
    const paginatedTemplates = filteredTemplates.slice(offset, offset + limit);

    // Generate facets
    const facets = {
      categories: Array.from(this.categories.values()).map(cat => ({
        id: cat.id,
        name: cat.name,
        count: mockTemplates.filter(t => t.category === cat.id).length
      })),
      tags: this.generateTagFacets(mockTemplates),
      creators: this.generateCreatorFacets(mockTemplates)
    };

    return {
      templates: paginatedTemplates,
      total,
      facets
    };
  }

  // Usage Analytics
  async recordTemplateUsage(templateId: string, userId: string): Promise<void> {
    let stats = this.usageStats.get(templateId);
    
    if (!stats) {
      stats = {
        templateId,
        usageCount: 0,
        lastUsed: new Date(),
        averageRating: 0,
        totalRatings: 0,
        createdReports: 0,
        sharedCount: 0
      };
    }

    stats.usageCount++;
    stats.lastUsed = new Date();
    
    this.usageStats.set(templateId, stats);
  }

  async getTemplateUsageStats(templateId: string): Promise<TemplateUsageStats | null> {
    return this.usageStats.get(templateId) || null;
  }

  async getPopularTemplates(limit: number = 10): Promise<{
    template: ReportTemplate;
    stats: TemplateUsageStats;
  }[]> {
    // This would integrate with reportBuilderService to get actual templates
    return [];
  }

  async getTrendingTemplates(days: number = 7, limit: number = 10): Promise<{
    template: ReportTemplate;
    stats: TemplateUsageStats;
    trend: number;
  }[]> {
    // Calculate trending based on recent usage growth
    return [];
  }

  // Rating System
  async rateTemplate(
    templateId: string,
    userId: string,
    rating: number,
    comment?: string
  ): Promise<TemplateRating> {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    const ratingId = this.generateId();
    const templateRating: TemplateRating = {
      id: ratingId,
      templateId,
      userId,
      rating,
      comment,
      createdAt: new Date()
    };

    this.ratings.set(ratingId, templateRating);

    // Update usage stats
    await this.updateAverageRating(templateId);

    return templateRating;
  }

  async getTemplateRatings(templateId: string): Promise<TemplateRating[]> {
    return Array.from(this.ratings.values())
      .filter(r => r.templateId === templateId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getUserRating(templateId: string, userId: string): Promise<TemplateRating | null> {
    return Array.from(this.ratings.values())
      .find(r => r.templateId === templateId && r.userId === userId) || null;
  }

  // Sharing and Collaboration
  async shareTemplate(
    templateId: string,
    sharedBy: string,
    sharedWith: string[],
    shareType: 'view' | 'edit' | 'copy',
    expiresAt?: Date
  ): Promise<TemplateShare> {
    const shareId = this.generateId();
    const share: TemplateShare = {
      id: shareId,
      templateId,
      sharedBy,
      sharedWith,
      shareType,
      expiresAt,
      createdAt: new Date(),
      isActive: true
    };

    this.shares.set(shareId, share);

    // Update usage stats
    const stats = this.usageStats.get(templateId);
    if (stats) {
      stats.sharedCount++;
      this.usageStats.set(templateId, stats);
    }

    return share;
  }

  async getTemplateShares(templateId: string): Promise<TemplateShare[]> {
    return Array.from(this.shares.values())
      .filter(s => s.templateId === templateId && s.isActive)
      .filter(s => !s.expiresAt || s.expiresAt > new Date());
  }

  async getUserSharedTemplates(userId: string): Promise<TemplateShare[]> {
    return Array.from(this.shares.values())
      .filter(s => s.sharedWith.includes(userId) && s.isActive)
      .filter(s => !s.expiresAt || s.expiresAt > new Date());
  }

  async revokeShare(shareId: string): Promise<boolean> {
    const share = this.shares.get(shareId);
    if (!share) return false;

    share.isActive = false;
    this.shares.set(shareId, share);
    return true;
  }

  // Version Control
  async createTemplateVersion(
    templateId: string,
    changes: string[],
    createdBy: string
  ): Promise<TemplateVersion> {
    const existingVersions = this.versions.get(templateId) || [];
    const nextVersion = existingVersions.length + 1;

    // Deactivate previous versions
    existingVersions.forEach(v => v.isActive = false);

    const newVersion: TemplateVersion = {
      id: this.generateId(),
      templateId,
      version: nextVersion,
      changes,
      createdBy,
      createdAt: new Date(),
      isActive: true
    };

    const updatedVersions = [...existingVersions, newVersion];
    this.versions.set(templateId, updatedVersions);

    return newVersion;
  }

  async getTemplateVersions(templateId: string): Promise<TemplateVersion[]> {
    return this.versions.get(templateId) || [];
  }

  async getTemplateVersion(templateId: string, version: number): Promise<TemplateVersion | null> {
    const versions = this.versions.get(templateId) || [];
    return versions.find(v => v.version === version) || null;
  }

  // Approval Workflow
  async submitTemplateForApproval(templateId: string, submittedBy: string): Promise<string> {
    // Create approval request
    const approvalId = this.generateId();
    
    // In a real implementation, this would:
    // 1. Create an approval record
    // 2. Notify approvers
    // 3. Set template status to pending approval
    
    return approvalId;
  }

  async approveTemplate(approvalId: string, approvedBy: string, comments?: string): Promise<void> {
    // In a real implementation, this would:
    // 1. Update approval status
    // 2. Make template public if approved
    // 3. Notify submitter
  }

  async rejectTemplate(approvalId: string, rejectedBy: string, reason: string): Promise<void> {
    // In a real implementation, this would:
    // 1. Update approval status
    // 2. Add rejection reason
    // 3. Notify submitter
  }

  // Recommendations
  async getRecommendedTemplates(userId: string, limit: number = 5): Promise<ReportTemplate[]> {
    // This would use ML algorithms to recommend templates based on:
    // 1. User's past usage patterns
    // 2. Similar users' preferences
    // 3. Template popularity and ratings
    // 4. User's role and permissions
    
    return [];
  }

  async getSimilarTemplates(templateId: string, limit: number = 5): Promise<ReportTemplate[]> {
    // Find templates with similar:
    // 1. Categories and tags
    // 2. Section types and configurations
    // 3. Parameters and data sources
    
    return [];
  }

  // Private helper methods
  private async updateAverageRating(templateId: string): Promise<void> {
    const ratings = await this.getTemplateRatings(templateId);
    
    if (ratings.length === 0) return;

    const totalRating = ratings.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalRating / ratings.length;

    let stats = this.usageStats.get(templateId);
    if (!stats) {
      stats = {
        templateId,
        usageCount: 0,
        lastUsed: new Date(),
        averageRating: 0,
        totalRatings: 0,
        createdReports: 0,
        sharedCount: 0
      };
    }

    stats.averageRating = Math.round(averageRating * 10) / 10;
    stats.totalRatings = ratings.length;
    
    this.usageStats.set(templateId, stats);
  }

  private generateTagFacets(templates: ReportTemplate[]): { tag: string; count: number }[] {
    const tagCounts: Record<string, number> = {};
    
    templates.forEach(template => {
      template.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    return Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }

  private generateCreatorFacets(templates: ReportTemplate[]): { userId: string; count: number }[] {
    const creatorCounts: Record<string, number> = {};
    
    templates.forEach(template => {
      creatorCounts[template.createdBy] = (creatorCounts[template.createdBy] || 0) + 1;
    });

    return Object.entries(creatorCounts)
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count);
  }

  private initializeDefaultCategories(): void {
    const defaultCategories: TemplateCategory[] = [
      {
        id: 'analytics',
        name: 'Analytics',
        description: 'User behavior, engagement, and performance analytics',
        icon: '📊',
        templates: []
      },
      {
        id: 'financial',
        name: 'Financial',
        description: 'Revenue, costs, and financial performance reports',
        icon: '💰',
        templates: []
      },
      {
        id: 'operational',
        name: 'Operational',
        description: 'System health, performance, and operational metrics',
        icon: '⚙️',
        templates: []
      },
      {
        id: 'marketing',
        name: 'Marketing',
        description: 'Campaign performance, conversion, and marketing analytics',
        icon: '📈',
        templates: []
      },
      {
        id: 'compliance',
        name: 'Compliance',
        description: 'Regulatory compliance and audit reports',
        icon: '📋',
        templates: []
      },
      {
        id: 'executive',
        name: 'Executive',
        description: 'High-level summaries and executive dashboards',
        icon: '👔',
        templates: []
      }
    ];

    defaultCategories.forEach(category => {
      this.categories.set(category.id, category);
    });
  }

  private generateId(): string {
    return `lib_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const reportTemplateLibraryService = new ReportTemplateLibraryService();
