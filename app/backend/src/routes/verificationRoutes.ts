import express from 'express';
import { safeLogger } from '../utils/safeLogger';
import { csrfProtection } from '../middleware/csrfProtection';
import { verificationService } from '../services/verificationService';
import rateLimit from 'express-rate-limit';

// Rate limiting for verification endpoints
const verificationRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  message: {
    success: false,
    error: {
      code: 'VERIFICATION_RATE_LIMIT_EXCEEDED',
      message: 'Too many verification requests, please try again later',
    }
  }
});

const router = express.Router();

/**
 * Send email verification code
 * POST /api/verification/email
 */
router.post('/email', verificationRateLimit, csrfProtection,  async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email address is required'
      });
    }

    const result = await verificationService.sendEmailVerification(email);

    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message,
        errorCode: result.error
      });
    }
  } catch (error) {
    safeLogger.error('Email verification request failed:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Verify email with code
 * POST /api/verification/email/verify
 */
router.post('/email/verify', verificationRateLimit, csrfProtection,  async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        error: 'Email and verification code are required'
      });
    }

    const result = await verificationService.verifyEmail(email, code);

    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message,
        errorCode: result.error
      });
    }
  } catch (error) {
    safeLogger.error('Email verification failed:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Send phone verification code
 * POST /api/verification/phone
 */
router.post('/phone', verificationRateLimit, csrfProtection,  async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }

    const result = await verificationService.sendPhoneVerification(phone);

    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message,
        errorCode: result.error
      });
    }
  } catch (error) {
    safeLogger.error('Phone verification request failed:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Verify phone with code
 * POST /api/verification/phone/verify
 */
router.post('/phone/verify', verificationRateLimit, csrfProtection,  async (req, res) => {
  try {
    const { phone, code } = req.body;

    if (!phone || !code) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and verification code are required'
      });
    }

    const result = await verificationService.verifyPhone(phone, code);

    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message,
        errorCode: result.error
      });
    }
  } catch (error) {
    safeLogger.error('Phone verification failed:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Get verification service status
 * GET /api/verification/status
 */
router.get('/status', verificationRateLimit, (req, res) => {
  try {
    const status = verificationService.getServiceStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    safeLogger.error('Failed to get verification status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Test email service (development only)
 * GET /api/verification/test-email
 */
router.get('/test-email', verificationRateLimit, async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      error: 'Test endpoints not available in production'
    });
  }

  try {
    const isWorking = await verificationService.testEmailService();
    res.json({
      success: true,
      emailServiceWorking: isWorking
    });
  } catch (error) {
    safeLogger.error('Email service test failed:', error);
    res.status(500).json({
      success: false,
      error: 'Email service test failed'
    });
  }
});

export default router;
