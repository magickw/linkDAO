import BiometricService from './biometricService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface GovernanceSession {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  actions: GovernanceAction[];
  biometricUsed: boolean;
}

export interface GovernanceAction {
  id: string;
  type: 'view' | 'vote' | 'create' | 'comment';
  proposalId?: string;
  timestamp: Date;
  details?: any;
}

export class MobileGovernanceService {
  private static instance: MobileGovernanceService;
  private currentSession: GovernanceSession | null = null;

  private constructor() {}

  public static getInstance(): MobileGovernanceService {
    if (!MobileGovernanceService.instance) {
      MobileGovernanceService.instance = new MobileGovernanceService();
    }
    return MobileGovernanceService.instance;
  }

  /**
   * Start a new governance session
   */
  async startSession(userId: string): Promise<boolean> {
    try {
      // Check if biometric authentication is available and required
      const isBiometricAvailable = await BiometricService.isBiometricAvailable();
      let biometricUsed = false;
      
      if (isBiometricAvailable) {
        const authenticated = await BiometricService.authenticateUser(
          'Authenticate to access governance features'
        );
        
        if (!authenticated) {
          console.log('Biometric authentication failed');
          return false;
        }
        
        biometricUsed = true;
      }

      // Create new session
      this.currentSession = {
        id: `session_${Date.now()}`,
        userId,
        startTime: new Date(),
        actions: [],
        biometricUsed,
      };

      // Save session to storage
      await AsyncStorage.setItem('currentGovernanceSession', JSON.stringify(this.currentSession));
      
      console.log('Governance session started');
      return true;
    } catch (error) {
      console.error('Error starting governance session:', error);
      return false;
    }
  }

  /**
   * End current governance session
   */
  async endSession(): Promise<boolean> {
    try {
      if (this.currentSession) {
        this.currentSession.endTime = new Date();
        
        // Save completed session
        const sessions = await this.getStoredSessions();
        sessions.push(this.currentSession);
        await AsyncStorage.setItem('governanceSessions', JSON.stringify(sessions));
        
        // Clear current session
        this.currentSession = null;
        await AsyncStorage.removeItem('currentGovernanceSession');
        
        console.log('Governance session ended');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error ending governance session:', error);
      return false;
    }
  }

  /**
   * Record a governance action
   */
  async recordAction(action: Omit<GovernanceAction, 'id' | 'timestamp'>): Promise<boolean> {
    try {
      if (!this.currentSession) {
        console.log('No active governance session');
        return false;
      }

      const fullAction: GovernanceAction = {
        id: `action_${Date.now()}`,
        ...action,
        timestamp: new Date(),
      };

      this.currentSession.actions.push(fullAction);
      
      // Update stored session
      await AsyncStorage.setItem('currentGovernanceSession', JSON.stringify(this.currentSession));
      
      console.log('Governance action recorded:', action.type);
      return true;
    } catch (error) {
      console.error('Error recording governance action:', error);
      return false;
    }
  }

  /**
   * Get current session
   */
  getCurrentSession(): GovernanceSession | null {
    return this.currentSession;
  }

  /**
   * Get stored sessions
   */
  async getStoredSessions(): Promise<GovernanceSession[]> {
    try {
      const sessionsJson = await AsyncStorage.getItem('governanceSessions');
      return sessionsJson ? JSON.parse(sessionsJson) : [];
    } catch (error) {
      console.error('Error getting stored sessions:', error);
      return [];
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats(): Promise<{
    totalSessions: number;
    totalActions: number;
    averageActionsPerSession: number;
    biometricUsageRate: number;
  }> {
    try {
      const sessions = await this.getStoredSessions();
      
      const totalSessions = sessions.length;
      const totalActions = sessions.reduce((sum, session) => sum + session.actions.length, 0);
      const averageActionsPerSession = totalSessions > 0 ? totalActions / totalSessions : 0;
      const biometricSessions = sessions.filter(session => session.biometricUsed).length;
      const biometricUsageRate = totalSessions > 0 ? biometricSessions / totalSessions : 0;
      
      return {
        totalSessions,
        totalActions,
        averageActionsPerSession,
        biometricUsageRate,
      };
    } catch (error) {
      console.error('Error getting session stats:', error);
      return {
        totalSessions: 0,
        totalActions: 0,
        averageActionsPerSession: 0,
        biometricUsageRate: 0,
      };
    }
  }

  /**
   * Clear session history
   */
  async clearSessionHistory(): Promise<boolean> {
    try {
      await AsyncStorage.removeItem('governanceSessions');
      console.log('Governance session history cleared');
      return true;
    } catch (error) {
      console.error('Error clearing session history:', error);
      return false;
    }
  }
}

export default MobileGovernanceService.getInstance();