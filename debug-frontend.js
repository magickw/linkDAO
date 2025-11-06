// Enhanced Debug Script for LinkDAO Frontend
// Comprehensive request monitoring and debugging tools
// Run this in the browser console on http://localhost:3000

console.log('=== LinkDAO Enhanced Debug & Monitoring System ===');

// Circuit Breaker State Monitor
class CircuitBreakerMonitor {
    constructor() {
        this.states = new Map();
        this.stateHistory = [];
        this.listeners = [];
    }

    updateState(service, state, metrics) {
        const previousState = this.states.get(service);
        this.states.set(service, { state, metrics, timestamp: Date.now() });
        
        if (previousState?.state !== state) {
            const stateChange = {
                service,
                from: previousState?.state || 'UNKNOWN',
                to: state,
                timestamp: Date.now(),
                metrics
            };
            this.stateHistory.push(stateChange);
            this.notifyListeners(stateChange);
            
            console.log(`🔄 Circuit Breaker State Change: ${service} ${stateChange.from} → ${stateChange.to}`, metrics);
        }
    }

    getState(service) {
        return this.states.get(service);
    }

    getAllStates() {
        return Object.fromEntries(this.states);
    }

    getStateHistory() {
        return this.stateHistory;
    }

    onStateChange(callback) {
        this.listeners.push(callback);
    }

    notifyListeners(stateChange) {
        this.listeners.forEach(callback => {
            try {
                callback(stateChange);
            } catch (error) {
                console.error('Circuit breaker listener error:', error);
            }
        });
    }
}

// Rate Limiting Analysis Engine
class RateLimitAnalyzer {
    constructor() {
        this.windows = new Map();
        this.violations = [];
        this.thresholds = {
            requests_per_minute: 30,
            requests_per_second: 2,
            duplicate_threshold: 1000 // ms
        };
    }

    analyzeRequest(url, method, timestamp) {
        const key = `${method}:${url.split('?')[0]}`;
        const now = timestamp || Date.now();
        
        // Initialize window if not exists
        if (!this.windows.has(key)) {
            this.windows.set(key, {
                requests: [],
                lastRequest: 0,
                violations: 0
            });
        }

        const window = this.windows.get(key);
        
        // Clean old requests (older than 1 minute)
        window.requests = window.requests.filter(req => now - req < 60000);
        
        // Add current request
        window.requests.push(now);
        
        // Check for violations
        const violations = this.checkViolations(key, window, now);
        if (violations.length > 0) {
            violations.forEach(violation => {
                this.violations.push({ ...violation, url, method, timestamp: now });
                console.warn(`⚠️ Rate Limit Violation: ${violation.type}`, violation);
            });
        }

        window.lastRequest = now;
        return violations;
    }

    checkViolations(key, window, now) {
        const violations = [];
        
        // Check requests per minute
        if (window.requests.length > this.thresholds.requests_per_minute) {
            violations.push({
                type: 'REQUESTS_PER_MINUTE',
                count: window.requests.length,
                threshold: this.thresholds.requests_per_minute,
                severity: 'HIGH'
            });
        }

        // Check requests per second
        const recentRequests = window.requests.filter(req => now - req < 1000);
        if (recentRequests.length > this.thresholds.requests_per_second) {
            violations.push({
                type: 'REQUESTS_PER_SECOND',
                count: recentRequests.length,
                threshold: this.thresholds.requests_per_second,
                severity: 'CRITICAL'
            });
        }

        // Check for duplicate requests
        if (now - window.lastRequest < this.thresholds.duplicate_threshold) {
            violations.push({
                type: 'DUPLICATE_REQUEST',
                interval: now - window.lastRequest,
                threshold: this.thresholds.duplicate_threshold,
                severity: 'MEDIUM'
            });
        }

        return violations;
    }

    getViolations() {
        return this.violations;
    }

    getWindowStats() {
        const stats = {};
        this.windows.forEach((window, key) => {
            stats[key] = {
                totalRequests: window.requests.length,
                recentRequests: window.requests.filter(req => Date.now() - req < 60000).length,
                lastRequest: window.lastRequest,
                violations: window.violations
            };
        });
        return stats;
    }
}

// Performance Metrics Collector
class PerformanceMetricsCollector {
    constructor() {
        this.metrics = {
            requests: [],
            errors: [],
            performance: [],
            connectivity: []
        };
        this.startTime = Date.now();
    }

