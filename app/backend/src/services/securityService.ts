import { db } from '../db';
import {
    twoFactorAuth,
    userSessions,
    userActivityLog,
    trustedDevices,
    securityAlertsConfig,
    securityAlerts,
    privacySettings
} from '../db/schema/securitySchema';
import { users } from '../db/schema';
import { eq, and, desc, gte } from 'drizzle-orm';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import { emailService } from './emailService';

export class SecurityService {
    // ============ Helper Methods ============

    /**
     * Get user email for notifications
     */
    private async getUserEmail(userId: string): Promise<string | null> {
        const [user] = await db.select({ email: users.email }).from(users)
            .where(eq(users.id, userId));
        return user?.email || null;
    }

    // ============ 2FA Methods ============

    /**
     * Setup TOTP 2FA for a user
     */
    async setupTOTP(userId: string) {
        // Generate secret
        const secret = speakeasy.generateSecret({
            name: `LinkDAO (${userId.substring(0, 8)})`,
            length: 32
        });

        // Generate QR code
        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

        // Generate backup codes
        const backupCodes = this.generateBackupCodes();

        // Store in database (not enabled yet)
        await db.insert(twoFactorAuth).values({
            userId,
            method: 'totp',
            secret: this.encrypt(secret.base32),
            backupCodes: backupCodes.map(code => this.encrypt(code)),
            isEnabled: false
        }).onConflictDoUpdate({
            target: twoFactorAuth.userId,
            set: {
                secret: this.encrypt(secret.base32),
                backupCodes: backupCodes.map(code => this.encrypt(code)),
                updatedAt: new Date()
            }
        });

        return {
            secret: secret.base32,
            qrCode: qrCodeUrl,
            backupCodes
        };
    }

    /**
     * Verify TOTP code and enable 2FA
     */
    async verifyAndEnableTOTP(userId: string, token: string) {
        const [auth] = await db.select().from(twoFactorAuth)
            .where(and(
                eq(twoFactorAuth.userId, userId),
                eq(twoFactorAuth.method, 'totp')
            ));

        if (!auth || !auth.secret) {
            throw new Error('2FA not set up');
        }

        const decryptedSecret = this.decrypt(auth.secret);
        const verified = speakeasy.totp.verify({
            secret: decryptedSecret,
            encoding: 'base32',
            token,
            window: 2
        });

        if (!verified) {
            throw new Error('Invalid verification code');
        }

        // Enable 2FA
        await db.update(twoFactorAuth)
            .set({ isEnabled: true, verifiedAt: new Date() })
            .where(eq(twoFactorAuth.id, auth.id));

        // Log activity
        await this.logActivity(userId, 'security_change', '2FA enabled', { method: 'totp' });

        // Send email notification
        const email = await this.getUserEmail(userId);
        if (email) {
            await emailService.send2FAChangeEmail(email, {
                action: 'enabled',
                timestamp: new Date()
            }).catch(err => console.error('Failed to send 2FA email:', err));
        }

        return { success: true };
    }

    /**
     * Verify TOTP code for authentication
     */
    async verifyTOTP(userId: string, token: string): Promise<boolean> {
        const [auth] = await db.select().from(twoFactorAuth)
            .where(and(
                eq(twoFactorAuth.userId, userId),
                eq(twoFactorAuth.method, 'totp'),
                eq(twoFactorAuth.isEnabled, true)
            ));

        if (!auth || !auth.secret) {
            return false;
        }

        const decryptedSecret = this.decrypt(auth.secret);
        return speakeasy.totp.verify({
            secret: decryptedSecret,
            encoding: 'base32',
            token,
            window: 2
        });
    }

    /**
     * Disable 2FA
     */
    async disable2FA(userId: string) {
        await db.update(twoFactorAuth)
            .set({ isEnabled: false })
            .where(eq(twoFactorAuth.userId, userId));

        await this.logActivity(userId, 'security_change', '2FA disabled', { method: 'totp' });

        // Send email notification
        const email = await this.getUserEmail(userId);
        if (email) {
            await emailService.send2FAChangeEmail(email, {
                action: 'disabled',
                timestamp: new Date()
            }).catch(err => console.error('Failed to send 2FA email:', err));
        }
    }

