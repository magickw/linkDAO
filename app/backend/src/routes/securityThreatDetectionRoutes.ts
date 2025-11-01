/**
 * Security Threat Detection Routes
 * 
 * API endpoints for threat detection, behavioral analysis,
 * and automated response management.
 */

import { Router } from 'express';
import { safeLogger } from '../utils/safeLogger';
import { csrfProtection } from '../middleware/csrfProtection';
import { AuthenticatedRequest } from '../middleware/auth';
import { securityThreatDetectionService } from '../services/securityThreatDetectionService';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware';

const router = Router();

/**
 * Get threat detection dashboard
 */
router.get('/dashboard', adminAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      timeRange = '24h',
      includePatterns = true,
      includeBehavioral = true,
    } = req.query;

    // Get recent threat detections
    const recentDetections = securityThreatDetectionService.getThreatDetections(50);

    // Calculate dashboard metrics
    const now = Date.now();
    let timeWindow: number;
    
    switch (timeRange) {
      case '1h':
        timeWindow = 60 * 60 * 1000;
        break;
      case '24h':
        timeWindow = 24 * 60 * 60 * 1000;
        break;
      case '7d':
        timeWindow = 7 * 24 * 60 * 60 * 1000;
        break;
      default:
        timeWindow = 24 * 60 * 60 * 1000;
    }

    const recentThreats = recentDetections.filter(
      d => now - d.timestamp.getTime() < timeWindow
    );

    const dashboard = {
      overview: {
        totalThreats: recentThreats.length,
        criticalThreats: recentThreats.filter(d => d.severity === 'critical').length,
        highThreats: recentThreats.filter(d => d.severity === 'high').length,
        averageRiskScore: recentThreats.length > 0 
          ? recentThreats.reduce((sum, d) => sum + d.riskScore, 0) / recentThreats.length
          : 0,
        activeInvestigations: recentThreats.filter(d => d.status === 'investigating').length,
        mitigatedThreats: recentThreats.filter(d => d.status === 'mitigated').length,
      },
      recentDetections: recentDetections.slice(0, 10),
      threatsByType: recentThreats.reduce((acc, threat) => {
        acc[threat.patternName] = (acc[threat.patternName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      threatsBySeverity: recentThreats.reduce((acc, threat) => {
        acc[threat.severity] = (acc[threat.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      timeSeriesData: generateTimeSeriesData(recentThreats),
    };

    res.json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    safeLogger.error('Error getting threat detection dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get threat detection dashboard',
    });
  }
});

/**
 * Get threat detections with filtering
 */
router.get('/detections', adminAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      limit = 100,
      severity,
      status,
      patternId,
      startDate,
      endDate,
    } = req.query;

    let detections = securityThreatDetectionService.getThreatDetections(parseInt(limit as string) * 2);

    // Apply filters
    if (severity) {
      detections = detections.filter(d => d.severity === severity);
    }
    if (status) {
      detections = detections.filter(d => d.status === status);
    }
    if (patternId) {
      detections = detections.filter(d => d.patternId === patternId);
    }
    if (startDate) {
      const start = new Date(startDate as string);
      detections = detections.filter(d => d.timestamp >= start);
    }
    if (endDate) {
      const end = new Date(endDate as string);
      detections = detections.filter(d => d.timestamp <= end);
    }

    // Limit results
    const limitedDetections = detections.slice(0, parseInt(limit as string));

    res.json({
      success: true,
      data: {
        detections: limitedDetections,
        total: detections.length,
        hasMore: detections.length > parseInt(limit as string),
      },
    });
  } catch (error) {
    safeLogger.error('Error getting threat detections:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get threat detections',
    });
  }
});

/**
 * Get specific threat detection
 */
router.get('/detections/:detectionId', adminAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { detectionId } = req.params;

    const detections = securityThreatDetectionService.getThreatDetections(1000);
    const detection = detections.find(d => d.id === detectionId);

    if (!detection) {
      return res.status(404).json({
        success: false,
        error: 'Threat detection not found',
      });
    }

    res.json({
      success: true,
      data: detection,
    });
  } catch (error) {
    safeLogger.error('Error getting threat detection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get threat detection',
    });
  }
});

