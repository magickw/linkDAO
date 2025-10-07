/**
 * Analytics Web Worker
 * Handles background processing of cache analytics and performance data
 */

// Analytics data storage
let analyticsHistory = [];
let performanceMetrics = new Map();
let userBehaviorPatterns = new Map();
let optimizationInsights = [];

// Configuration
const config = {
  maxHistorySize: 10000,
  analysisInterval: 60000, // 1 minute
  insightThreshold: 0.1, // 10% improvement threshold
  patternDetectionWindow: 24 * 60 * 60 * 1000 // 24 hours
};

/**
 * Process analytics data and generate insights
 */
function processAnalyticsData(data) {
  // Store analytics data
  analyticsHistory.push(data);
  
  // Maintain history size limit
  if (analyticsHistory.length > config.maxHistorySize) {
    analyticsHistory = analyticsHistory.slice(-config.maxHistorySize);
  }
  
  // Update performance metrics
  updatePerformanceMetrics(data);
  
  // Detect patterns and anomalies
  detectPatterns(data);
  
  // Generate optimization insights
  generateOptimizationInsights();
}

/**
 * Update performance metrics
 */
function updatePerformanceMetrics(data) {
  const timestamp = data.timestamp;
  const hour = new Date(timestamp).getHours();
  const dayOfWeek = new Date(timestamp).getDay();
  
  // Update hourly metrics
  const hourlyKey = `hour_${hour}`;
  if (!performanceMetrics.has(hourlyKey)) {
    performanceMetrics.set(hourlyKey, {
      hitRate: [],
      responseTime: [],
      memoryUsage: [],
      userSatisfaction: []
    });
  }
  
  const hourlyMetrics = performanceMetrics.get(hourlyKey);
  hourlyMetrics.hitRate.push(data.hitRate);
  hourlyMetrics.responseTime.push(data.averageResponseTime);
  hourlyMetrics.memoryUsage.push(data.memoryUsage);
  hourlyMetrics.userSatisfaction.push(data.userSatisfactionScore);
  
  // Update daily metrics
  const dailyKey = `day_${dayOfWeek}`;
  if (!performanceMetrics.has(dailyKey)) {
    performanceMetrics.set(dailyKey, {
      hitRate: [],
      responseTime: [],
      memoryUsage: [],
      userSatisfaction: []
    });
  }
  
  const dailyMetrics = performanceMetrics.get(dailyKey);
  dailyMetrics.hitRate.push(data.hitRate);
  dailyMetrics.responseTime.push(data.averageResponseTime);
  dailyMetrics.memoryUsage.push(data.memoryUsage);
  dailyMetrics.userSatisfaction.push(data.userSatisfactionScore);
  
  // Keep only recent data (last 100 points per metric)
  for (const metrics of [hourlyMetrics, dailyMetrics]) {
    Object.keys(metrics).forEach(key => {
      if (metrics[key].length > 100) {
        metrics[key] = metrics[key].slice(-100);
      }
    });
  }
}

/**
 * Detect patterns and anomalies in performance data
 */
function detectPatterns(data) {
  if (analyticsHistory.length < 10) return; // Need minimum data points
  
  const recentData = analyticsHistory.slice(-10);
  const patterns = [];
  
  // Detect hit rate trends
  const hitRates = recentData.map(d => d.hitRate);
  const hitRateTrend = calculateTrend(hitRates);
  
  if (hitRateTrend.slope < -0.05) {
    patterns.push({
      type: 'declining_hit_rate',
      severity: 'high',
      description: 'Cache hit rate is declining',
      recommendation: 'Review cache invalidation strategy'
    });
  }
  
  // Detect response time anomalies
  const responseTimes = recentData.map(d => d.averageResponseTime);
  const responseTimeAnomaly = detectAnomaly(responseTimes);
  
  if (responseTimeAnomaly.isAnomaly) {
    patterns.push({
      type: 'response_time_anomaly',
      severity: responseTimeAnomaly.severity,
      description: 'Unusual response time detected',
      recommendation: 'Check network conditions and server performance'
    });
  }
  
  // Detect memory usage patterns
  const memoryUsages = recentData.map(d => d.memoryUsage);
  const memoryTrend = calculateTrend(memoryUsages);
  
  if (memoryTrend.slope > 1000000) { // 1MB increase per data point
    patterns.push({
      type: 'memory_growth',
      severity: 'medium',
      description: 'Memory usage is growing consistently',
      recommendation: 'Consider cache cleanup or size limits'
    });
  }
  
  // Detect user satisfaction patterns
  const satisfactionScores = recentData.map(d => d.userSatisfactionScore);
  const satisfactionTrend = calculateTrend(satisfactionScores);
  
  if (satisfactionTrend.slope < -0.02) {
    patterns.push({
      type: 'declining_satisfaction',
      severity: 'high',
      description: 'User satisfaction is declining',
      recommendation: 'Review overall cache performance and user experience'
    });
  }
  
  // Store detected patterns
  if (patterns.length > 0) {
    self.postMessage({
      type: 'patterns_detected',
      patterns: patterns,
      timestamp: Date.now()
    });
  }
}

