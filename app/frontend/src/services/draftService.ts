import { PostDraft, ContentType } from '../types/enhancedPost';

/**
 * Draft Management Service
 * Handles auto-saving, loading, and managing post drafts
 */
export class DraftService {
  private static readonly STORAGE_PREFIX = 'post_draft_';
  private static readonly MAX_DRAFTS = 10;
  private static readonly DRAFT_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days
  private static readonly AUTO_SAVE_INTERVAL = 2000; // 2 seconds

  /**
   * Generate a draft key based on context
   */
  private static getDraftKey(context: 'feed' | 'community', communityId?: string): string {
    if (context === 'community' && communityId) {
      return `${this.STORAGE_PREFIX}${context}_${communityId}`;
    }
    return `${this.STORAGE_PREFIX}${context}`;
  }

  /**
   * Generate a unique draft ID
   */
  private static generateDraftId(): string {
    return `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Save a draft to localStorage
   */
  static saveDraft(draft: PostDraft): void {
    try {
      const key = this.getDraftKey(
        draft.communityId ? 'community' : 'feed',
        draft.communityId
      );
      
      // Update timestamps
      const updatedDraft: PostDraft = {
        ...draft,
        updatedAt: new Date(),
        autoSaved: true
      };
      
      localStorage.setItem(key, JSON.stringify(updatedDraft));
      
      // Also save to drafts list for management
      this.addToDraftsList(updatedDraft);
      
      console.log('Draft saved:', key);
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  }

  /**
   * Load a draft from localStorage
   */
  static loadDraft(context: 'feed' | 'community', communityId?: string): PostDraft | null {
    try {
      const key = this.getDraftKey(context, communityId);
      const draftData = localStorage.getItem(key);
      
      if (!draftData) return null;
      
      const draft: PostDraft = JSON.parse(draftData);
      
      // Check if draft is expired
      const now = new Date();
      const draftAge = now.getTime() - new Date(draft.updatedAt).getTime();
      
      if (draftAge > this.DRAFT_EXPIRY) {
        this.deleteDraft(context, communityId);
        return null;
      }
      
      // Convert date strings back to Date objects
      draft.createdAt = new Date(draft.createdAt);
      draft.updatedAt = new Date(draft.updatedAt);
      if (draft.scheduledAt) {
        draft.scheduledAt = new Date(draft.scheduledAt);
      }
      
      return draft;
    } catch (error) {
      console.error('Failed to load draft:', error);
      return null;
    }
  }

  /**
   * Delete a draft
   */
  static deleteDraft(context: 'feed' | 'community', communityId?: string): void {
    try {
      const key = this.getDraftKey(context, communityId);
      localStorage.removeItem(key);
      
      // Also remove from drafts list
      this.removeFromDraftsList(key);
      
      console.log('Draft deleted:', key);
    } catch (error) {
      console.error('Failed to delete draft:', error);
    }
  }

  /**
   * Create a new draft
   */
  static createDraft(
    context: 'feed' | 'community',
    communityId?: string,
    contentType: ContentType = ContentType.POST
  ): PostDraft {
    const now = new Date();
    
    return {
      id: this.generateDraftId(),
      contentType,
      content: '',
      media: [],
      links: [],
      hashtags: [],
      mentions: [],
      communityId,
      createdAt: now,
      updatedAt: now,
      autoSaved: false
    };
  }

  /**
   * Check if a draft exists
   */
  static hasDraft(context: 'feed' | 'community', communityId?: string): boolean {
    const key = this.getDraftKey(context, communityId);
    return localStorage.getItem(key) !== null;
  }

  /**
   * Get all saved drafts
   */
  static getAllDrafts(): PostDraft[] {
    try {
      const draftsData = localStorage.getItem(`${this.STORAGE_PREFIX}list`);
      if (!draftsData) return [];
      
      const draftsList: string[] = JSON.parse(draftsData);
      const drafts: PostDraft[] = [];
      
      for (const key of draftsList) {
        const draftData = localStorage.getItem(key);
        if (draftData) {
          try {
            const draft: PostDraft = JSON.parse(draftData);
            
            // Check if draft is expired
            const now = new Date();
            const draftAge = now.getTime() - new Date(draft.updatedAt).getTime();
            
            if (draftAge <= this.DRAFT_EXPIRY) {
              // Convert date strings back to Date objects
              draft.createdAt = new Date(draft.createdAt);
              draft.updatedAt = new Date(draft.updatedAt);
              if (draft.scheduledAt) {
                draft.scheduledAt = new Date(draft.scheduledAt);
              }
              drafts.push(draft);
            } else {
              // Remove expired draft
              localStorage.removeItem(key);
            }
          } catch (error) {
            console.error('Failed to parse draft:', key, error);
            localStorage.removeItem(key);
          }
        }
      }
      
      // Update the drafts list to remove expired entries
      const validKeys = drafts.map(d => 
        this.getDraftKey(d.communityId ? 'community' : 'feed', d.communityId)
      );
      localStorage.setItem(`${this.STORAGE_PREFIX}list`, JSON.stringify(validKeys));
      
      return drafts.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    } catch (error) {
      console.error('Failed to get all drafts:', error);
      return [];
    }
  }

  /**
   * Add draft to the drafts list for management
   */
  private static addToDraftsList(draft: PostDraft): void {
    try {
      const key = this.getDraftKey(
        draft.communityId ? 'community' : 'feed',
        draft.communityId
      );
      
      const draftsData = localStorage.getItem(`${this.STORAGE_PREFIX}list`);
      let draftsList: string[] = draftsData ? JSON.parse(draftsData) : [];
      
      // Add key if not already present
      if (!draftsList.includes(key)) {
        draftsList.push(key);
        
        // Limit number of drafts
        if (draftsList.length > this.MAX_DRAFTS) {
          const oldestKey = draftsList.shift();
          if (oldestKey) {
            localStorage.removeItem(oldestKey);
          }
        }
        
        localStorage.setItem(`${this.STORAGE_PREFIX}list`, JSON.stringify(draftsList));
      }
    } catch (error) {
      console.error('Failed to add to drafts list:', error);
    }
  }

  /**
   * Remove draft from the drafts list
   */
  private static removeFromDraftsList(key: string): void {
    try {
      const draftsData = localStorage.getItem(`${this.STORAGE_PREFIX}list`);
      if (!draftsData) return;
      
      let draftsList: string[] = JSON.parse(draftsData);
      draftsList = draftsList.filter(k => k !== key);
      
      localStorage.setItem(`${this.STORAGE_PREFIX}list`, JSON.stringify(draftsList));
    } catch (error) {
      console.error('Failed to remove from drafts list:', error);
    }
  }

  /**
   * Clean up expired drafts
   */
  static cleanupExpiredDrafts(): void {
    try {
      const drafts = this.getAllDrafts(); // This already filters out expired drafts
      console.log(`Cleaned up expired drafts. ${drafts.length} drafts remaining.`);
    } catch (error) {
      console.error('Failed to cleanup expired drafts:', error);
    }
  }

  /**
   * Get draft statistics
   */
  static getDraftStats(): {
    total: number;
    byContentType: Record<ContentType, number>;
    oldestDraft?: Date;
    newestDraft?: Date;
  } {
    const drafts = this.getAllDrafts();
    
    const stats = {
      total: drafts.length,
      byContentType: {
        [ContentType.POST]: 0,
        [ContentType.POLL]: 0,
        [ContentType.PROPOSAL]: 0
      } as Record<ContentType, number>,
      oldestDraft: undefined as Date | undefined,
      newestDraft: undefined as Date | undefined
    };
    
    if (drafts.length > 0) {
      stats.oldestDraft = drafts[drafts.length - 1].createdAt;
      stats.newestDraft = drafts[0].updatedAt;
      
      drafts.forEach(draft => {
        stats.byContentType[draft.contentType]++;
      });
    }
    
    return stats;
  }

  /**
   * Auto-save functionality with debouncing
   */
  static createAutoSaver(
    context: 'feed' | 'community',
    communityId?: string
  ): {
    save: (draft: Partial<PostDraft>) => void;
    cancel: () => void;
  } {
    let timeoutId: NodeJS.Timeout | null = null;
    let currentDraft: PostDraft | null = this.loadDraft(context, communityId);
    
    if (!currentDraft) {
      currentDraft = this.createDraft(context, communityId);
    }

    const save = (updates: Partial<PostDraft>) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = setTimeout(() => {
        if (currentDraft) {
          const updatedDraft: PostDraft = {
            ...currentDraft,
            ...updates,
            updatedAt: new Date()
          };
          
          // Only save if there's actual content
          if (updatedDraft.content.trim() || 
              updatedDraft.media.length > 0 || 
              updatedDraft.links.length > 0 ||
              updatedDraft.poll ||
              updatedDraft.proposal) {
            this.saveDraft(updatedDraft);
            currentDraft = updatedDraft;
          }
        }
      }, this.AUTO_SAVE_INTERVAL);
    };

    const cancel = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    return { save, cancel };
  }
}