import { Router, Request, Response } from 'express';
import { securityService } from '../services/securityService';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Log all requests to security routes
router.use((req, res, next) => {
    console.log('[Security Routes]', {
        method: req.method,
        path: req.path,
        url: req.url,
        originalUrl: req.originalUrl,
        hasUser: !!req.user,
        headers: {
            'content-type': req.headers['content-type'],
            'authorization': req.headers['authorization'] ? 'Bearer ***' : undefined
        }
    });
    next();
});

// All routes require authentication
router.use(authenticateToken);

// ============ 2FA Routes ============

/**
 * Setup TOTP 2FA
 * POST /api/security/2fa/setup
 */
router.post('/2fa/setup', async (req: Request, res: Response) => {
    console.log('[Security] POST /2fa/setup called');
    try {
        const userId = req.user?.id;
        if (!userId) {
            console.log('[Security] No userId in request');
            return res.status(401).json({ error: 'Unauthorized' });
        }

        console.log('[Security] Setting up TOTP for user:', userId);
        const result = await securityService.setupTOTP(userId);
        res.json(result);
    } catch (error) {
        console.error('[Security] Error setting up 2FA:', error);
        res.status(500).json({ error: 'Failed to setup 2FA' });
    }
});

/**
 * Verify and enable TOTP 2FA
 * POST /api/security/2fa/verify
 */
router.post('/2fa/verify', async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const { token } = req.body;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }

        const result = await securityService.verifyAndEnableTOTP(userId, token);
        res.json(result);
    } catch (error: any) {
        console.error('Error verifying 2FA:', error);
        res.status(400).json({ error: error.message || 'Invalid verification code' });
    }
});

/**
 * Disable 2FA
 * DELETE /api/security/2fa
 */
router.delete('/2fa', async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        await securityService.disable2FA(userId);
        res.json({ success: true });
    } catch (error) {
        console.error('Error disabling 2FA:', error);
        res.status(500).json({ error: 'Failed to disable 2FA' });
    }
});

/**
 * Setup Email-based 2FA
 * POST /api/security/2fa/email/setup
 */
router.post('/2fa/email/setup', async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const result = await securityService.setupEmailTOTP(userId);
        res.json(result);
    } catch (error: any) {
        console.error('Error setting up email 2FA:', error);
        res.status(400).json({ error: error.message || 'Failed to setup email 2FA' });
    }
});

/**
 * Verify and enable Email 2FA
 * POST /api/security/2fa/email/verify
 */
router.post('/2fa/email/verify', async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const { code } = req.body;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!code) {
            return res.status(400).json({ error: 'Verification code is required' });
        }

        const result = await securityService.verifyAndEnableEmailTOTP(userId, code);
        res.json(result);
    } catch (error: any) {
        console.error('Error verifying email 2FA:', error);
        res.status(400).json({ error: error.message || 'Invalid verification code' });
    }
});

/**
 * Resend email verification code
 * POST /api/security/2fa/email/resend
 */
router.post('/2fa/email/resend', async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        await securityService.sendEmailVerificationCode(userId);
        res.json({ success: true, message: 'Verification code sent' });
    } catch (error: any) {
        console.error('Error resending verification code:', error);
        res.status(500).json({ error: error.message || 'Failed to send verification code' });
    }
});

// ============ Session Management Routes ============

/**
 * Get all active sessions
 * GET /api/security/sessions
 */
router.get('/sessions', async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const sessions = await securityService.getUserSessions(userId);
        res.json(sessions);
    } catch (error) {
        console.error('Error fetching sessions:', error);
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
});

/**
 * Terminate a specific session
 * DELETE /api/security/sessions/:sessionId
 */
router.delete('/sessions/:sessionId', async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const { sessionId } = req.params;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        await securityService.terminateSession(sessionId, userId);
        res.json({ success: true });
    } catch (error) {
        console.error('Error terminating session:', error);
        res.status(500).json({ error: 'Failed to terminate session' });
    }
});

/**
 * Terminate all other sessions
 * POST /api/security/sessions/terminate-others
 */