    recordRequest(url, method, startTime, endTime, status, error = null) {
        const duration = endTime - startTime;
        const metric = {
            url,
            method,
            startTime,
            endTime,
            duration,
            status,
            error,
            timestamp: Date.now()
        };

        this.metrics.requests.push(metric);
        
        if (error || status >= 400) {
            this.metrics.errors.push(metric);
        }

        // Keep only last 500 requests
        if (this.metrics.requests.length > 500) {
            this.metrics.requests.shift();
        }

        return metric;
    }

    recordConnectivityStatus(status, details) {
        this.metrics.connectivity.push({
            status,
            details,
            timestamp: Date.now()
        });
    }

    getMetrics() {
        return {
            ...this.metrics,
            summary: this.generateSummary()
        };
    }

    generateSummary() {
        const recentRequests = this.metrics.requests.filter(r => Date.now() - r.timestamp < 300000); // Last 5 minutes
        const recentErrors = this.metrics.errors.filter(e => Date.now() - e.timestamp < 300000);
        
        const avgResponseTime = recentRequests.length > 0 
            ? recentRequests.reduce((sum, r) => sum + r.duration, 0) / recentRequests.length 
            : 0;

        const errorRate = recentRequests.length > 0 
            ? (recentErrors.length / recentRequests.length) * 100 
            : 0;

        return {
            totalRequests: this.metrics.requests.length,
            recentRequests: recentRequests.length,
            recentErrors: recentErrors.length,
            errorRate: Math.round(errorRate * 100) / 100,
            avgResponseTime: Math.round(avgResponseTime),
            uptime: Date.now() - this.startTime
        };
    }
}

// Initialize monitoring systems
const circuitBreakerMonitor = new CircuitBreakerMonitor();
const rateLimitAnalyzer = new RateLimitAnalyzer();
const performanceCollector = new PerformanceMetricsCollector();

// Enhanced Request/Response Interceptor with Comprehensive Monitoring
console.log('🔍 Initializing advanced request monitoring system...');

const originalFetch = window.fetch;
const requestLog = [];

// Enhanced fetch interceptor with performance monitoring
window.fetch = function(...args) {
    const url = args[0];
    const options = args[1] || {};
    const method = options.method || 'GET';
    const startTime = performance.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Analyze rate limiting
    const violations = rateLimitAnalyzer.analyzeRequest(url, method);
    
    // Create detailed log entry
    const logEntry = {
        id: requestId,
        url: url.toString(),
        method,
        timestamp: new Date().toISOString(),
        timestampMs: Date.now(),
        startTime,
        headers: options.headers || {},
        body: options.body,
        violations,
        stack: new Error().stack?.split('\n').slice(1, 8).join('\n')
    };
    
    requestLog.push(logEntry);
    
    // Keep only last 1000 requests
    if (requestLog.length > 1000) {
        requestLog.shift();
    }
    
    // Enhanced logging with severity levels
    let logLevel = 'log';
    let logMessage = `🌐 [${requestId}] ${method} ${url}`;
    
    if (violations.length > 0) {
        const criticalViolations = violations.filter(v => v.severity === 'CRITICAL');
        const highViolations = violations.filter(v => v.severity === 'HIGH');
        
        if (criticalViolations.length > 0) {
            logLevel = 'error';
            logMessage += ' 🚨 CRITICAL RATE LIMIT VIOLATION';
        } else if (highViolations.length > 0) {
            logLevel = 'warn';
            logMessage += ' ⚠️ RATE LIMIT WARNING';
        } else {
            logLevel = 'warn';
            logMessage += ' ⚠️ RATE LIMIT NOTICE';
        }
        
        console[logLevel](logMessage, { violations, entry: logEntry });
    } else {
        console.log(logMessage);
    }
    
    // Execute request with performance tracking
    return originalFetch.apply(this, args)
        .then(response => {
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            // Update log entry with response data
            logEntry.endTime = endTime;
            logEntry.duration = duration;
            logEntry.status = response.status;
            logEntry.statusText = response.statusText;
            logEntry.responseHeaders = {};
            
            // Extract response headers
            response.headers.forEach((value, key) => {
                logEntry.responseHeaders[key] = value;
            });
            
            // Record performance metrics
            performanceCollector.recordRequest(url, method, startTime, endTime, response.status);
            
            // Check for connectivity issues
            if (response.status >= 500) {
                performanceCollector.recordConnectivityStatus('degraded', {
                    status: response.status,
                    url,
                    method
                });
            }
            
            // Log response details
            const responseMessage = `✅ [${requestId}] ${response.status} ${response.statusText} (${Math.round(duration)}ms)`;
            if (response.status >= 400) {
                console.error(responseMessage, logEntry);
            } else if (duration > 5000) {
                console.warn(`${responseMessage} - SLOW RESPONSE`, logEntry);
            } else {
                console.log(responseMessage);
            }
            
            return response;
        })
        .catch(error => {
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            // Update log entry with error data
            logEntry.endTime = endTime;
            logEntry.duration = duration;
            logEntry.error = {
                name: error.name,
                message: error.message,
                stack: error.stack
            };
            
            // Record error metrics
            performanceCollector.recordRequest(url, method, startTime, endTime, 0, error);
            
            // Record connectivity status
            performanceCollector.recordConnectivityStatus('error', {
                error: error.message,
                url,
                method
            });
            
            console.error(`❌ [${requestId}] Request failed (${Math.round(duration)}ms):`, error, logEntry);
            
            // Provide diagnostic information
            provideDiagnosticInfo(url, method, error, logEntry);
            
            throw error;
        });
};