/**
 * Calculate trend (slope) for a series of values
 */
function calculateTrend(values) {
  if (values.length < 2) return { slope: 0, correlation: 0 };
  
  const n = values.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const y = values;
  
  const sumX = x.reduce((sum, val) => sum + val, 0);
  const sumY = y.reduce((sum, val) => sum + val, 0);
  const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
  const sumXX = x.reduce((sum, val) => sum + val * val, 0);
  const sumYY = y.reduce((sum, val) => sum + val * val, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const correlation = (n * sumXY - sumX * sumY) / 
    Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
  
  return { slope, correlation };
}

/**
 * Detect anomalies using simple statistical methods
 */
function detectAnomaly(values) {
  if (values.length < 5) return { isAnomaly: false };
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  const lastValue = values[values.length - 1];
  const zScore = Math.abs((lastValue - mean) / stdDev);
  
  let severity = 'low';
  let isAnomaly = false;
  
  if (zScore > 3) {
    severity = 'high';
    isAnomaly = true;
  } else if (zScore > 2) {
    severity = 'medium';
    isAnomaly = true;
  } else if (zScore > 1.5) {
    severity = 'low';
    isAnomaly = true;
  }
  
  return { isAnomaly, severity, zScore, mean, stdDev };
}

/**
 * Generate optimization insights based on historical data
 */
function generateOptimizationInsights() {
  if (analyticsHistory.length < 50) return; // Need sufficient data
  
  const insights = [];
  const recentData = analyticsHistory.slice(-50);
  
  // Analyze cache hit rate optimization opportunities
  const avgHitRate = recentData.reduce((sum, d) => sum + d.hitRate, 0) / recentData.length;
  
  if (avgHitRate < 0.7) {
    insights.push({
      type: 'cache_optimization',
      priority: 'high',
      description: `Cache hit rate is ${(avgHitRate * 100).toFixed(1)}%, below optimal threshold`,
      recommendations: [
        'Increase cache size limits',
        'Improve cache warming strategies',
        'Review cache invalidation policies',
        'Implement better preloading algorithms'
      ],
      expectedImprovement: 0.15
    });
  }
  
  // Analyze compression effectiveness
  const avgCompressionRatio = recentData.reduce((sum, d) => sum + d.compressionRatio, 0) / recentData.length;
  
  if (avgCompressionRatio < 0.5) {
    insights.push({
      type: 'compression_optimization',
      priority: 'medium',
      description: `Compression ratio is ${(avgCompressionRatio * 100).toFixed(1)}%, could be improved`,
      recommendations: [
        'Increase compression level',
        'Use more efficient compression algorithms',
        'Implement selective compression based on content type',
        'Pre-compress static assets'
      ],
      expectedImprovement: 0.1
    });
  }
  
  // Analyze preloading effectiveness
  const avgPreloadSuccess = recentData.reduce((sum, d) => sum + d.preloadSuccessRate, 0) / recentData.length;
  
  if (avgPreloadSuccess < 0.8) {
    insights.push({
      type: 'preloading_optimization',
      priority: 'medium',
      description: `Preload success rate is ${(avgPreloadSuccess * 100).toFixed(1)}%, indicating prediction accuracy issues`,
      recommendations: [
        'Improve user behavior prediction algorithms',
        'Adjust preloading timing based on network conditions',
        'Reduce concurrent preload limits',
        'Better resource prioritization'
      ],
      expectedImprovement: 0.12
    });
  }
  
  // Analyze memory usage efficiency
  const memoryUsages = recentData.map(d => d.memoryUsage);
  const maxMemory = Math.max(...memoryUsages);
  const avgMemory = memoryUsages.reduce((sum, val) => sum + val, 0) / memoryUsages.length;
  
  if (maxMemory > 100 * 1024 * 1024) { // 100MB
    insights.push({
      type: 'memory_optimization',
      priority: 'high',
      description: `Memory usage peaks at ${(maxMemory / 1024 / 1024).toFixed(1)}MB, may cause performance issues`,
      recommendations: [
        'Implement more aggressive cache eviction',
        'Reduce cache entry sizes',
        'Implement memory-aware caching strategies',
        'Use compression for large cache entries'
      ],
      expectedImprovement: 0.08
    });
  }
  
  // Analyze user satisfaction trends
  const satisfactionScores = recentData.map(d => d.userSatisfactionScore);
  const satisfactionTrend = calculateTrend(satisfactionScores);
  const avgSatisfaction = satisfactionScores.reduce((sum, val) => sum + val, 0) / satisfactionScores.length;
  
  if (avgSatisfaction < 0.8 || satisfactionTrend.slope < -0.01) {
    insights.push({
      type: 'user_experience_optimization',
      priority: 'high',
      description: `User satisfaction score is ${(avgSatisfaction * 100).toFixed(1)}% with declining trend`,
      recommendations: [
        'Focus on reducing response times',
        'Improve cache hit rates for critical resources',
        'Optimize mobile performance',
        'Implement better error handling and fallbacks'
      ],
      expectedImprovement: 0.2
    });
  }
  
  // Send insights if any were generated
  if (insights.length > 0) {
    optimizationInsights = insights;
    
    self.postMessage({
      type: 'optimization_insights',
      insights: insights,
      timestamp: Date.now()
    });
  }
}

/**
 * Process resource performance data
 */
function processResourcePerformance(data) {
  const { url, loadTime, cacheHit, transferSize } = data;
  
  // Track resource-specific metrics
  if (!performanceMetrics.has(url)) {
    performanceMetrics.set(url, {
      loadTimes: [],
      cacheHits: 0,
      cacheMisses: 0,
      totalTransferSize: 0,
      requestCount: 0
    });
  }
  
  const resourceMetrics = performanceMetrics.get(url);
  resourceMetrics.loadTimes.push(loadTime);
  resourceMetrics.requestCount++;
  resourceMetrics.totalTransferSize += transferSize;
  
  if (cacheHit) {
    resourceMetrics.cacheHits++;
  } else {
    resourceMetrics.cacheMisses++;
  }
  
  // Keep only recent load times
  if (resourceMetrics.loadTimes.length > 100) {
    resourceMetrics.loadTimes = resourceMetrics.loadTimes.slice(-100);
  }
  
  // Analyze resource performance
  analyzeResourcePerformance(url, resourceMetrics);
}

/**
 * Analyze individual resource performance
 */
function analyzeResourcePerformance(url, metrics) {
  const avgLoadTime = metrics.loadTimes.reduce((sum, time) => sum + time, 0) / metrics.loadTimes.length;
  const hitRate = metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses);
  
  // Identify slow resources
  if (avgLoadTime > 1000 && metrics.requestCount > 10) { // > 1 second average
    self.postMessage({
      type: 'slow_resource_detected',
      url: url,
      averageLoadTime: avgLoadTime,
      hitRate: hitRate,
      recommendations: [
        'Consider preloading this resource',
        'Implement better caching strategy',
        'Optimize resource size or format',
        'Use CDN for faster delivery'
      ]
    });
  }
  
  // Identify resources with low cache hit rates
  if (hitRate < 0.5 && metrics.requestCount > 20) {
    self.postMessage({
      type: 'low_cache_hit_resource',
      url: url,
      hitRate: hitRate,
      requestCount: metrics.requestCount,
      recommendations: [
        'Review cache headers and TTL',
        'Implement cache warming for this resource',
        'Check for cache invalidation issues',
        'Consider different caching strategy'
      ]
    });
  }
}