router.post('/sessions/terminate-others', async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const currentSessionId = req.session?.id; // Assuming session ID is available

        if (!userId || !currentSessionId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        await securityService.terminateAllOtherSessions(userId, currentSessionId);
        res.json({ success: true });
    } catch (error) {
        console.error('Error terminating sessions:', error);
        res.status(500).json({ error: 'Failed to terminate sessions' });
    }
});

// ============ Activity Log Routes ============

/**
 * Get activity log
 * GET /api/security/activity-log
 */
router.get('/activity-log', async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const activities = await securityService.getActivityLog(userId, limit, offset);
        res.json(activities);
    } catch (error) {
        console.error('Error fetching activity log:', error);
        res.status(500).json({ error: 'Failed to fetch activity log' });
    }
});

// ============ Trusted Devices Routes ============

/**
 * Get trusted devices
 * GET /api/security/trusted-devices
 */
router.get('/trusted-devices', async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const devices = await securityService.getTrustedDevices(userId);
        res.json(devices);
    } catch (error) {
        console.error('Error fetching trusted devices:', error);
        res.status(500).json({ error: 'Failed to fetch trusted devices' });
    }
});

/**
 * Add a trusted device
 * POST /api/security/trusted-devices
 */
router.post('/trusted-devices', async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const { deviceFingerprint, deviceInfo, deviceName } = req.body;
        const ipAddress = req.ip;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!deviceFingerprint || !deviceInfo) {
            return res.status(400).json({ error: 'Device fingerprint and info are required' });
        }

        const device = await securityService.addTrustedDevice(
            userId,
            deviceFingerprint,
            deviceInfo,
            deviceName,
            ipAddress
        );

        res.json(device);
    } catch (error) {
        console.error('Error adding trusted device:', error);
        res.status(500).json({ error: 'Failed to add trusted device' });
    }
});

/**
 * Remove a trusted device
 * DELETE /api/security/trusted-devices/:deviceId
 */
router.delete('/trusted-devices/:deviceId', async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const { deviceId } = req.params;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        await securityService.removeTrustedDevice(deviceId, userId);
        res.json({ success: true });
    } catch (error) {
        console.error('Error removing trusted device:', error);
        res.status(500).json({ error: 'Failed to remove trusted device' });
    }
});

// ============ Security Alerts Routes ============

/**
 * Get security alerts configuration
 * GET /api/security/alerts/config
 */
router.get('/alerts/config', async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const config = await securityService.getAlertsConfig(userId);
        res.json(config);
    } catch (error) {
        console.error('Error fetching alerts config:', error);
        res.status(500).json({ error: 'Failed to fetch alerts configuration' });
    }
});

/**
 * Update security alerts configuration
 * PUT /api/security/alerts/config
 */
router.put('/alerts/config', async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        await securityService.updateAlertsConfig(userId, req.body);
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating alerts config:', error);
        res.status(500).json({ error: 'Failed to update alerts configuration' });
    }
});

/**
 * Get security alerts
 * GET /api/security/alerts
 */
router.get('/alerts', async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const unreadOnly = req.query.unreadOnly === 'true';

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const alerts = await securityService.getAlerts(userId, unreadOnly);
        res.json(alerts);
    } catch (error) {
        console.error('Error fetching alerts:', error);
        res.status(500).json({ error: 'Failed to fetch alerts' });
    }
});

/**
 * Mark alert as read
 * PUT /api/security/alerts/:alertId/read
 */
router.put('/alerts/:alertId/read', async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const { alertId } = req.params;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        await securityService.markAlertAsRead(alertId, userId);
        res.json({ success: true });
    } catch (error) {
        console.error('Error marking alert as read:', error);
        res.status(500).json({ error: 'Failed to mark alert as read' });
    }
});

// ============ Privacy Settings Routes ============

/**
 * Get privacy settings
 * GET /api/security/privacy
 */
router.get('/privacy', async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const settings = await securityService.getPrivacySettings(userId);
        res.json(settings);
    } catch (error) {
        console.error('Error fetching privacy settings:', error);
        res.status(500).json({ error: 'Failed to fetch privacy settings' });
    }
});

/**
 * Update privacy settings
 * PUT /api/security/privacy
 */
router.put('/privacy', async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        await securityService.updatePrivacySettings(userId, req.body);
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating privacy settings:', error);
        res.status(500).json({ error: 'Failed to update privacy settings' });
    }
});

export default router;