// Diagnostic Information Provider
function provideDiagnosticInfo(url, method, error, logEntry) {
    const diagnostics = {
        timestamp: new Date().toISOString(),
        url,
        method,
        error: error.message,
        suggestions: []
    };
    
    // Analyze error and provide suggestions
    if (error.message.includes('CORS')) {
        diagnostics.suggestions.push({
            issue: 'CORS Policy Violation',
            solution: 'Check if the backend CORS configuration allows requests from this origin',
            action: 'Verify CORS middleware settings and allowed origins'
        });
    }
    
    if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
        diagnostics.suggestions.push({
            issue: 'Network Connectivity Issue',
            solution: 'Backend server may be unavailable or network connection is interrupted',
            action: 'Check backend server status and network connectivity'
        });
    }
    
    if (error.message.includes('timeout')) {
        diagnostics.suggestions.push({
            issue: 'Request Timeout',
            solution: 'Request took too long to complete',
            action: 'Check backend performance and consider increasing timeout values'
        });
    }
    
    // Check for rate limiting patterns
    const recentRequests = requestLog.filter(r => 
        r.url === url && 
        r.method === method && 
        Date.now() - r.timestampMs < 60000
    );
    
    if (recentRequests.length > 20) {
        diagnostics.suggestions.push({
            issue: 'Potential Rate Limiting',
            solution: `${recentRequests.length} requests to this endpoint in the last minute`,
            action: 'Implement request deduplication and caching to reduce API calls'
        });
    }
    
    console.group('🔍 Diagnostic Information');
    console.log('Error Analysis:', diagnostics);
    console.log('Recent Similar Requests:', recentRequests.length);
    console.log('Circuit Breaker States:', circuitBreakerMonitor.getAllStates());
    console.log('Rate Limit Analysis:', rateLimitAnalyzer.getWindowStats());
    console.groupEnd();
    
    return diagnostics;
}

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

// Real-Time Connectivity Status Monitor
class ConnectivityStatusMonitor {
    constructor() {
        this.status = 'unknown';
        this.lastCheck = null;
        this.listeners = [];
        this.checkInterval = null;
    }

    startMonitoring() {
        this.checkInterval = setInterval(() => {
            this.checkConnectivity();
        }, 5000); // Check every 5 seconds
        
        // Initial check
        this.checkConnectivity();
    }

    stopMonitoring() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    async checkConnectivity() {
        try {
            const startTime = performance.now();
            const response = await fetch('/api/health', { 
                method: 'HEAD',
                cache: 'no-cache'
            });
            const endTime = performance.now();
            const responseTime = endTime - startTime;

            const newStatus = response.ok ? 'online' : 'degraded';
            this.updateStatus(newStatus, {
                responseTime: Math.round(responseTime),
                status: response.status,
                timestamp: Date.now()
            });
        } catch (error) {
            this.updateStatus('offline', {
                error: error.message,
                timestamp: Date.now()
            });
        }
    }

