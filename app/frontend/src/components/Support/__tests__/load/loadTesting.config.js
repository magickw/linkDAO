/**
 * Load Testing Configuration for Support Documentation System
 * Tests system performance under various load conditions
 */

const loadTestingConfig = {
  // Base configuration
  target: process.env.LOAD_TEST_TARGET || 'http://localhost:3000',
  
  // Test phases with different load patterns
  phases: [
    // Warm-up phase
    {
      name: 'warm-up',
      duration: '2m',
      arrivalRate: 1,
      rampTo: 5,
      description: 'Gradual warm-up to prepare system'
    },
    
    // Normal load
    {
      name: 'normal-load',
      duration: '5m',
      arrivalRate: 10,
      description: 'Sustained normal user load'
    },
    
    // Peak load
    {
      name: 'peak-load',
      duration: '3m',
      arrivalRate: 25,
      description: 'Peak usage simulation'
    },
    
    // Stress test
    {
      name: 'stress-test',
      duration: '2m',
      arrivalRate: 50,
      description: 'Stress testing beyond normal capacity'
    },
    
    // Cool down
    {
      name: 'cool-down',
      duration: '1m',
      arrivalRate: 5,
      rampTo: 1,
      description: 'Gradual cool down'
    }
  ],

  // Performance thresholds
  thresholds: {
    // Response time thresholds
    'http_req_duration': ['p(95)<2000'], // 95% of requests under 2s
    'http_req_duration{name:document-load}': ['p(90)<1500'], // Document loads under 1.5s
    'http_req_duration{name:search}': ['p(95)<500'], // Search under 500ms
    
    // Success rate thresholds
    'http_req_failed': ['rate<0.01'], // Less than 1% failure rate
    'http_req_failed{name:critical}': ['rate<0.001'], // Critical endpoints < 0.1% failure
    
    // Throughput thresholds
    'http_reqs': ['rate>100'], // Minimum 100 requests per second
    
    // Custom metrics
    'document_load_success': ['rate>0.99'], // 99% document load success
    'search_accuracy': ['rate>0.95'], // 95% search accuracy
    'user_satisfaction': ['rate>0.90'] // 90% user satisfaction simulation
  },

  // Test scenarios
  scenarios: {
    // Basic document browsing
    document_browsing: {
      weight: 40,
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '2m', target: 10 },
        { duration: '5m', target: 20 },
        { duration: '2m', target: 0 }
      ]
    },

    // Search-heavy usage
    search_intensive: {
      weight: 30,
      executor: 'constant-vus',
      vus: 15,
      duration: '8m'
    },

    // Mobile users
    mobile_users: {
      weight: 20,
      executor: 'ramping-arrival-rate',
      startRate: 1,
      timeUnit: '1s',
      stages: [
        { duration: '3m', target: 5 },
        { duration: '4m', target: 10 },
        { duration: '2m', target: 0 }
      ]
    },

    // Support escalation
    support_escalation: {
      weight: 10,
      executor: 'shared-iterations',
      vus: 5,
      iterations: 50,
      maxDuration: '10m'
    }
  },

  // Environment-specific settings
  environments: {
    development: {
      target: 'http://localhost:3000',
      maxVUs: 50,
      duration: '5m'
    },
    
    staging: {
      target: 'https://staging.linkdao.io',
      maxVUs: 100,
      duration: '10m'
    },
    
    production: {
      target: 'https://linkdao.io',
      maxVUs: 200,
      duration: '15m',
      // More conservative thresholds for production
      thresholds: {
        'http_req_duration': ['p(95)<1500'],
        'http_req_failed': ['rate<0.005']
      }
    }
  },

  // Test data
  testData: {
    searchQueries: [
      'wallet setup',
      'security best practices',
      'transaction failed',
      'getting started',
      'troubleshooting',
      'LDAO tokens',
      'marketplace guide',
      'community support',
      'technical issues',
      'account problems'
    ],
    
    documentIds: [
      'beginners-guide',
      'security-guide',
      'troubleshooting-guide',
      'quick-faq',
      'advanced-features',
      'api-documentation'
    ],
    
    userAgents: [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
      'Mozilla/5.0 (Android 11; Mobile; rv:68.0) Gecko/68.0 Firefox/88.0'
    ],
    
    languages: ['en', 'es', 'fr', 'de', 'zh', 'ja', 'ar', 'pt', 'ru', 'it']
  },

  // Monitoring and reporting
  monitoring: {
    // Custom metrics to track
    customMetrics: [
      'document_load_time',
      'search_response_time',
      'user_engagement_score',
      'error_recovery_rate',
      'cache_hit_ratio'
    ],
    
    // Real-time monitoring endpoints
    healthChecks: [
      '/api/health',
      '/api/support/status',
      '/api/support/documents/health'
    ],
    
    // Performance budgets
    budgets: {
      'First Contentful Paint': 1500,
      'Largest Contentful Paint': 2500,
      'Cumulative Layout Shift': 0.1,
      'First Input Delay': 100
    }
  },

  // Error simulation
  errorSimulation: {
    // Network error rates
    networkErrors: {
      rate: 0.02, // 2% network error rate
      types: ['timeout', 'connection_reset', 'dns_failure']
    },
    
    // Server error simulation
    serverErrors: {
      rate: 0.01, // 1% server error rate
      codes: [500, 502, 503, 504]
    },
    
    // Slow response simulation
    slowResponses: {
      rate: 0.05, // 5% slow response rate
      delay: '3s-10s'
    }
  }
};

module.exports = loadTestingConfig;