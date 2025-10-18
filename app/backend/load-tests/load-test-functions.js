const { performance } = require('perf_hooks');

// Load test utility functions for Artillery.js

/**
 * Set authentication token from CSV data
 */
function setAuthToken(context, events, done) {
  // Use token from CSV payload if available
  if (context.vars.token) {
    context.vars.authToken = context.vars.token;
  } else {
    // Fallback to a test token
    context.vars.authToken = 'test-admin-token-' + Math.random().toString(36).substr(2, 9);
  }
  
  return done();
}

/**
 * Generate random test data for load testing
 */
function generateTestData(context, events, done) {
  context.vars.testData = {
    userId: 'user-' + Math.random().toString(36).substr(2, 9),
    contentId: 'content-' + Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    randomValue: Math.floor(Math.random() * 1000)
  };
  
  return done();
}

/**
 * Measure custom response times
 */
function measureResponseTime(context, events, done) {
  context.vars.requestStartTime = performance.now();
  return done();
}

/**
 * Calculate and emit custom metrics
 */
function emitCustomMetrics(context, events, done) {
  if (context.vars.requestStartTime) {
    const responseTime = performance.now() - context.vars.requestStartTime;
    
    // Emit custom metric
    events.emit('customStat', {
      stat: 'admin_dashboard_response_time',
      value: responseTime
    });
    
    // Log slow requests
    if (responseTime > 5000) {
      console.log(`Slow request detected: ${responseTime.toFixed(2)}ms`);
    }
  }
  
  return done();
}

/**
 * Simulate realistic user behavior patterns
 */
function simulateUserBehavior(context, events, done) {
  const behaviors = [
    'quick_check',      // Quick dashboard check
    'detailed_analysis', // Deep dive into analytics
    'moderation_session', // Extended moderation work
    'report_generation'  // Generate and review reports
  ];
  
  const behavior = behaviors[Math.floor(Math.random() * behaviors.length)];
  context.vars.userBehavior = behavior;
  
  // Set behavior-specific parameters
  switch (behavior) {
    case 'quick_check':
      context.vars.sessionDuration = 30; // 30 seconds
      context.vars.pageViews = 2;
      break;
    case 'detailed_analysis':
      context.vars.sessionDuration = 300; // 5 minutes
      context.vars.pageViews = 8;
      break;
    case 'moderation_session':
      context.vars.sessionDuration = 600; // 10 minutes
      context.vars.pageViews = 15;
      break;
    case 'report_generation':
      context.vars.sessionDuration = 180; // 3 minutes
      context.vars.pageViews = 5;
      break;
  }
  
  return done();
}

/**
 * Validate response data structure
 */
function validateResponse(context, events, done) {
  const response = context.vars.$;
  
  if (response && response.body) {
    try {
      const data = JSON.parse(response.body);
      
      // Validate common response structure
      if (data.error) {
        events.emit('customStat', {
          stat: 'api_error_rate',
          value: 1
        });
        console.log(`API Error: ${data.error}`);
      } else {
        events.emit('customStat', {
          stat: 'api_success_rate',
          value: 1
        });
      }
      
      // Validate specific endpoint responses
      if (context.vars.endpoint === '/api/admin/dashboard/metrics') {
        if (!data.realTimeUsers || !data.systemHealth) {
          console.log('Invalid dashboard metrics response structure');
        }
      }
      
    } catch (error) {
      console.log('Failed to parse response JSON:', error.message);
    }
  }
  
  return done();
}

/**
 * Simulate WebSocket message handling
 */
function handleWebSocketMessage(context, events, done) {
  const messageTypes = [
    'metrics_update',
    'alert',
    'system_health_update',
    'user_activity'
  ];
  
  const messageType = messageTypes[Math.floor(Math.random() * messageTypes.length)];
  
  context.vars.wsMessage = {
    type: messageType,
    timestamp: new Date().toISOString(),
    data: generateMockData(messageType)
  };
  
  return done();
}

/**
 * Generate mock data based on message type
 */