    updateStatus(status, details) {
        const previousStatus = this.status;
        this.status = status;
        this.lastCheck = Date.now();

        if (previousStatus !== status) {
            console.log(`🌐 Connectivity Status: ${previousStatus} → ${status}`, details);
            this.notifyListeners({ status, previousStatus, details });
        }

        // Update circuit breaker with connectivity info
        circuitBreakerMonitor.updateState('connectivity', status, details);
    }

    onStatusChange(callback) {
        this.listeners.push(callback);
    }

    notifyListeners(statusChange) {
        this.listeners.forEach(callback => {
            try {
                callback(statusChange);
            } catch (error) {
                console.error('Connectivity listener error:', error);
            }
        });
    }

    getStatus() {
        return {
            status: this.status,
            lastCheck: this.lastCheck,
            details: this.lastDetails
        };
    }
}

// Initialize connectivity monitor
const connectivityMonitor = new ConnectivityStatusMonitor();

// Enhanced Debug API with Comprehensive Monitoring
window.debugLinkDAO = {
    // Original test functions
    testBackendConnection,
    testPostsAPI,
    testCreatePost,
    testEnvironmentVariables,
    runAllTests,

    // Enhanced monitoring functions
    monitoring: {
        // Request monitoring
        getRequestLog: () => requestLog,
        clearRequestLog: () => {
            requestLog.length = 0;
            console.log('🧹 Request log cleared');
        },

        // Performance metrics
        getPerformanceMetrics: () => performanceCollector.getMetrics(),
        getPerformanceSummary: () => performanceCollector.generateSummary(),

        // Rate limiting analysis
        getRateLimitAnalysis: () => rateLimitAnalyzer.getWindowStats(),
        getRateLimitViolations: () => rateLimitAnalyzer.getViolations(),

        // Circuit breaker monitoring
        getCircuitBreakerStates: () => circuitBreakerMonitor.getAllStates(),
        getCircuitBreakerHistory: () => circuitBreakerMonitor.getStateHistory(),

        // Connectivity monitoring
        getConnectivityStatus: () => connectivityMonitor.getStatus(),
        startConnectivityMonitoring: () => connectivityMonitor.startMonitoring(),
        stopConnectivityMonitoring: () => connectivityMonitor.stopMonitoring(),

        // Advanced analysis
        analyzeRequestPatterns: () => {
            const recentRequests = requestLog.filter(r => Date.now() - r.timestampMs < 300000);
            const patterns = {};
            
            recentRequests.forEach(request => {
                const key = `${request.method} ${request.url.split('?')[0]}`;
                if (!patterns[key]) {
                    patterns[key] = {
                        count: 0,
                        totalDuration: 0,
                        errors: 0,
                        violations: 0,
                        lastRequest: 0
                    };
                }
                
                patterns[key].count++;
                patterns[key].totalDuration += request.duration || 0;
                patterns[key].lastRequest = Math.max(patterns[key].lastRequest, request.timestampMs);
                
                if (request.error || (request.status && request.status >= 400)) {
                    patterns[key].errors++;
                }
                
                if (request.violations && request.violations.length > 0) {
                    patterns[key].violations++;
                }
            });

            // Calculate averages and add insights
            Object.keys(patterns).forEach(key => {
                const pattern = patterns[key];
                pattern.avgDuration = pattern.count > 0 ? Math.round(pattern.totalDuration / pattern.count) : 0;
                pattern.errorRate = pattern.count > 0 ? Math.round((pattern.errors / pattern.count) * 100) : 0;
                pattern.violationRate = pattern.count > 0 ? Math.round((pattern.violations / pattern.count) * 100) : 0;
                pattern.frequency = pattern.count / 5; // requests per minute (5 minute window)
            });

            return patterns;
        },

        // Diagnostic tools
        diagnoseConnectivityIssues: () => {
            const metrics = performanceCollector.getMetrics();
            const rateLimitStats = rateLimitAnalyzer.getWindowStats();
            const circuitStates = circuitBreakerMonitor.getAllStates();
            const connectivity = connectivityMonitor.getStatus();

            const issues = [];
            const recommendations = [];

            // Check error rate
            if (metrics.summary.errorRate > 10) {
                issues.push(`High error rate: ${metrics.summary.errorRate}%`);
                recommendations.push('Check backend server health and network connectivity');
            }

            // Check response time
            if (metrics.summary.avgResponseTime > 5000) {
                issues.push(`Slow response time: ${metrics.summary.avgResponseTime}ms`);
                recommendations.push('Investigate backend performance and consider caching');
            }

            // Check rate limiting
            const highFrequencyEndpoints = Object.entries(rateLimitStats)
                .filter(([_, stats]) => stats.recentRequests > 20);
            
            if (highFrequencyEndpoints.length > 0) {
                issues.push(`High frequency requests detected on ${highFrequencyEndpoints.length} endpoints`);
                recommendations.push('Implement request deduplication and intelligent caching');
            }

            // Check circuit breaker states
            const openCircuits = Object.entries(circuitStates)
                .filter(([_, state]) => state.state === 'OPEN');
            
            if (openCircuits.length > 0) {
                issues.push(`${openCircuits.length} circuit breakers are open`);
                recommendations.push('Wait for circuit breakers to recover or investigate underlying issues');
            }

            return {
                timestamp: new Date().toISOString(),
                connectivity: connectivity.status,
                issues,
                recommendations,
                metrics: {
                    errorRate: metrics.summary.errorRate,
                    avgResponseTime: metrics.summary.avgResponseTime,
                    totalRequests: metrics.summary.totalRequests,
                    recentRequests: metrics.summary.recentRequests
                }
            };
        },

        // Real-time dashboard data
        getDashboardData: () => {
            return {
                timestamp: new Date().toISOString(),
                connectivity: connectivityMonitor.getStatus(),
                performance: performanceCollector.generateSummary(),
                rateLimiting: rateLimitAnalyzer.getWindowStats(),
                circuitBreakers: circuitBreakerMonitor.getAllStates(),
                recentRequests: requestLog.slice(-10).map(r => ({
                    id: r.id,
                    method: r.method,
                    url: r.url.split('?')[0],
                    status: r.status,
                    duration: r.duration,
                    timestamp: r.timestamp
                }))
            };
        }
    }
};

