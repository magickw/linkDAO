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
    collectionInterval: number; // seconds
    historySize: number; // number of data points to keep
    performanceThresholds: {
      responseTime: {
        warning: number; // ms
        critical: number; // ms
      };
      errorRate: {
        warning: number; // percentage
        critical: number; // percentage
      };
      memoryUsage: {
        warning: number; // percentage
        critical: number; // percentage
      };
      throughput: {
        minimum: number; // requests per second
      };
    };
  };
  dashboard: {
    enabled: boolean;
    refreshInterval: number; // seconds
    retentionDays: number;
  };
  external: {
    prometheusEnabled: boolean;
    grafanaEnabled: boolean;
    elasticsearchEnabled: boolean;
  };
}

export const defaultMonitoringConfig: MonitoringConfig = {
  alerts: {
    enabled: process.env.ALERTS_ENABLED === 'true',
    webhookUrl: process.env.ALERT_WEBHOOK_URL,
    emailEnabled: process.env.ALERT_EMAIL_ENABLED === 'true',
    emailRecipients: process.env.ALERT_EMAIL_RECIPIENTS?.split(',') || [],
    slackWebhook: process.env.ALERT_SLACK_WEBHOOK,
    cooldownMinutes: parseInt(process.env.ALERT_COOLDOWN_MINUTES || '5')
  },
  metrics: {
    collectionInterval: parseInt(process.env.METRICS_COLLECTION_INTERVAL || '60'),
    historySize: parseInt(process.env.METRICS_HISTORY_SIZE || '1440'), // 24 hours
    performanceThresholds: {
      responseTime: {
        warning: parseInt(process.env.RESPONSE_TIME_WARNING_MS || '2000'),
        critical: parseInt(process.env.RESPONSE_TIME_CRITICAL_MS || '5000')
      },
      errorRate: {
        warning: parseFloat(process.env.ERROR_RATE_WARNING_PERCENT || '5'),
        critical: parseFloat(process.env.ERROR_RATE_CRITICAL_PERCENT || '10')
      },
      memoryUsage: {
        warning: parseFloat(process.env.MEMORY_WARNING_PERCENT || '80'),
        critical: parseFloat(process.env.MEMORY_CRITICAL_PERCENT || '95')
      },
      throughput: {
        minimum: parseFloat(process.env.THROUGHPUT_MINIMUM_RPS || '0.1')
      }
    }
  },
  dashboard: {
    enabled: process.env.MONITORING_DASHBOARD_ENABLED !== 'false',
    refreshInterval: parseInt(process.env.DASHBOARD_REFRESH_INTERVAL || '30'),
    retentionDays: parseInt(process.env.METRICS_RETENTION_DAYS || '7')
  },
  external: {
    prometheusEnabled: process.env.PROMETHEUS_ENABLED === 'true',
    grafanaEnabled: process.env.GRAFANA_ENABLED === 'true',
    elasticsearchEnabled: process.env.ELASTICSEARCH_ENABLED === 'true'
  }
};

export function validateMonitoringConfig(config: MonitoringConfig): string[] {
  const errors: string[] = [];

  if (config.alerts.enabled && !config.alerts.webhookUrl && !config.alerts.emailEnabled && !config.alerts.slackWebhook) {
    errors.push('Alerts are enabled but no notification methods are configured');
  }

  if (config.alerts.emailEnabled && config.alerts.emailRecipients.length === 0) {
    errors.push('Email alerts are enabled but no recipients are configured');
  }

  if (config.metrics.collectionInterval < 10) {
    errors.push('Metrics collection interval must be at least 10 seconds');
  }

  if (config.metrics.historySize < 60) {
    errors.push('Metrics history size must be at least 60 data points');
  }

  if (config.metrics.performanceThresholds.responseTime.warning >= config.metrics.performanceThresholds.responseTime.critical) {
    errors.push('Response time warning threshold must be less than critical threshold');
  }

  if (config.metrics.performanceThresholds.errorRate.warning >= config.metrics.performanceThresholds.errorRate.critical) {
    errors.push('Error rate warning threshold must be less than critical threshold');
  }

  if (config.metrics.performanceThresholds.memoryUsage.warning >= config.metrics.performanceThresholds.memoryUsage.critical) {
    errors.push('Memory usage warning threshold must be less than critical threshold');
  }

  return errors;
}

export function getMonitoringConfig(): MonitoringConfig {
  const config = { ...defaultMonitoringConfig };
  
  // Validate configuration
  const errors = validateMonitoringConfig(config);
  if (errors.length > 0) {
    console.warn('Monitoring configuration warnings:', errors);
  }

  return config;
}