/**
 * Generate performance report
 */
function generatePerformanceReport() {
  const report = {
    timestamp: Date.now(),
    summary: {
      totalDataPoints: analyticsHistory.length,
      timeRange: analyticsHistory.length > 0 ? {
        start: analyticsHistory[0].timestamp,
        end: analyticsHistory[analyticsHistory.length - 1].timestamp
      } : null,
      averageMetrics: calculateAverageMetrics(),
      trends: calculateTrends(),
      topInsights: optimizationInsights.slice(0, 5)
    },
    resourceAnalysis: generateResourceAnalysis(),
    recommendations: generateRecommendations()
  };
  
  return report;
}

/**
 * Calculate average metrics across all data
 */
function calculateAverageMetrics() {
  if (analyticsHistory.length === 0) return null;
  
  const totals = analyticsHistory.reduce((acc, data) => {
    acc.hitRate += data.hitRate;
    acc.missRate += data.missRate;
    acc.compressionRatio += data.compressionRatio;
    acc.deduplicationSavings += data.deduplicationSavings;
    acc.preloadSuccessRate += data.preloadSuccessRate;
    acc.averageResponseTime += data.averageResponseTime;
    acc.memoryUsage += data.memoryUsage;
    acc.networkSavings += data.networkSavings;
    acc.userSatisfactionScore += data.userSatisfactionScore;
    return acc;
  }, {
    hitRate: 0,
    missRate: 0,
    compressionRatio: 0,
    deduplicationSavings: 0,
    preloadSuccessRate: 0,
    averageResponseTime: 0,
    memoryUsage: 0,
    networkSavings: 0,
    userSatisfactionScore: 0
  });
  
  const count = analyticsHistory.length;
  
  return {
    hitRate: totals.hitRate / count,
    missRate: totals.missRate / count,
    compressionRatio: totals.compressionRatio / count,
    deduplicationSavings: totals.deduplicationSavings / count,
    preloadSuccessRate: totals.preloadSuccessRate / count,
    averageResponseTime: totals.averageResponseTime / count,
    memoryUsage: totals.memoryUsage / count,
    networkSavings: totals.networkSavings / count,
    userSatisfactionScore: totals.userSatisfactionScore / count
  };
}

