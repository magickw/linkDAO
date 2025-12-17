import { Request, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';
import { ApiResponse } from '../utils/apiResponse';

export class EmergencyMiddleware {
  private redis: Redis;
  private errorThreshold = 0.5; // 50% error rate threshold
  private requestWindow = 60000; // 1 minute window
  private emergencyMode = false;

  constructor(redis: Redis) {
    this.redis = redis;
    this.setupEmergencyMonitoring();
  }

  // Main emergency middleware
  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Check if in emergency mode
      const isEmergency = await this.isEmergencyMode();
      
      if (isEmergency) {
        return this.handleEmergencyRequest(req, res, next);
      }

      // Track request for error rate monitoring
      await this.trackRequest(req);
      
      // Wrap response to track errors
      const originalSend = res.send;
      res.send = function(data) {
        // Track response status
        if (res.statusCode >= 500) {
          req.app.locals.emergencyMiddleware?.trackError(req);
        }
        return originalSend.call(this, data);
      };

      next();
    };
  }

  private async handleEmergencyRequest(req: Request, res: Response, next: NextFunction) {
    // Check if request is for essential endpoints
    if (this.isEssentialEndpoint(req.path)) {
      // Allow essential requests but with reduced functionality
      req.headers['x-emergency-mode'] = 'true';
      return next();
    }

    // Block non-essential requests
    if (this.isNonEssentialEndpoint(req.path)) {
      return ApiResponse.serviceUnavailable(res, 'System is in emergency mode. Please try again later.');
    }

    // Allow other requests with degraded functionality
    req.headers['x-degraded-mode'] = 'true';
    next();
  }

  private isEssentialEndpoint(path: string): boolean {
    const essentialPaths = [
      '/health',
      '/api/auth',
      '/api/session',
      '/api/emergency'
    ];
    return essentialPaths.some(essential => path.startsWith(essential));
  }

  private isNonEssentialEndpoint(path: string): boolean {
    const nonEssentialPaths = [
      '/api/analytics',
      '/api/recommendations',
      '/api/search',
      '/api/feed/trending',
      '/api/notifications'
    ];
    return nonEssentialPaths.some(nonEssential => path.startsWith(nonEssential));
  }

  private async trackRequest(req: Request) {
    const key = `requests:${Math.floor(Date.now() / this.requestWindow)}`;
    await this.redis.incr(key);
    await this.redis.expire(key, 120); // Keep for 2 minutes
  }

  private async trackError(req: Request) {
    const key = `errors:${Math.floor(Date.now() / this.requestWindow)}`;
    await this.redis.incr(key);
    await this.redis.expire(key, 120); // Keep for 2 minutes
  }

  private async isEmergencyMode(): Promise<boolean> {
    try {
      const emergencyFlag = await this.redis.get('emergency_mode');
      return emergencyFlag === 'true';
    } catch (error) {
      return false;
    }
  }  
private setupEmergencyMonitoring() {
    // Check error rates every 30 seconds
    setInterval(async () => {
      await this.checkErrorRate();
    }, 30000);
  }

  private async checkErrorRate() {
    try {
      const currentWindow = Math.floor(Date.now() / this.requestWindow);
      const previousWindow = currentWindow - 1;

      // Get request and error counts for current and previous windows
      const [currentRequests, currentErrors, prevRequests, prevErrors] = await Promise.all([
        this.redis.get(`requests:${currentWindow}`),
        this.redis.get(`errors:${currentWindow}`),
        this.redis.get(`requests:${previousWindow}`),
        this.redis.get(`errors:${previousWindow}`)
      ]);

      const totalRequests = (parseInt(currentRequests || '0') + parseInt(prevRequests || '0'));
      const totalErrors = (parseInt(currentErrors || '0') + parseInt(prevErrors || '0'));

      if (totalRequests > 10) { // Only check if we have enough requests
        const errorRate = totalErrors / totalRequests;
        
        console.log(`Error rate: ${(errorRate * 100).toFixed(1)}% (${totalErrors}/${totalRequests})`);

        if (errorRate > this.errorThreshold && !this.emergencyMode) {
          await this.enableEmergencyMode();
        } else if (errorRate < this.errorThreshold * 0.5 && this.emergencyMode) {
          await this.disableEmergencyMode();
        }
      }
    } catch (error) {
      console.error('Error checking error rate:', error);
    }
  }

  private async enableEmergencyMode() {
    console.log('🚨 ENABLING EMERGENCY MODE - High error rate detected');
    
    this.emergencyMode = true;
    await this.redis.set('emergency_mode', 'true');
    await this.redis.expire('emergency_mode', 1800); // Auto-disable after 30 minutes
    
    // Notify other services
    await this.redis.publish('emergency:mode_enabled', JSON.stringify({
      timestamp: Date.now(),
      reason: 'high_error_rate'
    }));

    // Apply emergency configurations
    await this.applyEmergencyConfig();
  }

  private async disableEmergencyMode() {
    console.log('✅ DISABLING EMERGENCY MODE - Error rate normalized');
    
    this.emergencyMode = false;
    await this.redis.del('emergency_mode');
    
    // Notify other services
    await this.redis.publish('emergency:mode_disabled', JSON.stringify({
      timestamp: Date.now()
    }));

    // Restore normal configurations
    await this.restoreNormalConfig();
  }

  private async applyEmergencyConfig() {
    // Reduce rate limits
    await this.redis.set('rate_limit:emergency', JSON.stringify({
      windowMs: 60000,
      max: 20, // Very restrictive
      skipSuccessfulRequests: false
    }));

    // Enable circuit breakers
    await this.redis.set('circuit_breaker:emergency', JSON.stringify({
      failureThreshold: 2,
      recoveryTimeout: 60000,
      enabled: true
    }));

    // Disable non-essential features
    await this.redis.set('features:emergency', JSON.stringify({
      analytics: false,
      recommendations: false,
      backgroundJobs: false,
      realTimeUpdates: false
    }));
  }

  private async restoreNormalConfig() {
    // Remove emergency configurations
    await Promise.all([
      this.redis.del('rate_limit:emergency'),
      this.redis.del('circuit_breaker:emergency'),
      this.redis.del('features:emergency')
    ]);
  }

  // Manual emergency mode control
  public async manualEnable() {
    await this.enableEmergencyMode();
  }

  public async manualDisable() {
    await this.disableEmergencyMode();
  }

  // Get current status
  public getStatus() {
    return {
      emergencyMode: this.emergencyMode,
      errorThreshold: this.errorThreshold,
      requestWindow: this.requestWindow
    };
  }
}