    // ============ Session Management ============

    /**
     * Create a new session
     */
    async createSession(userId: string, deviceInfo: any, ipAddress?: string, userAgent?: string) {
        const sessionToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

        const [session] = await db.insert(userSessions).values({
            userId,
            sessionToken,
            deviceInfo,
            ipAddress,
            userAgent,
            expiresAt
        }).returning();

        await this.logActivity(userId, 'login', 'User logged in', { ipAddress, deviceInfo }, session.id);

        // Send new device login email
        const email = await this.getUserEmail(userId);
        if (email) {
            await emailService.sendNewDeviceLoginEmail(email, {
                device: deviceInfo?.device || 'Unknown Device',
                browser: deviceInfo?.browser,
                os: deviceInfo?.os,
                ipAddress,
                timestamp: new Date(),
                sessionId: session.id
            }).catch(err => console.error('Failed to send new device email:', err));
        }

        return session;
    }

    /**
     * Get all active sessions for a user
     */
    async getUserSessions(userId: string) {
        return db.select().from(userSessions)
            .where(and(
                eq(userSessions.userId, userId),
                eq(userSessions.isActive, true),
                gte(userSessions.expiresAt, new Date())
            ))
            .orderBy(desc(userSessions.lastActivityAt));
    }

    /**
     * Terminate a specific session
     */
    async terminateSession(sessionId: string, userId: string) {
        await db.update(userSessions)
            .set({ isActive: false })
            .where(and(
                eq(userSessions.id, sessionId),
                eq(userSessions.userId, userId)
            ));

        await this.logActivity(userId, 'logout', 'Session terminated', { sessionId });
    }

    /**
     * Terminate all sessions except current
     */
    async terminateAllOtherSessions(userId: string, currentSessionId: string) {
        await db.update(userSessions)
            .set({ isActive: false })
            .where(and(
                eq(userSessions.userId, userId),
                eq(userSessions.isActive, true)
            ));

        // Reactivate current session
        await db.update(userSessions)
            .set({ isActive: true })
            .where(eq(userSessions.id, currentSessionId));

        await this.logActivity(userId, 'security_change', 'All other sessions terminated');

        // Send email notification
        const email = await this.getUserEmail(userId);
        if (email) {
            await emailService.sendSessionsTerminatedEmail(email, {
                timestamp: new Date()
            }).catch(err => console.error('Failed to send sessions terminated email:', err));
        }
    }

    // ============ Activity Logging ============

    /**
     * Log user activity
     */
    async logActivity(
        userId: string,
        activityType: string,
        description: string,
        metadata?: any,
        sessionId?: string,
        severity: 'info' | 'warning' | 'critical' = 'info',
        ipAddress?: string,
        userAgent?: string
    ) {
        await db.insert(userActivityLog).values({
            userId,
            activityType,
            description,
            metadata,
            sessionId,
            severity,
            ipAddress,
            userAgent
        });
    }

    /**
     * Get activity log for a user
     */
    async getActivityLog(userId: string, limit: number = 50, offset: number = 0) {
        return db.select().from(userActivityLog)
            .where(eq(userActivityLog.userId, userId))
            .orderBy(desc(userActivityLog.createdAt))
            .limit(limit)
            .offset(offset);
    }

    // ============ Trusted Devices ============

    /**
     * Add a trusted device
     */
    async addTrustedDevice(userId: string, deviceFingerprint: string, deviceInfo: any, deviceName?: string, ipAddress?: string) {
        const [device] = await db.insert(trustedDevices).values({
            userId,
            deviceFingerprint,
            deviceName,
            deviceInfo,
            ipAddress
        }).returning();

        await this.logActivity(userId, 'security_change', 'Trusted device added', { deviceName, deviceFingerprint });

        return device;
    }

    /**
     * Get trusted devices for a user
     */
    async getTrustedDevices(userId: string) {
        return db.select().from(trustedDevices)
            .where(and(
                eq(trustedDevices.userId, userId),
                eq(trustedDevices.isTrusted, true)
            ))
            .orderBy(desc(trustedDevices.lastUsedAt));
    }

