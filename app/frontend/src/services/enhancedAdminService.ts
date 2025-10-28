import { adminService } from './adminService';
import { AuthUser, ModerationQueue, SellerApplication, DisputeCase, AdminAction } from '@/types/auth';

// Enhanced admin service with better error handling and real-time capabilities
class EnhancedAdminService {
  private adminServiceInstance = adminService;

  // Enhanced moderation queue with better error handling
  async getModerationQueue(filters?: any) {
    try {
      const result = await this.adminServiceInstance.getModerationQueue(filters);
      return { success: true, data: result };
    } catch (error: any) {
      console.error('Error fetching moderation queue:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to fetch moderation queue',
        data: { items: [], total: 0, page: 1, totalPages: 0 }
      };
    }
  }

  async assignModerationItem(itemId: string, assigneeId: string) {
    try {
      const result = await this.adminServiceInstance.assignModerationItem(itemId, assigneeId);
      return { success: true, data: result };
    } catch (error: any) {
      console.error('Error assigning moderation item:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to assign moderation item',
        data: { success: false }
      };
    }
  }

  async resolveModerationItem(itemId: string, resolution: any) {
    try {
      const result = await this.adminServiceInstance.resolveModerationItem(itemId, resolution);
      return { success: true, data: result };
    } catch (error: any) {
      console.error('Error resolving moderation item:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to resolve moderation item',
        data: { success: false }
      };
    }
  }

  // Enhanced seller applications with better error handling
  async getSellerApplications(filters?: any) {
    try {
      const result = await this.adminServiceInstance.getSellerApplications(filters);
      return { success: true, data: result };
    } catch (error: any) {
      console.error('Error fetching seller applications:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to fetch seller applications',
        data: { applications: [], total: 0, page: 1, totalPages: 0 }
      };
    }
  }

  async reviewSellerApplication(applicationId: string, review: any) {
    try {
      const result = await this.adminServiceInstance.reviewSellerApplication(applicationId, review);
      return { success: true, data: result };
    } catch (error: any) {
      console.error('Error reviewing seller application:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to review seller application',
        data: { success: false }
      };
    }
  }

  // Enhanced disputes with better error handling
  async getDisputes(filters?: any) {
    try {
      const result = await this.adminServiceInstance.getDisputes(filters);
      return { success: true, data: result };
    } catch (error: any) {
      console.error('Error fetching disputes:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to fetch disputes',
        data: { disputes: [], total: 0, page: 1, totalPages: 0 }
      };
    }
  }

  async resolveDispute(disputeId: string, resolution: any) {
    try {
      const result = await this.adminServiceInstance.resolveDispute(disputeId, resolution);
      return { success: true, data: result };
    } catch (error: any) {
      console.error('Error resolving dispute:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to resolve dispute',
        data: { success: false }
      };
    }
  }

  // Enhanced user management with better error handling
  async getUsers(filters?: any) {
    try {
      const result = await this.adminServiceInstance.getUsers(filters);
      return { success: true, data: result };
    } catch (error: any) {
      console.error('Error fetching users:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to fetch users',
        data: { users: [], total: 0, page: 1, totalPages: 0 }
      };
    }
  }

  async updateUserRole(userId: string, role: string) {
    try {
      const result = await this.adminServiceInstance.updateUserRole(userId, role);
      return { success: true, data: result };
    } catch (error: any) {
      console.error('Error updating user role:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to update user role',
        data: { success: false }
      };
    }
  }

  // Enhanced stats with better error handling
  async getAdminStats() {
    try {
      const result = await this.adminServiceInstance.getAdminStats();
      return { success: true, data: result };
    } catch (error: any) {
      console.error('Error fetching admin stats:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to fetch admin stats',
        data: {
          pendingModerations: 0,
          pendingSellerApplications: 0,
          openDisputes: 0,
          suspendedUsers: 0,
          totalUsers: 0,
          totalSellers: 0,
          recentActions: []
        }
      };
    }
  }

  // Real-time capabilities
  async subscribeToRealTimeUpdates(callback: (data: any) => void) {
    // This would integrate with WebSocket or similar real-time technology
    console.log('Subscribing to real-time updates');
    // In a real implementation, this would set up WebSocket listeners
  }

  async unsubscribeFromRealTimeUpdates() {
    // This would clean up WebSocket listeners
    console.log('Unsubscribing from real-time updates');
  }
}

export const enhancedAdminService = new EnhancedAdminService();
export default enhancedAdminService;