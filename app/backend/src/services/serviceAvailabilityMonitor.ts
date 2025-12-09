
/**
 * Service Availability Monitor
 * Ensures critical services remain available and responsive
 */

export class ServiceAvailabilityMonitor {
  private isMonitoring = false;
  private checkInterval: NodeJS.Timeout | null = null;

  start() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('🔍 Service availability monitor started');
    
    // Check every 60 seconds (reduced from 30 seconds to decrease CPU usage)
    this.checkInterval = setInterval(() => {
      this.performHealthCheck();
    }, 60000);
    
    // Initial check
    this.performHealthCheck();
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isMonitoring = false;
    console.log('🔍 Service availability monitor stopped');
  }

  private async performHealthCheck() {
    try {
      const status = {
        timestamp: new Date().toISOString(),
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        pid: process.pid,
        version: process.version
      };
      
      // Log status every 5 minutes
      if (Math.floor(Date.now() / 1000) % 300 === 0) {
        console.log('📊 Service status:', status);
      }
      
      // Check memory usage and warn if high
      const memoryUsageMB = status.memory.heapUsed / 1024 / 1024;
      if (memoryUsageMB > 400) { // Warn at 400MB
        console.warn('⚠️ High memory usage:', memoryUsageMB.toFixed(2), 'MB');
      }
      
    } catch (error) {
      console.error('❌ Health check failed:', error);
    }
  }
}

export const serviceAvailabilityMonitor = new ServiceAvailabilityMonitor();