    /**
     * Remove a trusted device
     */
    async removeTrustedDevice(deviceId: string, userId: string) {
        await db.update(trustedDevices)
            .set({ isTrusted: false })
            .where(and(
                eq(trustedDevices.id, deviceId),
                eq(trustedDevices.userId, userId)
            ));

        await this.logActivity(userId, 'security_change', 'Trusted device removed', { deviceId });
    }

    // ============ Security Alerts ============

    /**
     * Get or create security alerts config
     */
    async getAlertsConfig(userId: string) {
        const [config] = await db.select().from(securityAlertsConfig)
            .where(eq(securityAlertsConfig.userId, userId));

        if (!config) {
            const [newConfig] = await db.insert(securityAlertsConfig)
                .values({ userId })
                .returning();
            return newConfig;
        }

        return config;
    }

    /**
     * Update security alerts configuration
     */
    async updateAlertsConfig(userId: string, config: Partial<typeof securityAlertsConfig.$inferInsert>) {
        await db.update(securityAlertsConfig)
            .set({ ...config, updatedAt: new Date() })
            .where(eq(securityAlertsConfig.userId, userId));

        await this.logActivity(userId, 'security_change', 'Security alerts configuration updated', config);
    }

    /**
     * Create a security alert
     */
    async createAlert(userId: string, alertType: string, severity: string, title: string, message: string, metadata?: any) {
        const [alert] = await db.insert(securityAlerts).values({
            userId,
            alertType,
            severity,
            title,
            message,
            metadata
        }).returning();

        // TODO: Send notification based on user preferences

        return alert;
    }

    /**
     * Get security alerts for a user
     */
    async getAlerts(userId: string, unreadOnly: boolean = false) {
        const conditions = [eq(securityAlerts.userId, userId)];
        if (unreadOnly) {
            conditions.push(eq(securityAlerts.isRead, false));
        }

        return db.select().from(securityAlerts)
            .where(and(...conditions))
            .orderBy(desc(securityAlerts.createdAt));
    }

    /**
     * Mark alert as read
     */
    async markAlertAsRead(alertId: string, userId: string) {
        await db.update(securityAlerts)
            .set({ isRead: true })
            .where(and(
                eq(securityAlerts.id, alertId),
                eq(securityAlerts.userId, userId)
            ));
    }

    // ============ Privacy Settings ============

    /**
     * Get or create privacy settings
     */
    async getPrivacySettings(userId: string) {
        const [settings] = await db.select().from(privacySettings)
            .where(eq(privacySettings.userId, userId));

        if (!settings) {
            const [newSettings] = await db.insert(privacySettings)
                .values({ userId })
                .returning();
            return newSettings;
        }

        return settings;
    }

    /**
     * Update privacy settings
     */
    async updatePrivacySettings(userId: string, settings: Partial<typeof privacySettings.$inferInsert>) {
        await db.update(privacySettings)
            .set({ ...settings, updatedAt: new Date() })
            .where(eq(privacySettings.userId, userId));

        await this.logActivity(userId, 'privacy_change', 'Privacy settings updated', settings);
    }

    // ============ Helper Methods ============

    private generateBackupCodes(count: number = 10): string[] {
        const codes: string[] = [];
        for (let i = 0; i < count; i++) {
            codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
        }
        return codes;
    }

    private encrypt(text: string): string {
        // TODO: Implement proper encryption using a secret key from environment
        // For now, this is a placeholder
        const algorithm = 'aes-256-cbc';
        const key = process.env.ENCRYPTION_KEY || 'default-key-change-in-production-32b';
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv);
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return iv.toString('hex') + ':' + encrypted.toString('hex');
    }

    private decrypt(text: string): string {
        // TODO: Implement proper decryption
        const algorithm = 'aes-256-cbc';
        const key = process.env.ENCRYPTION_KEY || 'default-key-change-in-production-32b';
        const parts = text.split(':');
        const iv = Buffer.from(parts.shift()!, 'hex');
        const encryptedText = Buffer.from(parts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    }
}

export const securityService = new SecurityService();