function generateMockData(type) {
  switch (type) {
    case 'metrics_update':
      return {
        realTimeUsers: Math.floor(Math.random() * 2000) + 500,
        systemLoad: Math.random(),
        moderationQueue: Math.floor(Math.random() * 50),
        timestamp: new Date().toISOString()
      };
    
    case 'alert':
      return {
        id: 'alert-' + Math.random().toString(36).substr(2, 9),
        severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
        message: 'Load test generated alert',
        timestamp: new Date().toISOString()
      };
    
    case 'system_health_update':
      return {
        overall: ['healthy', 'degraded', 'critical'][Math.floor(Math.random() * 3)],
        components: [
          { name: 'database', status: 'healthy', responseTime: Math.random() * 100 },
          { name: 'api', status: 'healthy', responseTime: Math.random() * 200 },
          { name: 'cache', status: 'healthy', responseTime: Math.random() * 50 }
        ],
        timestamp: new Date().toISOString()
      };
    
    case 'user_activity':
      return {
        activeUsers: Math.floor(Math.random() * 1000) + 100,
        newSessions: Math.floor(Math.random() * 50),
        timestamp: new Date().toISOString()
      };
    
    default:
      return { timestamp: new Date().toISOString() };
  }
}

/**
 * Monitor resource usage during load test
 */
function monitorResources(context, events, done) {
  // Simulate resource monitoring
  const resources = {
    cpu: Math.random() * 100,
    memory: Math.random() * 100,
    disk: Math.random() * 100,
    network: Math.random() * 100
  };
  
  // Emit resource metrics
  Object.keys(resources).forEach(resource => {
    events.emit('customStat', {
      stat: `resource_${resource}_usage`,
      value: resources[resource]
    });
  });
  
  // Alert on high resource usage
  if (resources.cpu > 90) {
    console.log(`High CPU usage detected: ${resources.cpu.toFixed(2)}%`);
  }
  
  if (resources.memory > 85) {
    console.log(`High memory usage detected: ${resources.memory.toFixed(2)}%`);
  }
  
  return done();
}

/**
 * Simulate database query performance
 */
function simulateDbQuery(context, events, done) {
  const queryTypes = [
    'simple_select',
    'complex_aggregation',
    'join_query',
    'analytics_query'
  ];
  
  const queryType = queryTypes[Math.floor(Math.random() * queryTypes.length)];
  
  // Simulate different query execution times
  let executionTime;
  switch (queryType) {
    case 'simple_select':
      executionTime = Math.random() * 50 + 10; // 10-60ms
      break;
    case 'complex_aggregation':
      executionTime = Math.random() * 500 + 100; // 100-600ms
      break;
    case 'join_query':
      executionTime = Math.random() * 200 + 50; // 50-250ms
      break;
    case 'analytics_query':
      executionTime = Math.random() * 2000 + 500; // 500-2500ms
      break;
  }
  
  events.emit('customStat', {
    stat: `db_query_${queryType}_time`,
    value: executionTime
  });
  
  context.vars.dbQueryTime = executionTime;
  
  return done();
}

/**
 * Calculate performance scores
 */
function calculatePerformanceScore(context, events, done) {
  const responseTime = context.vars.responseTime || 0;
  const dbQueryTime = context.vars.dbQueryTime || 0;
  
  // Calculate performance score (0-100)
  let score = 100;
  
  // Penalize slow response times
  if (responseTime > 2000) score -= 30;
  else if (responseTime > 1000) score -= 15;
  else if (responseTime > 500) score -= 5;
  
  // Penalize slow database queries
  if (dbQueryTime > 1000) score -= 20;
  else if (dbQueryTime > 500) score -= 10;
  else if (dbQueryTime > 200) score -= 5;
  
  events.emit('customStat', {
    stat: 'performance_score',
    value: Math.max(0, score)
  });
  
  return done();
}

/**
 * Generate load test report data
 */
function generateReportData(context, events, done) {
  const reportData = {
    timestamp: new Date().toISOString(),
    virtualUser: context.vars.$uuid || 'unknown',
    scenario: context.scenario || 'unknown',
    phase: context.phase || 'unknown',
    metrics: {
      responseTime: context.vars.responseTime || 0,
      dbQueryTime: context.vars.dbQueryTime || 0,
      userBehavior: context.vars.userBehavior || 'unknown'
    }
  };
  
  // Log report data for analysis
  console.log('Load Test Data:', JSON.stringify(reportData));
  
  return done();
}

module.exports = {
  setAuthToken,
  generateTestData,
  measureResponseTime,
  emitCustomMetrics,
  simulateUserBehavior,
  validateResponse,
  handleWebSocketMessage,
  monitorResources,
  simulateDbQuery,
  calculatePerformanceScore,
  generateReportData
};