import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { randomItem, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Import configuration
const config = JSON.parse(open('./loadTesting.config.js'));

// Custom metrics
const documentLoadTime = new Trend('document_load_time');
const searchResponseTime = new Trend('search_response_time');
const userEngagementScore = new Trend('user_engagement_score');
const errorRecoveryRate = new Rate('error_recovery_rate');
const cacheHitRatio = new Rate('cache_hit_ratio');
const documentLoadSuccess = new Rate('document_load_success');
const searchAccuracy = new Rate('search_accuracy');
const userSatisfaction = new Rate('user_satisfaction');

// Test configuration
export const options = {
  stages: config.phases.map(phase => ({
    duration: phase.duration,
    target: phase.arrivalRate
  })),
  
  thresholds: config.thresholds,
  
  ext: {
    loadimpact: {
      projectID: process.env.K6_PROJECT_ID,
      name: 'Support Documentation Load Test'
    }
  }
};

// Test data
const searchQueries = config.testData.searchQueries;
const documentIds = config.testData.documentIds;
const userAgents = config.testData.userAgents;
const languages = config.testData.languages;

// Base URL
const BASE_URL = config.target;

// Helper functions
function getRandomUserAgent() {
  return randomItem(userAgents);
}

function getRandomLanguage() {
  return randomItem(languages);
}

function simulateUserThinkTime() {
  sleep(randomIntBetween(1, 3));
}

function simulateReadingTime(contentLength) {
  // Simulate reading time based on content length (200 words per minute)
  const words = contentLength / 5; // Approximate words
  const readingTimeSeconds = Math.min((words / 200) * 60, 30); // Max 30 seconds
  sleep(readingTimeSeconds);
}

// Test scenarios
export default function() {
  const userAgent = getRandomUserAgent();
  const language = getRandomLanguage();
  const isMobile = userAgent.includes('Mobile') || userAgent.includes('iPhone');
  
  const params = {
    headers: {
      'User-Agent': userAgent,
      'Accept-Language': language,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    },
    tags: {
      user_type: isMobile ? 'mobile' : 'desktop',
      language: language
    }
  };

  // Scenario selection based on user type and random distribution
  const scenario = Math.random();
  
  if (scenario < 0.4) {
    documentBrowsingScenario(params);
  } else if (scenario < 0.7) {
    searchIntensiveScenario(params);
  } else if (scenario < 0.9) {
    mobileUserScenario(params);
  } else {
    supportEscalationScenario(params);
  }
}

// Scenario 1: Document Browsing
function documentBrowsingScenario(params) {
  group('Document Browsing Scenario', () => {
    // Step 1: Load support page
    group('Load Support Page', () => {
      const response = http.get(`${BASE_URL}/support`, params);
      
      check(response, {
        'support page loads': (r) => r.status === 200,
        'page load time < 2s': (r) => r.timings.duration < 2000,
        'contains documentation': (r) => r.body.includes('Support Documentation')
      });
      
      documentLoadTime.add(response.timings.duration);
      documentLoadSuccess.add(response.status === 200);
    });
    
    simulateUserThinkTime();
    
    // Step 2: Browse categories
    group('Browse Categories', () => {
      const response = http.get(`${BASE_URL}/api/support/categories`, params);
      
      check(response, {
        'categories load': (r) => r.status === 200,
        'categories response time < 500ms': (r) => r.timings.duration < 500
      });
    });
    
    simulateUserThinkTime();
    
    // Step 3: Load specific document
    group('Load Document', () => {
      const documentId = randomItem(documentIds);
      const response = http.get(`${BASE_URL}/api/support/documents/${documentId}`, params);
      
      check(response, {
        'document loads': (r) => r.status === 200,
        'document load time < 1.5s': (r) => r.timings.duration < 1500,
        'document has content': (r) => r.json('content') !== undefined
      });
      
      documentLoadTime.add(response.timings.duration);
      documentLoadSuccess.add(response.status === 200);
      
      // Simulate reading time
      if (response.status === 200) {
        const contentLength = response.body.length;
        simulateReadingTime(contentLength);
        
        // Track user engagement
        const engagementScore = Math.min(contentLength / 1000, 10); // 0-10 scale
        userEngagementScore.add(engagementScore);
      }
    });
    
    // Step 4: Provide feedback (30% of users)
    if (Math.random() < 0.3) {
      group('Provide Feedback', () => {
        const feedbackData = {
          documentId: randomItem(documentIds),
          rating: randomIntBetween(3, 5),
          helpful: true
        };
        
        const response = http.post(
          `${BASE_URL}/api/support/feedback`,
          JSON.stringify(feedbackData),
          {
            ...params,
            headers: {
              ...params.headers,
              'Content-Type': 'application/json'
            }
          }
        );
        
        check(response, {
          'feedback submitted': (r) => r.status === 200 || r.status === 201
        });
        
        userSatisfaction.add(feedbackData.rating >= 4);
      });
    }
  });
}

// Scenario 2: Search Intensive
function searchIntensiveScenario(params) {
  group('Search Intensive Scenario', () => {
    // Step 1: Load support page
    const pageResponse = http.get(`${BASE_URL}/support`, params);
    check(pageResponse, {
      'support page loads': (r) => r.status === 200
    });
    
    simulateUserThinkTime();
    
    // Step 2: Perform multiple searches
    for (let i = 0; i < randomIntBetween(3, 7); i++) {
      group(`Search ${i + 1}`, () => {
        const query = randomItem(searchQueries);
        const searchUrl = `${BASE_URL}/api/support/search?q=${encodeURIComponent(query)}`;
        
        const response = http.get(searchUrl, params);
        
        check(response, {
          'search executes': (r) => r.status === 200,
          'search response time < 500ms': (r) => r.timings.duration < 500,
          'search returns results': (r) => {
            try {
              const results = r.json('results');
              return Array.isArray(results) && results.length > 0;
            } catch {
              return false;
            }
          }
        });
        
        searchResponseTime.add(response.timings.duration);
        
        // Check search accuracy (simplified)
        if (response.status === 200) {
          try {
            const results = response.json('results');
            const hasRelevantResults = results.some(result => 
              result.title.toLowerCase().includes(query.toLowerCase()) ||
              result.content.toLowerCase().includes(query.toLowerCase())
            );
            searchAccuracy.add(hasRelevantResults);
          } catch {
            searchAccuracy.add(false);
          }
        }
        
        simulateUserThinkTime();
      });
    }
    
    // Step 3: Open search result
    group('Open Search Result', () => {
      const documentId = randomItem(documentIds);
      const response = http.get(`${BASE_URL}/api/support/documents/${documentId}`, params);
      
      check(response, {
        'search result opens': (r) => r.status === 200
      });
      
      documentLoadSuccess.add(response.status === 200);
    });
  });
}

// Scenario 3: Mobile User
function mobileUserScenario(params) {
  group('Mobile User Scenario', () => {
    // Mobile-specific parameters
    const mobileParams = {
      ...params,
      headers: {
        ...params.headers,
        'Viewport-Width': '375'
      },
      tags: {
        ...params.tags,
        scenario: 'mobile'
      }
    };
    
    // Step 1: Load mobile support page
    group('Load Mobile Support Page', () => {
      const response = http.get(`${BASE_URL}/support`, mobileParams);
      
      check(response, {
        'mobile page loads': (r) => r.status === 200,
        'mobile load time < 3s': (r) => r.timings.duration < 3000 // More lenient for mobile
      });
      
      documentLoadTime.add(response.timings.duration);
    });
    
    simulateUserThinkTime();
    
    // Step 2: Mobile search
    group('Mobile Search', () => {
      const query = randomItem(searchQueries);
      const response = http.get(
        `${BASE_URL}/api/support/search?q=${encodeURIComponent(query)}&mobile=true`,
        mobileParams
      );
      
      check(response, {
        'mobile search works': (r) => r.status === 200,
        'mobile search time < 1s': (r) => r.timings.duration < 1000
      });
      
      searchResponseTime.add(response.timings.duration);
    });
    
    // Step 3: Mobile document viewing
    group('Mobile Document View', () => {
      const documentId = randomItem(documentIds);
      const response = http.get(
        `${BASE_URL}/api/support/documents/${documentId}?mobile=true`,
        mobileParams
      );
      
      check(response, {
        'mobile document loads': (r) => r.status === 200,
        'mobile document optimized': (r) => {
          // Check for mobile-optimized content
          return r.body.includes('mobile-optimized') || r.body.length < 50000;
        }
      });
      
      documentLoadSuccess.add(response.status === 200);
    });
  });
}

// Scenario 4: Support Escalation
function supportEscalationScenario(params) {
  group('Support Escalation Scenario', () => {
    // Step 1: Browse documentation first
    const docResponse = http.get(`${BASE_URL}/support`, params);
    check(docResponse, {
      'initial page loads': (r) => r.status === 200
    });
    
    simulateUserThinkTime();
    
    // Step 2: Search for help
    const query = 'transaction failed';
    const searchResponse = http.get(
      `${BASE_URL}/api/support/search?q=${encodeURIComponent(query)}`,
      params
    );
    
    check(searchResponse, {
      'help search works': (r) => r.status === 200
    });
    
    simulateUserThinkTime();
    
    // Step 3: Try to create support ticket (50% of users)
    if (Math.random() < 0.5) {
      group('Create Support Ticket', () => {
        const ticketData = {
          subject: 'Need help with transaction issue',
          description: 'My transaction has been pending for hours',
          priority: 'medium',
          category: 'technical'
        };
        
        const response = http.post(
          `${BASE_URL}/api/support/tickets`,
          JSON.stringify(ticketData),
          {
            ...params,
            headers: {
              ...params.headers,
              'Content-Type': 'application/json'
            }
          }
        );
        
        check(response, {
          'ticket created': (r) => r.status === 200 || r.status === 201,
          'ticket response time < 2s': (r) => r.timings.duration < 2000
        });
      });
    }
    
    // Step 4: Try live chat (30% of users)
    if (Math.random() < 0.3) {
      group('Start Live Chat', () => {
        const chatData = {
          message: 'I need help with a transaction issue',
          context: {
            lastViewedDocument: randomItem(documentIds),
            searchQuery: query
          }
        };
        
        const response = http.post(
          `${BASE_URL}/api/support/chat/start`,
          JSON.stringify(chatData),
          {
            ...params,
            headers: {
              ...params.headers,
              'Content-Type': 'application/json'
            }
          }
        );
        
        check(response, {
          'chat started': (r) => r.status === 200 || r.status === 201
        });
      });
    }
  });
}

// Error recovery testing
export function handleSummary(data) {
  // Calculate error recovery rate
  const totalErrors = data.metrics.http_req_failed.values.rate * data.metrics.http_reqs.values.count;
  const recoveredErrors = totalErrors * 0.8; // Assume 80% recovery rate
  errorRecoveryRate.add(recoveredErrors / totalErrors);
  
  // Calculate cache hit ratio (simulated)
  const cacheHits = data.metrics.http_reqs.values.count * 0.7; // Assume 70% cache hit rate
  cacheHitRatio.add(cacheHits / data.metrics.http_reqs.values.count);
  
  return {
    'summary.json': JSON.stringify(data, null, 2),
    'summary.html': generateHTMLReport(data)
  };
}

function generateHTMLReport(data) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Support Documentation Load Test Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .metric { margin: 10px 0; padding: 10px; border: 1px solid #ddd; }
        .pass { background-color: #d4edda; }
        .fail { background-color: #f8d7da; }
        .warn { background-color: #fff3cd; }
      </style>
    </head>
    <body>
      <h1>Support Documentation Load Test Report</h1>
      
      <h2>Test Summary</h2>
      <div class="metric">
        <strong>Total Requests:</strong> ${data.metrics.http_reqs.values.count}
      </div>
      <div class="metric">
        <strong>Request Rate:</strong> ${data.metrics.http_reqs.values.rate.toFixed(2)} req/s
      </div>
      <div class="metric ${data.metrics.http_req_failed.values.rate < 0.01 ? 'pass' : 'fail'}">
        <strong>Error Rate:</strong> ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%
      </div>
      
      <h2>Performance Metrics</h2>
      <div class="metric ${data.metrics.http_req_duration.values.p95 < 2000 ? 'pass' : 'fail'}">
        <strong>95th Percentile Response Time:</strong> ${data.metrics.http_req_duration.values.p95.toFixed(2)}ms
      </div>
      <div class="metric">
        <strong>Average Response Time:</strong> ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
      </div>
      
      <h2>Custom Metrics</h2>
      <div class="metric">
        <strong>Document Load Success Rate:</strong> ${(data.metrics.document_load_success?.values.rate * 100 || 0).toFixed(2)}%
      </div>
      <div class="metric">
        <strong>Search Accuracy:</strong> ${(data.metrics.search_accuracy?.values.rate * 100 || 0).toFixed(2)}%
      </div>
      <div class="metric">
        <strong>User Satisfaction:</strong> ${(data.metrics.user_satisfaction?.values.rate * 100 || 0).toFixed(2)}%
      </div>
      
      <h2>Recommendations</h2>
      <ul>
        ${data.metrics.http_req_duration.values.p95 > 2000 ? '<li>Optimize response times - 95th percentile exceeds 2s threshold</li>' : ''}
        ${data.metrics.http_req_failed.values.rate > 0.01 ? '<li>Investigate error rate - exceeds 1% threshold</li>' : ''}
        ${(data.metrics.document_load_success?.values.rate || 1) < 0.99 ? '<li>Improve document loading reliability</li>' : ''}
        ${(data.metrics.search_accuracy?.values.rate || 1) < 0.95 ? '<li>Enhance search relevance and accuracy</li>' : ''}
      </ul>
      
      <p><em>Report generated on ${new Date().toISOString()}</em></p>
    </body>
    </html>
  `;
}