// Debug script to test frontend posting functionality
// Run this in the browser console on http://localhost:3000

console.log('=== LinkDAO Frontend Debug Script ===');

// Test 1: Check if backend is reachable
async function testBackendConnection() {
    console.log('Testing backend connection...');
    try {
        const response = await fetch('http://localhost:10000/health');
        const data = await response.json();
        console.log('✅ Backend is reachable:', data);
        return true;
    } catch (error) {
        console.error('❌ Backend connection failed:', error);
        return false;
    }
}

// Test 2: Check if posts API works
async function testPostsAPI() {
    console.log('Testing posts API...');
    try {
        const response = await fetch('http://localhost:10000/api/posts');
        const posts = await response.json();
        console.log(`✅ Posts API works, found ${posts.length} posts`);
        return true;
    } catch (error) {
        console.error('❌ Posts API failed:', error);
        return false;
    }
}

// Test 3: Test creating a post
async function testCreatePost() {
    console.log('Testing post creation...');
    const testPost = {
        author: '0x1234567890123456789012345678901234567890',
        content: 'Test post from frontend debug script',
        tags: ['debug', 'frontend', 'test']
    };

    try {
        const response = await fetch('http://localhost:10000/api/posts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testPost)
        });

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Post creation successful:', result);
            return true;
        } else {
            const error = await response.json();
            console.error('❌ Post creation failed:', error);
            return false;
        }
    } catch (error) {
        console.error('❌ Post creation network error:', error);
        return false;
    }
}

// Test 4: Check environment variables
function testEnvironmentVariables() {
    console.log('Checking environment variables...');

    // These should be available in the browser
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'Not set';
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'Not set';

    console.log('NEXT_PUBLIC_BACKEND_URL:', backendUrl);
    console.log('NEXT_PUBLIC_API_URL:', apiUrl);

    if (backendUrl.includes('localhost:10000')) {
        console.log('✅ Backend URL is correctly set for local development');
        return true;
    } else {
        console.log('❌ Backend URL is not set for local development');
        return false;
    }
}

// Run all tests
async function runAllTests() {
    console.log('Running all tests...\n');

    const results = {
        backend: await testBackendConnection(),
        postsAPI: await testPostsAPI(),
        createPost: await testCreatePost(),
        envVars: testEnvironmentVariables()
    };

    console.log('\n=== Test Results ===');
    Object.entries(results).forEach(([test, passed]) => {
        console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
    });

    const allPassed = Object.values(results).every(result => result);
    console.log(`\n${allPassed ? '🎉 All tests passed!' : '⚠️  Some tests failed'}`);

    return results;
}

// Export for manual testing
window.debugLinkDAO = {
    testBackendConnection,
    testPostsAPI,
    testCreatePost,
    testEnvironmentVariables,
    runAllTests
};

console.log('Debug functions available as window.debugLinkDAO');
console.log('Run window.debugLinkDAO.runAllTests() to test everything');
/
/ Enhanced request monitoring for debugging excessive requests
console.log('🔍 Adding request monitoring...');

// Monitor fetch requests with detailed analysis
const originalFetch = window.fetch;
const requestLog = [];
const duplicateTracker = new Map();
const rateLimitTracker = new Map();

window.fetch = function(...args) {
  const url = args[0];
  const options = args[1] || {};
  const method = options.method || 'GET';
  const requestKey = `${method}:${url}`;
  const now = Date.now();
  
  // Track duplicate requests
  const lastRequest = duplicateTracker.get(requestKey);
  const isDuplicate = lastRequest && (now - lastRequest) < 1000; // Within 1 second
  
  // Track rate limiting
  const rateLimitInfo = rateLimitTracker.get(requestKey) || { count: 0, windowStart: now };
  if (now - rateLimitInfo.windowStart > 60000) { // Reset every minute
    rateLimitInfo.count = 0;
    rateLimitInfo.windowStart = now;
  }
  rateLimitInfo.count++;
  rateLimitTracker.set(requestKey, rateLimitInfo);
  
  const logEntry = {
    url: url.toString(),
    method,
    timestamp: new Date().toISOString(),
    timestampMs: now,
    isDuplicate,
    rateLimitCount: rateLimitInfo.count,
    stack: new Error().stack?.split('\n').slice(1, 6).join('\n') // First 5 stack frames
  };
  
  requestLog.push(logEntry);
  duplicateTracker.set(requestKey, now);
  
  // Keep only last 200 requests
  if (requestLog.length > 200) {
    requestLog.shift();
  }
  
  // Enhanced logging with warnings
  let logMessage = `🌐 ${method} ${url}`;
  if (isDuplicate) {
    logMessage += ' ⚠️ DUPLICATE';
    console.warn(logMessage, logEntry);
  } else if (rateLimitInfo.count > 10) {
    logMessage += ` ⚠️ HIGH FREQUENCY (${rateLimitInfo.count}/min)`;
    console.warn(logMessage, logEntry);
  } else {
    console.log(logMessage);
  }
  
  return originalFetch.apply(this, args).catch(error => {
    console.error(`❌ Request failed: ${method} ${url}`, error);
    throw error;
  });
};