// Auto-start monitoring systems
connectivityMonitor.startMonitoring();

// Set up circuit breaker monitoring for common services
circuitBreakerMonitor.onStateChange((change) => {
    if (change.to === 'OPEN') {
        console.error(`🚨 Circuit Breaker OPENED for ${change.service}:`, change.metrics);
    } else if (change.to === 'CLOSED') {
        console.log(`✅ Circuit Breaker CLOSED for ${change.service} - Service recovered`);
    }
});

// Development Mode Real-Time Performance Dashboard
function createPerformanceDashboard() {
    if (typeof document === 'undefined') return; // Skip in non-browser environments

    const dashboard = document.createElement('div');
    dashboard.id = 'linkdao-debug-dashboard';
    dashboard.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        width: 350px;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 15px;
        border-radius: 8px;
        font-family: monospace;
        font-size: 12px;
        z-index: 10000;
        max-height: 400px;
        overflow-y: auto;
        display: none;
    `;

    const toggleButton = document.createElement('button');
    toggleButton.textContent = '🔍 Debug';
    toggleButton.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        z-index: 10001;
        background: #007acc;
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
    `;

    let isVisible = false;
    toggleButton.onclick = () => {
        isVisible = !isVisible;
        dashboard.style.display = isVisible ? 'block' : 'none';
        toggleButton.style.right = isVisible ? '370px' : '10px';
    };

    function updateDashboard() {
        if (!isVisible) return;

        const data = window.debugLinkDAO.monitoring.getDashboardData();
        
        dashboard.innerHTML = `
            <div style="border-bottom: 1px solid #333; margin-bottom: 10px; padding-bottom: 10px;">
                <strong>🌐 LinkDAO Debug Dashboard</strong>
                <div style="font-size: 10px; color: #888;">${data.timestamp}</div>
            </div>
            
            <div style="margin-bottom: 10px;">
                <strong>Connectivity:</strong> 
                <span style="color: ${data.connectivity.status === 'online' ? '#4CAF50' : data.connectivity.status === 'degraded' ? '#FF9800' : '#F44336'}">
                    ${data.connectivity.status.toUpperCase()}
                </span>
            </div>
            
            <div style="margin-bottom: 10px;">
                <strong>Performance (5min):</strong><br>
                • Requests: ${data.performance.recentRequests}<br>
                • Errors: ${data.performance.recentErrors} (${data.performance.errorRate}%)<br>
                • Avg Response: ${data.performance.avgResponseTime}ms<br>
                • Uptime: ${Math.round(data.performance.uptime / 1000)}s
            </div>
            
            <div style="margin-bottom: 10px;">
                <strong>Circuit Breakers:</strong><br>
                ${Object.entries(data.circuitBreakers).map(([service, state]) => 
                    `• ${service}: <span style="color: ${state.state === 'CLOSED' ? '#4CAF50' : state.state === 'OPEN' ? '#F44336' : '#FF9800'}">${state.state}</span>`
                ).join('<br>') || 'None active'}
            </div>
            
            <div style="margin-bottom: 10px;">
                <strong>Recent Requests:</strong><br>
                ${data.recentRequests.map(req => 
                    `<div style="font-size: 10px; color: ${req.status >= 400 ? '#F44336' : req.status >= 200 ? '#4CAF50' : '#888'};">
                        ${req.method} ${req.url} (${req.duration || 0}ms)
                    </div>`
                ).join('') || 'No recent requests'}
            </div>
        `;
    }

    // Update dashboard every 2 seconds
    setInterval(updateDashboard, 2000);

    document.body.appendChild(toggleButton);
    document.body.appendChild(dashboard);

    return { dashboard, toggleButton };
}

