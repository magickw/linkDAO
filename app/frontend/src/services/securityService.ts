import { apiClient } from './apiClient';

export interface TwoFactorSetupResponse {
    secret: string;
    qrCode: string;
    backupCodes: string[];
}

export interface Session {
    id: string;
    deviceInfo: any;
    ipAddress?: string;
    lastActivityAt: Date;
    isActive: boolean;
}

export interface ActivityLogEntry {
    id: string;
    activityType: string;
    description: string;
    metadata?: any;
    severity: 'info' | 'warning' | 'critical';
    createdAt: Date;
}

export interface TrustedDevice {
    id: string;
    deviceName?: string;
    deviceInfo: any;
    lastUsedAt: Date;
    isTrusted: boolean;
}

export interface SecurityAlert {
    id: string;
    alertType: string;
    severity: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: Date;
}

export interface SecurityAlertsConfig {
    newDeviceAlerts: boolean;
    suspiciousActivityAlerts: boolean;
    largeTransactionAlerts: boolean;
    largeTransactionThreshold: string;
    securityChangeAlerts: boolean;
    loginAlerts: boolean;
}

export interface PrivacySettings {
    hideTransactionHistory: boolean;
    anonymousMode: boolean;
    showWalletBalance: boolean;
    publicProfile: boolean;
    allowDataSharing: boolean;
    marketingEmails: boolean;
}

class SecurityService {
    // ============ 2FA Methods ============

    async setupTOTP(): Promise<TwoFactorSetupResponse> {
        const response = await apiClient.post('/security/2fa/setup');
        return response.data;
    }

    async verifyAndEnableTOTP(token: string): Promise<{ success: boolean }> {
        const response = await apiClient.post('/security/2fa/verify', { token });
        return response.data;
    }

    async disable2FA(): Promise<{ success: boolean }> {
        const response = await apiClient.delete('/security/2fa');
        return response.data;
    }

    // ============ Session Management ============

    async getSessions(): Promise<Session[]> {
        const response = await apiClient.get('/security/sessions');
        return response.data;
    }

    async terminateSession(sessionId: string): Promise<{ success: boolean }> {
        const response = await apiClient.delete(`/security/sessions/${sessionId}`);
        return response.data;
    }

    async terminateAllOtherSessions(): Promise<{ success: boolean }> {
        const response = await apiClient.post('/security/sessions/terminate-others');
        return response.data;
    }

    // ============ Activity Log ============

    async getActivityLog(limit: number = 50, offset: number = 0): Promise<ActivityLogEntry[]> {
        const response = await apiClient.get('/security/activity-log', {
            params: { limit, offset }
        });
        return response.data;
    }

    // ============ Trusted Devices ============

    async getTrustedDevices(): Promise<TrustedDevice[]> {
        const response = await apiClient.get('/security/trusted-devices');
        return response.data;
    }

    async addTrustedDevice(deviceFingerprint: string, deviceInfo: any, deviceName?: string): Promise<TrustedDevice> {
        const response = await apiClient.post('/security/trusted-devices', {
            deviceFingerprint,
            deviceInfo,
            deviceName
        });
        return response.data;
    }

    async removeTrustedDevice(deviceId: string): Promise<{ success: boolean }> {
        const response = await apiClient.delete(`/security/trusted-devices/${deviceId}`);
        return response.data;
    }

    // ============ Security Alerts ============

    async getAlertsConfig(): Promise<SecurityAlertsConfig> {
        const response = await apiClient.get('/security/alerts/config');
        return response.data;
    }

    async updateAlertsConfig(config: Partial<SecurityAlertsConfig>): Promise<{ success: boolean }> {
        const response = await apiClient.put('/security/alerts/config', config);
        return response.data;
    }

    async getAlerts(unreadOnly: boolean = false): Promise<SecurityAlert[]> {
        const response = await apiClient.get('/security/alerts', {
            params: { unreadOnly }
        });
        return response.data;
    }

    async markAlertAsRead(alertId: string): Promise<{ success: boolean }> {
        const response = await apiClient.put(`/security/alerts/${alertId}/read`);
        return response.data;
    }

    // ============ Privacy Settings ============

    async getPrivacySettings(): Promise<PrivacySettings> {
        const response = await apiClient.get('/security/privacy');
        return response.data;
    }

    async updatePrivacySettings(settings: Partial<PrivacySettings>): Promise<{ success: boolean }> {
        const response = await apiClient.put('/security/privacy', settings);
        return response.data;
    }
}

export const securityService = new SecurityService();
