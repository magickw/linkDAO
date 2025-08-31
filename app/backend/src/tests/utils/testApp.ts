/**
 * Test Application Factory
 * Creates configured Express app instances for testing
 */

import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { TestDatabase } from './testDatabase';
import { MockAIServices } from './mockAIServices';

interface TestAppConfig {
  database?: any;
  aiServices?: any;
  enablePerformanceMode?: boolean;
  enableSecurityMode?: boolean;
  enableABTesting?: boolean;
}

export function createTestApp(config: TestAppConfig = {}): Express {
  const app = express();

  // Basic middleware
  app.use(helmet());
  app.use(cors());
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true }));

  // Test-specific middleware
  if (config.enablePerformanceMode) {
    app.use((req, res, next) => {
      req.startTime = Date.now();
      next();
    });
  }

  if (config.enableSecurityMode) {
    app.use((req, res, next) => {
      req.securityMode = true;
      next();
    });
  }

  if (config.enableABTesting) {
    app.use((req, res, next) => {
      req.abTestVariant = req.body.abTestVariant || req.headers['x-ab-variant'];
      next();
    });
  }

  // Mock database connection
  if (config.database) {
    app.locals.db = config.database;
  }

  // Mock AI services
  if (config.aiServices) {
    app.locals.aiServices = config.aiServices;
  }

  // Content moderation routes
  app.post('/api/content', async (req, res) => {
    try {
      const { type, content, userId, media } = req.body;
      const contentId = `content-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Simulate moderation process
      const moderationResult = await simulateModeration(req, {
        contentId,
        type,
        content,
        userId,
        media
      });

      res.json({
        contentId,
        status: moderationResult.status,
        confidence: moderationResult.confidence,
        processingTime: req.startTime ? Date.now() - req.startTime : undefined
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/content/:contentId', async (req, res) => {
    try {
      const { contentId } = req.params;
      const content = await getStoredContent(req, contentId);
      res.json(content);
    } catch (error) {
      res.status(404).json({ error: 'Content not found' });
    }
  });

  app.get('/api/moderation/:contentId', async (req, res) => {
    try {
      const { contentId } = req.params;
      const moderationCase = await getModerationCase(req, contentId);
      res.json({
        status: moderationCase.status,
        label: moderationCase.label,
        canAppeal: moderationCase.canAppeal
      });
    } catch (error) {
      res.status(404).json({ error: 'Moderation case not found' });
    }
  });

  // Community reporting routes
  app.post('/api/reports', async (req, res) => {
    try {
      const { contentId, reason, details, reporterId } = req.body;
      const reportId = await submitReport(req, { contentId, reason, details, reporterId });
      res.json({ reportId });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Appeals routes
  app.post('/api/appeals', async (req, res) => {
    try {
      const { contentId, stakeAmount, reasoning } = req.body;
      const appealId = await submitAppeal(req, { contentId, stakeAmount, reasoning });
      res.json({ appealId });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Internal moderation routes
  app.post('/api/_internal/moderation/decision', async (req, res) => {
    try {
      const { caseId, decision, reasoning, moderatorId } = req.body;
      await processModerationDecision(req, { caseId, decision, reasoning, moderatorId });
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/_internal/moderation/audit/:contentId', async (req, res) => {
    try {
      const { contentId } = req.params;
      const auditLog = await getAuditLog(req, contentId);
      res.json({ auditLog });
    } catch (error) {
      res.status(404).json({ error: 'Audit log not found' });
    }
  });

  // Marketplace routes
  app.post('/api/marketplace/listings', async (req, res) => {
    try {
      const listing = req.body;
      const listingId = `listing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const moderationResult = await simulateMarketplaceModeration(req, {
        ...listing,
        listingId
      });

      res.json({
        listingId,
        status: moderationResult.status,
        processingTime: req.startTime ? Date.now() - req.startTime : undefined
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // User management routes
  app.post('/api/user/privacy-settings', async (req, res) => {
    try {
      const { userId, dmScanningConsent } = req.body;
      await updatePrivacySettings(req, { userId, dmScanningConsent });
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/user/feedback/:contentId', async (req, res) => {
    try {
      const { contentId } = req.params;
      const feedback = await getUserFeedback(req, contentId);
      res.json(feedback);
    } catch (error) {
      res.status(404).json({ error: 'Feedback not found' });
    }
  });

  // Maintenance routes
  app.post('/api/_internal/maintenance/cleanup-expired', async (req, res) => {
    try {
      await cleanupExpiredData(req);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/_internal/gdpr/delete-user-data', async (req, res) => {
    try {
      const { userId, requestType } = req.body;
      await deleteUserData(req, { userId, requestType });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Error handling
  app.use((error, req, res, next) => {
    console.error('Test app error:', error);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

// Helper functions for simulating backend operations
async function simulateModeration(req: any, content: any) {
  const aiServices = req.app.locals.aiServices;
  if (!aiServices) {
    throw new Error('AI services not configured');
  }

  // Get AI response
  const aiResponse = await aiServices.moderateContent(content);
  
  // Apply A/B test variant if present
  if (req.abTestVariant) {
    aiResponse.threshold = getVariantThreshold(req.abTestVariant);
  }

  // Determine final status
  let status = 'approved';
  if (aiResponse.confidence >= 0.95 && aiResponse.action === 'block') {
    status = 'rejected';
  } else if (aiResponse.confidence >= 0.7 && aiResponse.action === 'review') {
    status = 'pending';
  }

  // Store in test database
  const db = req.app.locals.db;
  if (db) {
    await db.storeModerationCase({
      contentId: content.contentId,
      status,
      confidence: aiResponse.confidence,
      vendorScores: aiResponse.vendorScores,
      reasonCode: aiResponse.categories.join(',')
    });
  }

  return {
    status,
    confidence: aiResponse.confidence
  };
}

async function simulateMarketplaceModeration(req: any, listing: any) {
  const aiServices = req.app.locals.aiServices;
  if (!aiServices) {
    throw new Error('AI services not configured');
  }

  const aiResponse = await aiServices.moderateMarketplaceListing(listing);
  
  let status = 'approved';
  if (aiResponse.confidence >= 0.9 && aiResponse.action === 'block') {
    status = 'rejected';
  } else if (aiResponse.confidence >= 0.7) {
    status = 'pending';
  }

  return { status };
}

function getVariantThreshold(variant: string): number {
  const thresholds = {
    'conservative': 0.95,
    'moderate': 0.85,
    'aggressive': 0.75,
    'control': 0.9,
    'treatment': 0.8
  };
  return thresholds[variant] || 0.85;
}

// Placeholder implementations for other helper functions
async function getStoredContent(req: any, contentId: string) {
  const db = req.app.locals.db;
  return db ? await db.getStoredContent(contentId) : { content: 'Mock content' };
}

async function getModerationCase(req: any, contentId: string) {
  const db = req.app.locals.db;
  return db ? await db.getModerationCase(contentId) : { status: 'allowed', canAppeal: false };
}

async function submitReport(req: any, report: any) {
  const db = req.app.locals.db;
  return db ? await db.submitReport(report) : `report-${Date.now()}`;
}

async function submitAppeal(req: any, appeal: any) {
  const db = req.app.locals.db;
  return db ? await db.submitAppeal(appeal) : `appeal-${Date.now()}`;
}

async function processModerationDecision(req: any, decision: any) {
  const db = req.app.locals.db;
  if (db) {
    await db.processModerationDecision(decision);
  }
}

async function getAuditLog(req: any, contentId: string) {
  const db = req.app.locals.db;
  return db ? await db.getAuditLog(contentId) : { events: [] };
}

async function updatePrivacySettings(req: any, settings: any) {
  const db = req.app.locals.db;
  if (db) {
    await db.updatePrivacySettings(settings);
  }
}

async function getUserFeedback(req: any, contentId: string) {
  return {
    feedbackProvided: true,
    satisfactionScore: Math.random() * 5,
    understandsDecision: Math.random() > 0.3
  };
}

async function cleanupExpiredData(req: any) {
  const db = req.app.locals.db;
  if (db) {
    await db.cleanupExpiredData();
  }
}

async function deleteUserData(req: any, request: any) {
  const db = req.app.locals.db;
  if (db) {
    await db.deleteUserData(request);
  }
}