// Initialize dashboard in development mode
if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
    setTimeout(createPerformanceDashboard, 1000); // Wait for DOM to be ready
}

// Enhanced Console Output
console.log('🔍 LinkDAO Enhanced Debug & Monitoring System Initialized');
console.log('');
console.log('📊 Available Debug Functions:');
console.log('');
console.log('🧪 Basic Tests:');
console.log('  • debugLinkDAO.runAllTests() - Run all connectivity tests');
console.log('  • debugLinkDAO.testBackendConnection() - Test backend connectivity');
console.log('  • debugLinkDAO.testPostsAPI() - Test posts API');
console.log('  • debugLinkDAO.testCreatePost() - Test post creation');
console.log('');
console.log('📈 Performance Monitoring:');
console.log('  • debugLinkDAO.monitoring.getPerformanceMetrics() - Get detailed performance data');
console.log('  • debugLinkDAO.monitoring.getPerformanceSummary() - Get performance summary');
console.log('  • debugLinkDAO.monitoring.analyzeRequestPatterns() - Analyze request patterns');
console.log('');
console.log('🚦 Rate Limiting & Circuit Breakers:');
console.log('  • debugLinkDAO.monitoring.getRateLimitAnalysis() - Get rate limiting stats');
console.log('  • debugLinkDAO.monitoring.getRateLimitViolations() - Get rate limit violations');
console.log('  • debugLinkDAO.monitoring.getCircuitBreakerStates() - Get circuit breaker states');
console.log('  • debugLinkDAO.monitoring.getCircuitBreakerHistory() - Get state change history');
console.log('');
console.log('🌐 Connectivity Monitoring:');
console.log('  • debugLinkDAO.monitoring.getConnectivityStatus() - Get current connectivity status');
console.log('  • debugLinkDAO.monitoring.startConnectivityMonitoring() - Start connectivity monitoring');
console.log('  • debugLinkDAO.monitoring.stopConnectivityMonitoring() - Stop connectivity monitoring');
console.log('');
console.log('🔧 Diagnostic Tools:');
console.log('  • debugLinkDAO.monitoring.diagnoseConnectivityIssues() - Run connectivity diagnostics');
console.log('  • debugLinkDAO.monitoring.getDashboardData() - Get real-time dashboard data');
console.log('  • debugLinkDAO.monitoring.getRequestLog() - Get detailed request log');
console.log('');
console.log('💡 Pro Tips:');
console.log('  • Click the "🔍 Debug" button (top-right) for real-time dashboard');
console.log('  • All requests are automatically monitored and analyzed');
console.log('  • Circuit breaker state changes are logged automatically');
console.log('  • Rate limiting violations trigger warnings');
console.log('');
console.log('🚀 System Status: MONITORING ACTIVE');