// Enhanced debug functions
window.debugRequests = {
  getLog: () => requestLog,
  clearLog: () => {
    requestLog.length = 0;
    duplicateTracker.clear();
    rateLimitTracker.clear();
  },
  
  getStats: () => {
    const stats = {};
    const duplicates = {};
    const rateLimits = {};
    
    requestLog.forEach(entry => {
      const key = `${entry.method} ${entry.url.split('?')[0]}`; // Remove query params for grouping
      stats[key] = (stats[key] || 0) + 1;
      
      if (entry.isDuplicate) {
        duplicates[key] = (duplicates[key] || 0) + 1;
      }
      
      if (entry.rateLimitCount > 10) {
        rateLimits[key] = Math.max(rateLimits[key] || 0, entry.rateLimitCount);
      }
    });
    
    return { stats, duplicates, rateLimits };
  },
  
  getRecentRequests: (minutes = 5) => {
    const cutoff = Date.now() - minutes * 60 * 1000;
    return requestLog.filter(entry => entry.timestampMs > cutoff);
  },
  
  getDuplicates: () => {
    return requestLog.filter(entry => entry.isDuplicate);
  },
  
  getHighFrequency: (threshold = 10) => {
    return requestLog.filter(entry => entry.rateLimitCount > threshold);
  },
  
  getFeedRequests: () => {
    return requestLog.filter(entry => entry.url.includes('/api/posts/feed'));
  },
  
  analyzePattern: () => {
    const feedRequests = requestLog.filter(entry => entry.url.includes('/api/posts/feed'));
    const intervals = [];
    
    for (let i = 1; i < feedRequests.length; i++) {
      const interval = feedRequests[i].timestampMs - feedRequests[i-1].timestampMs;
      intervals.push(interval);
    }
    
    const avgInterval = intervals.length > 0 ? intervals.reduce((a, b) => a + b, 0) / intervals.length : 0;
    const minInterval = intervals.length > 0 ? Math.min(...intervals) : 0;
    
    return {
      totalFeedRequests: feedRequests.length,
      averageInterval: Math.round(avgInterval),
      minimumInterval: minInterval,
      duplicateFeedRequests: feedRequests.filter(r => r.isDuplicate).length,
      recentFeedRequests: feedRequests.filter(r => Date.now() - r.timestampMs < 60000).length
    };
  },
  
  startMonitoring: () => {
    console.log('🔍 Starting request monitoring...');
    const interval = setInterval(() => {
      const analysis = window.debugRequests.analyzePattern();
      if (analysis.recentFeedRequests > 5) {
        console.warn('⚠️ High feed request frequency detected:', analysis);
      }
    }, 10000); // Check every 10 seconds
    
    window.debugRequests.stopMonitoring = () => {
      clearInterval(interval);
      console.log('🔍 Request monitoring stopped');
    };
  }
};

// Auto-start monitoring
window.debugRequests.startMonitoring();

console.log('🔍 Enhanced debug functions available:');
console.log('- debugRequests.getLog(): Get all requests');
console.log('- debugRequests.clearLog(): Clear request log');  
console.log('- debugRequests.getStats(): Get detailed statistics');
console.log('- debugRequests.getRecentRequests(minutes): Get recent requests');
console.log('- debugRequests.getDuplicates(): Get duplicate requests');
console.log('- debugRequests.getHighFrequency(): Get high frequency requests');
console.log('- debugRequests.getFeedRequests(): Get feed-specific requests');
console.log('- debugRequests.analyzePattern(): Analyze request patterns');
console.log('- debugRequests.startMonitoring(): Start automatic monitoring');
console.log('- debugRequests.stopMonitoring(): Stop automatic monitoring');