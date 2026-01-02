const BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || (typeof window !== 'undefined' ? window.location.origin : '');

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
    // Helper method to get auth headers
    private getAuthHeaders(): HeadersInit {
        const token = localStorage.getItem('linkdao_access_token') ||
            localStorage.getItem('authToken') ||
            localStorage.getItem('token') ||
            localStorage.getItem('auth_token');

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
    }

    // ============ 2FA Methods ============

    async setupTOTP(): Promise<TwoFactorSetupResponse> {
        const response = await fetch(`${BASE_URL}/api/security/2fa/setup`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to setup 2FA (${response.status}): ${errorText}`);
        }
        return response.json();
    }

    async verifyAndEnableTOTP(token: string): Promise<{ success: boolean }> {
        const response = await fetch(`${BASE_URL}/api/security/2fa/verify`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({ token }),
        });
        if (!response.ok) throw new Error('Failed to verify 2FA');
        return response.json();
    }

    async disable2FA(): Promise<{ success: boolean }> {
        const response = await fetch(`${BASE_URL}/api/security/2fa`, {
            method: 'DELETE',
            headers: this.getAuthHeaders(),
        });
        if (!response.ok) throw new Error('Failed to disable 2FA');
        return response.json();
    }

    async setupEmail2FA(): Promise<{ success: boolean; message: string }> {
        const response = await fetch(`${BASE_URL}/api/security/2fa/email/setup`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
        });
        if (!response.ok) throw new Error('Failed to setup email 2FA');
        return response.json();
    }

    async verifyAndEnableEmail2FA(code: string): Promise<{ success: boolean }> {
        const response = await fetch(`${BASE_URL}/api/security/2fa/email/verify`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({ code }),
        });
        if (!response.ok) throw new Error('Failed to verify email 2FA');
        return response.json();
    }

    async resendEmailVerificationCode(): Promise<{ success: boolean; message: string }> {
        const response = await fetch(`${BASE_URL}/api/security/2fa/email/resend`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
        });
        if (!response.ok) throw new Error('Failed to resend verification code');
        return response.json();
    }

    // ============ Session Management ============

    async getSessions(): Promise<Session[]> {
        const response = await fetch(`${BASE_URL}/api/security/sessions`, {
            headers: this.getAuthHeaders(),
        });
        if (!response.ok) throw new Error('Failed to get sessions');
        return response.json();
    }

    async terminateSession(sessionId: string): Promise<{ success: boolean }> {
        const response = await fetch(`${BASE_URL}/api/security/sessions/${sessionId}`, {
            method: 'DELETE',
            headers: this.getAuthHeaders(),
        });
        if (!response.ok) throw new Error('Failed to revoke session');
    }

    async terminateAllOtherSessions(): Promise<{ success: boolean }> {
        const response = await fetch(`${BASE_URL}/api/security/sessions/terminate-others`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
        });
        if (!response.ok) throw new Error('Failed to revoke other sessions');
    }

    // ============ Activity Log ============

    async getActivityLog(limit: number = 50, offset: number = 0): Promise<ActivityLogEntry[]> {
        const queryParams = new URLSearchParams();
        if (limit) queryParams.append('limit', limit.toString());
        if (offset) queryParams.append('offset', offset.toString());
        const response = await fetch(`${BASE_URL}/api/security/activity-log?${queryParams}`, {
            headers: this.getAuthHeaders(),
        });
        if (!response.ok) throw new Error('Failed to get activity log');
        return response.json();
    }

    // ============ Trusted Devices ============

    async getTrustedDevices(): Promise<TrustedDevice[]> {
        const response = await fetch(`${BASE_URL}/api/security/trusted-devices`, {
            headers: this.getAuthHeaders(),
        });
        if (!response.ok) throw new Error('Failed to get trusted devices');
        return response.json();
    }

    async addTrustedDevice(deviceFingerprint: string, deviceInfo: any, deviceName?: string): Promise<TrustedDevice> {
        const response = await fetch(`${BASE_URL}/api/security/trusted-devices`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({ deviceFingerprint, deviceInfo, deviceName }),
        });
        if (!response.ok) throw new Error('Failed to add trusted device');
        return response.json();
    }

    async removeTrustedDevice(deviceId: string): Promise<{ success: boolean }> {
        const response = await fetch(`${BASE_URL}/api/security/trusted-devices/${deviceId}`, {
            method: 'DELETE',
            headers: this.getAuthHeaders(),
        });
        if (!response.ok) throw new Error('Failed to remove trusted device');
        return response.json();
    }

    // ============ Security Alerts ============

    async getAlertsConfig(): Promise<SecurityAlertsConfig> {
        const response = await fetch(`${BASE_URL}/api/security/alerts/config`, {
            headers: this.getAuthHeaders(),
        });
        if (!response.ok) throw new Error('Failed to get alerts config');
        return response.json();
    }

    async updateAlertsConfig(config: Partial<SecurityAlertsConfig>): Promise<{ success: boolean }> {
        const response = await fetch(`${BASE_URL}/api/security/alerts/config`, {
            method: 'PUT',
            headers: this.getAuthHeaders(),
            body: JSON.stringify(config),
        });
        if (!response.ok) throw new Error('Failed to update alerts config');
        return response.json();
    }

async getAlerts(params?: { limit?: number; unreadOnly?: boolean }): Promise<SecurityAlert[]> {
        const queryParams = new URLSearchParams();
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        if (params?.unreadOnly !== undefined) queryParams.append('unreadOnly', params.unreadOnly.toString());
        const response = await fetch(`${BASE_URL}/api/security/alerts?${queryParams}`, {
            headers: this.getAuthHeaders(),
        });
        if (!response.ok) throw new Error('Failed to get alerts');
        return response.json();
    }

    async markAlertAsRead(alertId: string): Promise<void> {
        const response = await fetch(`${BASE_URL}/api/security/alerts/${alertId}/read`, {
            method: 'PUT',
            headers: this.getAuthHeaders(),
        });
        if (!response.ok) throw new Error('Failed to mark alert as read');
    }

    // ============ Privacy Settings ============

    async getPrivacySettings(): Promise<PrivacySettings> {
        const response = await fetch(`${BASE_URL}/api/security/privacy`, {
            headers: this.getAuthHeaders(),
        });
        if (!response.ok) throw new Error('Failed to get privacy settings');
        return response.json();
    }

    async updatePrivacySettings(settings: PrivacySettings): Promise<PrivacySettings> {
        const response = await fetch(`${BASE_URL}/api/security/privacy`, {
            method: 'PUT',
            headers: this.getAuthHeaders(),
            body: JSON.stringify(settings),
        });
        if (!response.ok) throw new Error('Failed to update privacy settings');
        return response.json();
    }
}

export const securityService = new SecurityService();