/**
 * Calculate trends for key metrics
 */
function calculateTrends() {
  if (analyticsHistory.length < 10) return null;
  
  const recentData = analyticsHistory.slice(-50); // Last 50 data points
  
  return {
    hitRate: calculateTrend(recentData.map(d => d.hitRate)),
    responseTime: calculateTrend(recentData.map(d => d.averageResponseTime)),
    memoryUsage: calculateTrend(recentData.map(d => d.memoryUsage)),
    userSatisfaction: calculateTrend(recentData.map(d => d.userSatisfactionScore))
  };
}

/**
 * Generate resource analysis summary
 */
function generateResourceAnalysis() {
  const resourceStats = [];
  
  for (const [url, metrics] of performanceMetrics.entries()) {
    if (url.startsWith('hour_') || url.startsWith('day_')) continue;
    
    const avgLoadTime = metrics.loadTimes.reduce((sum, time) => sum + time, 0) / metrics.loadTimes.length;
    const hitRate = metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses);
    
    resourceStats.push({
      url,
      averageLoadTime: avgLoadTime,
      hitRate: hitRate,
      requestCount: metrics.requestCount,
      totalTransferSize: metrics.totalTransferSize
    });
  }
  
  // Sort by request count (most requested first)
  resourceStats.sort((a, b) => b.requestCount - a.requestCount);
  
  return {
    totalResources: resourceStats.length,
    topResources: resourceStats.slice(0, 10),
    slowestResources: resourceStats
      .filter(r => r.averageLoadTime > 500)
      .sort((a, b) => b.averageLoadTime - a.averageLoadTime)
      .slice(0, 5),
    lowCacheHitResources: resourceStats
      .filter(r => r.hitRate < 0.5 && r.requestCount > 10)
      .sort((a, b) => a.hitRate - b.hitRate)
      .slice(0, 5)
  };
}

/**
 * Generate actionable recommendations
 */
function generateRecommendations() {
  const recommendations = [];
  
  // Add recommendations from optimization insights
  optimizationInsights.forEach(insight => {
    recommendations.push({
      category: insight.type,
      priority: insight.priority,
      description: insight.description,
      actions: insight.recommendations,
      expectedImprovement: insight.expectedImprovement
    });
  });
  
  // Sort by priority and expected improvement
  recommendations.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    
    if (priorityDiff !== 0) return priorityDiff;
    
    return b.expectedImprovement - a.expectedImprovement;
  });
  
  return recommendations;
}

/**
 * Handle messages from main thread
 */
self.onmessage = function(event) {
  const { type, data } = event.data;
  
  try {
    switch (type) {
      case 'process_analytics':
        processAnalyticsData(data);
        break;
        
      case 'resource_performance':
        processResourcePerformance(data);
        break;
        
      case 'generate_report':
        const report = generatePerformanceReport();
        self.postMessage({
          type: 'performance_report',
          report: report
        });
        break;
        
      case 'get_insights':
        self.postMessage({
          type: 'current_insights',
          insights: optimizationInsights
        });
        break;
        
      case 'clear_data':
        analyticsHistory = [];
        performanceMetrics.clear();
        userBehaviorPatterns.clear();
        optimizationInsights = [];
        
        self.postMessage({
          type: 'data_cleared'
        });
        break;
        
      default:
        console.warn('Unknown analytics operation:', type);
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error.message
    });
  }
};

// Periodic analysis
setInterval(() => {
  if (analyticsHistory.length > 0) {
    generateOptimizationInsights();
  }
}, config.analysisInterval);

// Send ready signal
self.postMessage({
  type: 'ready',
  config: config
});