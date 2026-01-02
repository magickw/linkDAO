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
import { emailAnalytics } from '../db/schema/emailAnalyticsSchema';
import { users } from '../db/schema';
import { eq, and, desc, gte, count, sql } from 'drizzle-orm';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import { emailService } from './emailService';
import { generateTrackingId, generateUnsubscribeToken } from '../routes/email';

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

    /**
     * Check if email should be sent based on user preferences
     */
    private async shouldSendEmail(userId: string, emailType: string): Promise<boolean> {
        const config = await this.getAlertsConfig(userId);

        // Critical emails always send (unless user explicitly unsubscribed)
        const criticalEmails = ['new_device_login', '2fa_disabled', 'suspicious_activity'];
        if (criticalEmails.includes(emailType)) {
            // Even critical emails respect complete unsubscribe
            return !config.unsubscribedAt;
        }

        // Check if email notifications are enabled
        if (!config.emailNotificationsEnabled) return false;

        // Check if user unsubscribed
        if (config.unsubscribedAt) return false;

        // Check email frequency
        if (config.emailFrequency === 'off') return false;

        // For now, only support immediate delivery
        // TODO: Implement digest functionality for hourly/daily/weekly
        if (config.emailFrequency !== 'immediate') {
            // Queue for digest delivery
            return false;
        }

        return true;
    }

    /**
     * Track email sent for analytics
     */
    private async trackEmailSent(
        userId: string,
        emailType: string,
        emailSubject: string,
        metadata?: any
    ): Promise<string> {
        const trackingId = generateTrackingId();

        await db.insert(emailAnalytics).values({
            userId,
            emailType,
            emailSubject,
            trackingId,
            metadata
        });

        return trackingId;
    }

    /**
     * Ensure unsubscribe token exists for user
     */
    private async ensureUnsubscribeToken(userId: string): Promise<string> {
        const config = await this.getAlertsConfig(userId);

        if (config.unsubscribeToken) {
            return config.unsubscribeToken;
        }

        const token = generateUnsubscribeToken(userId);
        await db.update(securityAlertsConfig)
            .set({ unsubscribeToken: token })
            .where(eq(securityAlertsConfig.userId, userId));

        return token;
    }

    /**
     * Detect suspicious activity patterns
     */
    async detectSuspiciousActivity(userId: string): Promise<void> {
        const now = new Date();
        const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

        // Check for multiple failed login attempts
        const [failedLogins] = await db
            .select({ count: count() })
            .from(userActivityLog)
            .where(and(
                eq(userActivityLog.userId, userId),
                eq(userActivityLog.activityType, 'failed_login'),
                gte(userActivityLog.createdAt, tenMinutesAgo)
            ));

        if (failedLogins.count >= 3) {
            await this.createAlert(
                userId,
                'suspicious_activity',
                'high',
                'Multiple Failed Login Attempts',
                `${failedLogins.count} failed login attempts detected in the last 10 minutes`,
                { failedAttempts: failedLogins.count }
            );

            // Send email if preferences allow
            if (await this.shouldSendEmail(userId, 'suspicious_activity')) {
                const email = await this.getUserEmail(userId);
                if (email) {
                    await emailService.sendSuspiciousActivityEmail(email, {
                        activityType: 'Multiple Failed Logins',
                        description: `${failedLogins.count} failed login attempts in 10 minutes`,
                        timestamp: now
                    }).catch(err => console.error('Failed to send suspicious activity email:', err));
                }
            }
        }

        // Check for rapid session creation
        const [rapidSessions] = await db
            .select({ count: count() })
            .from(userSessions)
            .where(and(
                eq(userSessions.userId, userId),
                gte(userSessions.createdAt, oneHourAgo)
            ));

        if (rapidSessions.count >= 5) {
            await this.createAlert(
                userId,
                'suspicious_activity',
                'medium',
                'Unusual Session Activity',
                `${rapidSessions.count} new sessions created in the last hour`,
                { sessionCount: rapidSessions.count }
            );
        }
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

        // Check if TOTP 2FA already exists for this user
        const existingAuth = await db.select().from(twoFactorAuth)
            .where(and(
                eq(twoFactorAuth.userId, userId),
                eq(twoFactorAuth.method, 'totp')
            ));

        if (existingAuth.length > 0) {
            // Delete existing TOTP setup if it exists
            await db.delete(twoFactorAuth)
                .where(eq(twoFactorAuth.id, existingAuth[0].id));
        }

        // Insert new 2FA record
        await db.insert(twoFactorAuth).values({
            userId,
            method: 'totp',
            secret: this.encrypt(secret.base32),
            backupCodes: backupCodes.map(code => this.encrypt(code)),
            isEnabled: false
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

        // Send email notification if preferences allow
        if (await this.shouldSendEmail(userId, '2fa_enabled')) {
            const email = await this.getUserEmail(userId);
            if (email) {
                const trackingId = await this.trackEmailSent(userId, '2fa_enabled', 'Two-Factor Authentication Enabled');
                await emailService.send2FAChangeEmail(email, {
                    action: 'enabled',
                    timestamp: new Date()
                }).catch(err => console.error('Failed to send 2FA email:', err));
            }
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

        // Send email notification (critical - always send unless unsubscribed)
        if (await this.shouldSendEmail(userId, '2fa_disabled')) {
            const email = await this.getUserEmail(userId);
            if (email) {
                const trackingId = await this.trackEmailSent(userId, '2fa_disabled', 'Two-Factor Authentication Disabled');
                await emailService.send2FAChangeEmail(email, {
                    action: 'disabled',
                    timestamp: new Date()
                }).catch(err => console.error('Failed to send 2FA email:', err));
            }
        }
    }

    // ============ Email-based 2FA Methods ============

    /**
     * Setup Email-based 2FA
     */
    async setupEmailTOTP(userId: string) {
        const email = await this.getUserEmail(userId);
        if (!email) {
            throw new Error('User email not found. Please add an email to your account first.');
        }

        // Generate backup codes
        const backupCodes = this.generateBackupCodes();

        // Check if Email 2FA already exists for this user
        const existingAuth = await db.select().from(twoFactorAuth)
            .where(and(
                eq(twoFactorAuth.userId, userId),
                eq(twoFactorAuth.method, 'email')
            ));

        if (existingAuth.length > 0) {
            // Delete existing Email 2FA setup if it exists
            await db.delete(twoFactorAuth)
                .where(eq(twoFactorAuth.id, existingAuth[0].id));
        }

        // Insert new 2FA record
        await db.insert(twoFactorAuth).values({
            userId,
            method: 'email',
            secret: null, // Email-based doesn't need a secret
            backupCodes: backupCodes.map(code => this.encrypt(code)),
            isEnabled: false
        });

        // Send test verification code
        const verificationCode = this.generateEmailVerificationCode();
        await this.storeEmailVerificationCode(userId, verificationCode);

        // Send email with code
        if (await this.shouldSendEmail(userId, '2fa_setup')) {
            await emailService.send2FAVerificationEmail(email, {
                code: verificationCode,
                expiresIn: 10 // minutes
            }).catch(err => console.error('Failed to send 2FA setup email:', err));
        }

        return {
            email: this.maskEmail(email),
            backupCodes,
            message: 'Verification code sent to your email'
        };
    }

    /**
     * Verify email code and enable Email 2FA
     */
    async verifyAndEnableEmailTOTP(userId: string, code: string) {
        // Verify the code
        const isValid = await this.verifyEmailVerificationCode(userId, code);
        if (!isValid) {
            throw new Error('Invalid or expired verification code');
        }

        // Get the 2FA record
        const [auth] = await db.select().from(twoFactorAuth)
            .where(and(
                eq(twoFactorAuth.userId, userId),
                eq(twoFactorAuth.method, 'email')
            ));

        if (!auth) {
            throw new Error('Email 2FA not set up');
        }

        // Enable 2FA
        await db.update(twoFactorAuth)
            .set({ isEnabled: true, verifiedAt: new Date() })
            .where(eq(twoFactorAuth.id, auth.id));

        // Clear verification code
        await this.clearEmailVerificationCode(userId);

        // Log activity
        await this.logActivity(userId, 'security_change', '2FA enabled', { method: 'email' });

        // Send confirmation email
        const email = await this.getUserEmail(userId);
        if (email && await this.shouldSendEmail(userId, '2fa_enabled')) {
            const trackingId = await this.trackEmailSent(userId, '2fa_enabled', 'Email Two-Factor Authentication Enabled');
            await emailService.send2FAChangeEmail(email, {
                action: 'enabled',
                timestamp: new Date()
            }).catch(err => console.error('Failed to send 2FA email:', err));
        }

        return { success: true };
    }

    /**
     * Send email verification code for login
     */
    async sendEmailVerificationCode(userId: string): Promise<void> {
        const email = await this.getUserEmail(userId);
        if (!email) {
            throw new Error('User email not found');
        }

        const verificationCode = this.generateEmailVerificationCode();
        await this.storeEmailVerificationCode(userId, verificationCode);

        // Send email with code
        await emailService.send2FAVerificationEmail(email, {
            code: verificationCode,
            expiresIn: 10 // minutes
        });
    }

    /**
     * Verify email code for authentication
     */
    async verifyEmailTOTP(userId: string, code: string): Promise<boolean> {
        const [auth] = await db.select().from(twoFactorAuth)
            .where(and(
                eq(twoFactorAuth.userId, userId),
                eq(twoFactorAuth.method, 'email'),
                eq(twoFactorAuth.isEnabled, true)
            ));

        if (!auth) {
            return false;
        }

        return await this.verifyEmailVerificationCode(userId, code);
    }

    // ============ Email Verification Code Helpers ============

    /**
     * Generate a 6-digit verification code
     */
    private generateEmailVerificationCode(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    /**
     * Store verification code in cache/database (expires in 10 minutes)
     */
    private async storeEmailVerificationCode(userId: string, code: string): Promise<void> {
        // Store in user_activity_log as a temporary solution
        // TODO: Use Redis or a dedicated verification_codes table for better performance
        const encryptedCode = this.encrypt(code);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await db.insert(userActivityLog).values({
            userId,
            activityType: 'email_verification_code',
            description: 'Email verification code generated',
            metadata: {
                code: encryptedCode,
                expiresAt: expiresAt.toISOString()
            },
            severity: 'info'
        });
    }

    /**
     * Verify email verification code
     */
    private async verifyEmailVerificationCode(userId: string, code: string): Promise<boolean> {
        // Get the most recent verification code
        const [record] = await db.select().from(userActivityLog)
            .where(and(
                eq(userActivityLog.userId, userId),
                eq(userActivityLog.activityType, 'email_verification_code')
            ))
            .orderBy(desc(userActivityLog.createdAt))
            .limit(1);

        if (!record || !record.metadata) {
            return false;
        }

        const metadata = record.metadata as any;
        const expiresAt = new Date(metadata.expiresAt);

        // Check if expired
        if (expiresAt < new Date()) {
            return false;
        }

        // Decrypt and compare
        const storedCode = this.decrypt(metadata.code);
        return storedCode === code;
    }

    /**
     * Clear email verification code
     */
    private async clearEmailVerificationCode(userId: string): Promise<void> {
        // Delete all verification codes for this user
        await db.delete(userActivityLog)
            .where(and(
                eq(userActivityLog.userId, userId),
                eq(userActivityLog.activityType, 'email_verification_code')
            ));
    }

    /**
     * Mask email for privacy (show first 2 chars and domain)
     */
    private maskEmail(email: string): string {
        const [local, domain] = email.split('@');
        if (local.length <= 2) {
            return `${local[0]}***@${domain}`;
        }
        return `${local.substring(0, 2)}***@${domain}`;
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

        // Send new device login email (critical - always send unless unsubscribed)
        if (await this.shouldSendEmail(userId, 'new_device_login')) {
            const email = await this.getUserEmail(userId);
            if (email) {
                const trackingId = await this.trackEmailSent(userId, 'new_device_login', 'New Device Login Detected');
                await emailService.sendNewDeviceLoginEmail(email, {
                    device: deviceInfo?.device || 'Unknown Device',
                    browser: deviceInfo?.browser,
                    os: deviceInfo?.os,
                    ipAddress,
                    timestamp: new Date(),
                    sessionId: session.id
                }).catch(err => console.error('Failed to send new device email:', err));
            }
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

        // Send email notification if preferences allow
        if (await this.shouldSendEmail(userId, 'sessions_terminated')) {
            const email = await this.getUserEmail(userId);
            if (email) {
                const trackingId = await this.trackEmailSent(userId, 'sessions_terminated', 'All Sessions Terminated');
                await emailService.sendSessionsTerminatedEmail(email, {
                    timestamp: new Date()
                }).catch(err => console.error('Failed to send sessions terminated email:', err));
            }
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
