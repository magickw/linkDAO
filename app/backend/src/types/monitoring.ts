export interface MonitoringConfig {
  alerts: {
    enabled: boolean;
    webhookUrl?: string;
    emailEnabled: boolean;
    emailRecipients: string[];
    slackWebhook?: string;
    cooldownMinutes: number;
  };
  metrics: {
    collectionInterval: number;
    historySize: number;
    performanceThresholds: {
      responseTime: {
        warning: number;
        critical: number;
      };
      errorRate: {
        warning: number;
        critical: number;
      };
      memoryUsage: {
        warning: number;
        critical: number;
      };
      throughput: {
        minimum: number;
      };
    };
  };
  dashboard: {
    enabled: boolean;
    refreshInterval: number;
    retentionDays: number;
  };
  external: {
    prometheusEnabled: boolean;
    grafanaEnabled: boolean;
    elasticsearchEnabled: boolean;
  };
}