/**
 * Update threat detection status
 */
router.patch('/detections/:detectionId/status', csrfProtection,  adminAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { detectionId } = req.params;
    const { status, notes, assignedTo } = req.body;

    if (!['detected', 'investigating', 'mitigated', 'false_positive'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be one of: detected, investigating, mitigated, false_positive',
      });
    }

    securityThreatDetectionService.updateDetectionStatus(detectionId, status, notes);

    // If assigning to someone, update that too
    const detections = securityThreatDetectionService.getThreatDetections(1000);
    const detection = detections.find(d => d.id === detectionId);
    if (detection && assignedTo) {
      detection.assignedTo = assignedTo;
    }

    res.json({
      success: true,
      message: 'Threat detection status updated successfully',
    });
  } catch (error) {
    safeLogger.error('Error updating threat detection status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update threat detection status',
    });
  }
});

/**
 * Get threat patterns
 */
router.get('/patterns', adminAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    // This would need to be implemented in the service
    // For now, return a placeholder response
    const patterns = [
      {
        id: 'brute_force',
        name: 'Brute Force Attack',
        description: 'Multiple failed authentication attempts from same source',
        severity: 'high',
        enabled: true,
        triggerCount: 15,
        lastTriggered: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
      {
        id: 'credential_stuffing',
        name: 'Credential Stuffing',
        description: 'Automated login attempts with stolen credentials',
        severity: 'high',
        enabled: true,
        triggerCount: 8,
        lastTriggered: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      },
      {
        id: 'privilege_escalation',
        name: 'Privilege Escalation',
        description: 'Unauthorized attempts to gain elevated privileges',
        severity: 'critical',
        enabled: true,
        triggerCount: 3,
        lastTriggered: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
      },
    ];

    res.json({
      success: true,
      data: patterns,
    });
  } catch (error) {
    safeLogger.error('Error getting threat patterns:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get threat patterns',
    });
  }
});

/**
 * Update threat pattern
 */
router.patch('/patterns/:patternId', csrfProtection,  adminAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { patternId } = req.params;
    const updates = req.body;

    const pattern = securityThreatDetectionService.getThreatPattern(patternId);
    if (!pattern) {
      return res.status(404).json({
        success: false,
        error: 'Threat pattern not found',
      });
    }

    securityThreatDetectionService.updateThreatPattern(patternId, updates);

    res.json({
      success: true,
      message: 'Threat pattern updated successfully',
    });
  } catch (error) {
    safeLogger.error('Error updating threat pattern:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update threat pattern',
    });
  }
});

/**
 * Get behavioral profiles
 */
router.get('/behavioral-profiles', adminAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      entityType,
      entityId,
      anomalyThreshold = 50,
      limit = 50,
    } = req.query;

    // This would need to be implemented in the service to return profiles
    // For now, return a placeholder response
    const profiles = [
      {
        entityId: 'user_123',
        entityType: 'user',
        anomalyScore: 75,
        lastUpdated: new Date(),
        baseline: {
          averageActionsPerHour: 12,
          commonActionTypes: ['login', 'view_profile', 'update_settings'],
          typicalTimeRanges: [{ start: 9, end: 17 }],
        },
        currentBehavior: {
          actionsInLastHour: 45,
          recentActionTypes: ['login', 'admin_access', 'data_export'],
        },
      },
      {
        entityId: '192.168.1.100',
        entityType: 'ip',
        anomalyScore: 30,
        lastUpdated: new Date(),
        baseline: {
          averageActionsPerHour: 5,
          commonActionTypes: ['api_call', 'file_download'],
          typicalTimeRanges: [{ start: 0, end: 23 }],
        },
        currentBehavior: {
          actionsInLastHour: 8,
          recentActionTypes: ['api_call', 'file_download'],
        },
      },
    ];

    let filteredProfiles = profiles;

    if (entityType) {
      filteredProfiles = filteredProfiles.filter(p => p.entityType === entityType);
    }
    if (entityId) {
      filteredProfiles = filteredProfiles.filter(p => p.entityId === entityId);
    }
    if (anomalyThreshold) {
      filteredProfiles = filteredProfiles.filter(p => p.anomalyScore >= parseInt(anomalyThreshold as string));
    }

    const limitedProfiles = filteredProfiles.slice(0, parseInt(limit as string));

    res.json({
      success: true,
      data: {
        profiles: limitedProfiles,
        total: filteredProfiles.length,
      },
    });
  } catch (error) {
    safeLogger.error('Error getting behavioral profiles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get behavioral profiles',
    });
  }
});