// Integration with React components
window.debugMonitoringAPI = {
    // Core monitoring systems
    circuitBreakerMonitor,
    rateLimitAnalyzer,
    performanceCollector,
    connectivityMonitor,
    
    // Request log access
    getRequestLog: () => requestLog,
    
    // Real-time data for React components
    getRealtimeData: () => {
        return {
            timestamp: new Date().toISOString(),
            connectivity: connectivityMonitor.getStatus(),
            performance: performanceCollector.generateSummary(),
            rateLimiting: rateLimitAnalyzer.getWindowStats(),
            circuitBreakers: circuitBreakerMonitor.getAllStates(),
            recentRequests: requestLog.slice(-10).map(r => ({
                id: r.id,
                method: r.method,
                url: r.url.split('?')[0],
                status: r.status,
                duration: r.duration,
                timestamp: r.timestamp,
                violations: r.violations
            })),
            violations: rateLimitAnalyzer.getViolations().slice(-5)
        };
    },
    
    // Event listeners for React integration
    addEventListener: (event, callback) => {
        if (event === 'circuitBreakerChange') {
            circuitBreakerMonitor.onStateChange(callback);
        } else if (event === 'connectivityChange') {
            connectivityMonitor.onStatusChange(callback);
        }
    }
};

// Periodic health check and alerting
setInterval(() => {
    const summary = performanceCollector.generateSummary();
    const connectivity = connectivityMonitor.getStatus();
    
    // Alert on high error rate
    if (summary.errorRate > 25) {
        console.warn('🚨 HIGH ERROR RATE DETECTED:', {
            errorRate: summary.errorRate,
            recentErrors: summary.recentErrors,
            recentRequests: summary.recentRequests
        });
    }
    
    // Alert on slow responses
    if (summary.avgResponseTime > 10000) {
        console.warn('🐌 SLOW RESPONSE TIME DETECTED:', {
            avgResponseTime: summary.avgResponseTime,
            recentRequests: summary.recentRequests
        });
    }
    
    // Alert on connectivity issues
    if (connectivity.status === 'offline') {
        console.error('🔴 CONNECTIVITY LOST:', connectivity);
    } else if (connectivity.status === 'degraded') {
        console.warn('🟡 CONNECTIVITY DEGRADED:', connectivity);
    }
    
    // Check for excessive rate limiting violations
    const recentViolations = rateLimitAnalyzer.getViolations().filter(v => 
        Date.now() - v.timestamp < 60000 // Last minute
    );
    
    if (recentViolations.length > 5) {
        console.warn('⚠️ EXCESSIVE RATE LIMITING VIOLATIONS:', {
            count: recentViolations.length,
            violations: recentViolations
        });
    }
}, 30000); // Check every 30 seconds

// Keyboard shortcuts for debugging
document.addEventListener('keydown', (event) => {
    // Ctrl+Shift+D: Toggle debug dashboard
    if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        
        const dashboard = document.getElementById('linkdao-debug-dashboard');
        if (dashboard) {
            const isVisible = dashboard.style.display !== 'none';
            dashboard.style.display = isVisible ? 'none' : 'block';
            console.log(`🔍 Debug dashboard ${isVisible ? 'hidden' : 'shown'}`);
        }
    }
    
    // Ctrl+Shift+R: Run diagnostics
    if (event.ctrlKey && event.shiftKey && event.key === 'R') {
        event.preventDefault();
        window.debugLinkDAO.monitoring.diagnoseConnectivityIssues();
    }
    
    // Ctrl+Shift+C: Clear logs
    if (event.ctrlKey && event.shiftKey && event.key === 'C') {
        event.preventDefault();
        window.debugLinkDAO.monitoring.clearRequestLog();
        console.log('🧹 Debug logs cleared');
    }
});

console.log('⌨️  Keyboard Shortcuts:');
console.log('  • Ctrl+Shift+D: Toggle debug dashboard');
console.log('  • Ctrl+Shift+R: Run connectivity diagnostics');
console.log('  • Ctrl+Shift+C: Clear request logs');

// Export for external access
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        debugLinkDAO: window.debugLinkDAO,
        debugMonitoringAPI: window.debugMonitoringAPI,
        circuitBreakerMonitor,
        rateLimitAnalyzer,
        performanceCollector,
        connectivityMonitor
    };
}