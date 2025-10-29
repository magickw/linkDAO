interface SupportMetrics {
  ticketsCreated: number;
  ticketsResolved: number;
  averageResponseTime: number;
  chatSessions: number;
  fileUploads: number;
  errors: number;
}

class SupportMonitoringService {
  private metrics: SupportMetrics = {
    ticketsCreated: 0,
    ticketsResolved: 0,
    averageResponseTime: 0,
    chatSessions: 0,
    fileUploads: 0,
    errors: 0
  };

  private responseTimes: number[] = [];

  trackTicketCreated() {
    this.metrics.ticketsCreated++;
  }

  trackTicketResolved(responseTimeMs: number) {
    this.metrics.ticketsResolved++;
    this.responseTimes.push(responseTimeMs);
    this.metrics.averageResponseTime = 
      this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
  }

  trackChatSession() {
    this.metrics.chatSessions++;
  }

  trackFileUpload() {
    this.metrics.fileUploads++;
  }

  trackError(error: Error) {
    this.metrics.errors++;
    console.error('[SupportMonitoring] Error:', error.message);
  }

  getMetrics(): SupportMetrics {
    return { ...this.metrics };
  }

  reset() {
    this.metrics = {
      ticketsCreated: 0,
      ticketsResolved: 0,
      averageResponseTime: 0,
      chatSessions: 0,
      fileUploads: 0,
      errors: 0
    };
    this.responseTimes = [];
  }
}

export const supportMonitoring = new SupportMonitoringService();