/**
 * Get specific behavioral profile
 */
router.get('/behavioral-profiles/:entityId', adminAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { entityId } = req.params;

    const profile = securityThreatDetectionService.getBehavioralProfile(entityId);

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Behavioral profile not found',
      });
    }

    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    safeLogger.error('Error getting behavioral profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get behavioral profile',
    });
  }
});

/**
 * Get threat intelligence
 */
router.get('/intelligence', adminAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      source,
      type,
      limit = 100,
    } = req.query;

    // Placeholder threat intelligence data
    const intelligence = [
      {
        source: 'threat_feed_1',
        type: 'ip_reputation',
        indicators: [
          {
            value: '192.168.1.50',
            type: 'malicious_ip',
            confidence: 85,
            lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000),
            tags: ['botnet', 'malware'],
          },
        ],
        lastUpdated: new Date(),
      },
      {
        source: 'threat_feed_2',
        type: 'domain_reputation',
        indicators: [
          {
            value: 'malicious-site.com',
            type: 'malicious_domain',
            confidence: 92,
            lastSeen: new Date(Date.now() - 1 * 60 * 60 * 1000),
            tags: ['phishing', 'credential_theft'],
          },
        ],
        lastUpdated: new Date(),
      },
    ];

    let filteredIntelligence = intelligence;

    if (source) {
      filteredIntelligence = filteredIntelligence.filter(i => i.source === source);
    }
    if (type) {
      filteredIntelligence = filteredIntelligence.filter(i => i.type === type);
    }

    const limitedIntelligence = filteredIntelligence.slice(0, parseInt(limit as string));

    res.json({
      success: true,
      data: {
        intelligence: limitedIntelligence,
        total: filteredIntelligence.length,
      },
    });
  } catch (error) {
    safeLogger.error('Error getting threat intelligence:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get threat intelligence',
    });
  }
});

/**
 * Trigger manual threat analysis
 */
router.post('/analyze', csrfProtection,  adminAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { entityId, entityType, timeWindow = 3600000 } = req.body; // Default 1 hour

    if (!entityId || !entityType) {
      return res.status(400).json({
        success: false,
        error: 'entityId and entityType are required',
      });
    }

    // This would trigger a manual analysis
    // For now, return a placeholder response
    const analysisResult = {
      entityId,
      entityType,
      analysisTimestamp: new Date(),
      riskScore: Math.floor(Math.random() * 100),
      threats: [
        {
          type: 'behavioral_anomaly',
          severity: 'medium',
          confidence: 75,
          description: 'Unusual activity pattern detected',
        },
      ],
      recommendations: [
        'Monitor entity for next 24 hours',
        'Consider requiring additional authentication',
      ],
    };

    res.json({
      success: true,
      data: analysisResult,
    });
  } catch (error) {
    safeLogger.error('Error performing threat analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform threat analysis',
    });
  }
});

// Helper function to generate time series data
function generateTimeSeriesData(threats: any[]): Array<{ timestamp: Date; count: number; severity: string }> {
  const timeGroups = new Map<string, Map<string, number>>();
  
  threats.forEach(threat => {
    const hour = new Date(threat.timestamp);
    hour.setMinutes(0, 0, 0);
    const hourKey = hour.toISOString();
    
    if (!timeGroups.has(hourKey)) {
      timeGroups.set(hourKey, new Map());
    }
    
    const severityMap = timeGroups.get(hourKey)!;
    const severity = threat.severity;
    severityMap.set(severity, (severityMap.get(severity) || 0) + 1);
  });
  
  const result: Array<{ timestamp: Date; count: number; severity: string }> = [];
  
  timeGroups.forEach((severityMap, hourKey) => {
    severityMap.forEach((count, severity) => {
      result.push({
        timestamp: new Date(hourKey),
        count,
        severity,
      });
    });
  });
  
  return result.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

export default router;
