// Advanced Debug Tools for Request Monitoring and Connectivity Analysis
// This module provides comprehensive debugging utilities for the LinkDAO frontend

/**
 * Request/Response Interceptor for Axios and Fetch
 * Provides detailed logging and analysis of all HTTP requests
 */
export class RequestInterceptor {
    constructor() {
        this.requests = new Map();
        this.interceptors = [];
        this.isActive = false;
    }

    /**
     * Start intercepting requests
     */
    start() {
        if (this.isActive) return;
        
        this.interceptAxios();
        this.interceptFetch();
        this.isActive = true;
        
        console.log('🔍 Request interceptor started');
    }

    /**
     * Stop intercepting requests
     */
    stop() {
        if (!this.isActive) return;
        
        // Restore original methods
        this.restoreOriginalMethods();
        this.isActive = false;
        
        console.log('🔍 Request interceptor stopped');
    }

    /**
     * Intercept Axios requests if available
     */
    interceptAxios() {
        if (typeof window !== 'undefined' && window.axios) {
            const requestInterceptor = window.axios.interceptors.request.use(
                (config) => {
                    const requestId = this.generateRequestId();
                    config.metadata = { requestId, startTime: performance.now() };
                    
                    this.logRequest(requestId, {
                        method: config.method?.toUpperCase(),
                        url: config.url,
                        headers: config.headers,
                        data: config.data,
                        params: config.params
                    });
                    
                    return config;
                },
                (error) => {
                    console.error('🚨 Axios request error:', error);
                    return Promise.reject(error);
                }
            );

            const responseInterceptor = window.axios.interceptors.response.use(
                (response) => {
                    const { requestId, startTime } = response.config.metadata || {};
                    const duration = performance.now() - startTime;
                    
                    this.logResponse(requestId, {
                        status: response.status,
                        statusText: response.statusText,
                        headers: response.headers,
                        data: response.data,
                        duration
                    });
                    
                    return response;
                },
                (error) => {
                    const { requestId, startTime } = error.config?.metadata || {};
                    const duration = performance.now() - startTime;
                    
                    this.logError(requestId, {
                        message: error.message,
                        status: error.response?.status,
                        statusText: error.response?.statusText,
                        duration
                    });
                    
                    return Promise.reject(error);
                }
            );

            this.interceptors.push({
                type: 'axios',
                request: requestInterceptor,
                response: responseInterceptor
            });
        }
    }

    /**
     * Intercept native fetch requests
     */
    interceptFetch() {
        if (typeof window !== 'undefined' && !window.originalFetch) {
            window.originalFetch = window.fetch;
            
            window.fetch = async (...args) => {
                const requestId = this.generateRequestId();
                const startTime = performance.now();
                const [url, options = {}] = args;
                
                this.logRequest(requestId, {
                    method: options.method || 'GET',
                    url: url.toString(),
                    headers: options.headers,
                    body: options.body
                });

                try {
                    const response = await window.originalFetch(...args);
                    const duration = performance.now() - startTime;
                    
                    this.logResponse(requestId, {
                        status: response.status,
                        statusText: response.statusText,
                        headers: Object.fromEntries(response.headers.entries()),
                        duration
                    });
                    
                    return response;
                } catch (error) {
                    const duration = performance.now() - startTime;
                    
                    this.logError(requestId, {
                        message: error.message,
                        duration
                    });
                    
                    throw error;
                }
            };
        }
    }

    /**
     * Restore original methods
     */
    restoreOriginalMethods() {
        // Restore axios interceptors
        this.interceptors.forEach(interceptor => {
            if (interceptor.type === 'axios' && window.axios) {
                window.axios.interceptors.request.eject(interceptor.request);
                window.axios.interceptors.response.eject(interceptor.response);
            }
        });

        // Restore fetch
        if (window.originalFetch) {
            window.fetch = window.originalFetch;
            delete window.originalFetch;
        }

        this.interceptors = [];
    }

    /**
     * Generate unique request ID
     */
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Log request details
     */
    logRequest(requestId, details) {
        const request = {
            id: requestId,
            timestamp: Date.now(),
            type: 'request',
            ...details
        };
        
        this.requests.set(requestId, request);
        
        console.group(`🌐 [${requestId}] ${details.method} ${details.url}`);
        console.log('Request Details:', details);
        console.groupEnd();
    }

    /**
     * Log response details
     */
    logResponse(requestId, details) {
        const request = this.requests.get(requestId);
        if (request) {
            request.response = details;
            request.completed = true;
        }
        
        const statusColor = details.status >= 400 ? '🔴' : details.status >= 300 ? '🟡' : '🟢';
        
        console.group(`${statusColor} [${requestId}] ${details.status} ${details.statusText} (${Math.round(details.duration)}ms)`);
        console.log('Response Details:', details);
        if (request) {
            console.log('Full Request:', request);
        }
        console.groupEnd();
    }

    /**
     * Log error details
     */
    logError(requestId, details) {
        const request = this.requests.get(requestId);
        if (request) {
            request.error = details;
            request.completed = true;
        }
        
        console.group(`🚨 [${requestId}] ERROR (${Math.round(details.duration)}ms)`);
        console.error('Error Details:', details);
        if (request) {
            console.log('Full Request:', request);
        }
        console.groupEnd();
    }

    /**
     * Get all requests
     */
    getRequests() {
        return Array.from(this.requests.values());
    }

    /**
     * Get requests by status
     */
    getRequestsByStatus(status) {
        return this.getRequests().filter(req => req.response?.status === status);
    }

    /**
     * Get failed requests
     */
    getFailedRequests() {
        return this.getRequests().filter(req => req.error || (req.response?.status >= 400));
    }

    /**
     * Get slow requests
     */
    getSlowRequests(threshold = 5000) {
        return this.getRequests().filter(req => req.response?.duration > threshold);
    }

    /**
     * Clear request history
     */
    clearHistory() {
        this.requests.clear();
        console.log('🧹 Request history cleared');
    }
}

/**
 * Connectivity Diagnostics Tool
 * Provides comprehensive connectivity analysis and troubleshooting
 */
export class ConnectivityDiagnostics {
    constructor() {
        this.tests = [];
        this.results = new Map();
    }

    /**
     * Run comprehensive connectivity diagnostics
     */
    async runDiagnostics() {
        console.log('🔍 Running connectivity diagnostics...');
        
        const tests = [
            this.testBasicConnectivity,
            this.testCORSConfiguration,
            this.testAPIEndpoints,
            this.testWebSocketConnection,
            this.testNetworkLatency,
            this.testDNSResolution
        ];

        const results = {};
        
        for (const test of tests) {
            try {
                const result = await test.call(this);
                results[test.name] = result;
                console.log(`✅ ${test.name}:`, result);
            } catch (error) {
                results[test.name] = { success: false, error: error.message };
                console.error(`❌ ${test.name}:`, error);
            }
        }

        this.generateDiagnosticReport(results);
        return results;
    }

    /**
     * Test basic connectivity to backend
     */
    async testBasicConnectivity() {
        const startTime = performance.now();
        
        try {
            const response = await fetch('/api/health', {
                method: 'HEAD',
                cache: 'no-cache'
            });
            
            const duration = performance.now() - startTime;
            
            return {
                success: response.ok,
                status: response.status,
                duration: Math.round(duration),
                headers: Object.fromEntries(response.headers.entries())
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                duration: performance.now() - startTime
            };
        }
    }

    /**
     * Test CORS configuration
     */
    async testCORSConfiguration() {
        const testOrigins = [
            window.location.origin,
            'http://localhost:3000',
            'https://localhost:3000'
        ];

        const results = {};
        
        for (const origin of testOrigins) {
            try {
                const response = await fetch('/api/health', {
                    method: 'OPTIONS',
                    headers: {
                        'Origin': origin,
                        'Access-Control-Request-Method': 'GET'
                    }
                });
                
                results[origin] = {
                    success: response.ok,
                    status: response.status,
                    corsHeaders: {
                        'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
                        'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
                        'access-control-allow-headers': response.headers.get('access-control-allow-headers')
                    }
                };
            } catch (error) {
                results[origin] = {
                    success: false,
                    error: error.message
                };
            }
        }
        
        return results;
    }

    /**
     * Test API endpoints
     */
    async testAPIEndpoints() {
        const endpoints = [
            { path: '/api/health', method: 'GET' },
            { path: '/api/posts', method: 'GET' },
            { path: '/api/communities', method: 'GET' },
            { path: '/api/marketplace/listings', method: 'GET' }
        ];

        const results = {};
        
        for (const endpoint of endpoints) {
            try {
                const startTime = performance.now();
                const response = await fetch(endpoint.path, {
                    method: endpoint.method,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                const duration = performance.now() - startTime;
                
                results[`${endpoint.method} ${endpoint.path}`] = {
                    success: response.ok,
                    status: response.status,
                    duration: Math.round(duration),
                    contentType: response.headers.get('content-type')
                };
            } catch (error) {
                results[`${endpoint.method} ${endpoint.path}`] = {
                    success: false,
                    error: error.message
                };
            }
        }
        
        return results;
    }

    /**
     * Test WebSocket connection
     */
    async testWebSocketConnection() {
        return new Promise((resolve) => {
            const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:10000';
            const startTime = performance.now();
            
            try {
                const ws = new WebSocket(wsUrl);
                
                const timeout = setTimeout(() => {
                    ws.close();
                    resolve({
                        success: false,
                        error: 'Connection timeout',
                        duration: performance.now() - startTime
                    });
                }, 5000);
                
                ws.onopen = () => {
                    clearTimeout(timeout);
                    const duration = performance.now() - startTime;
                    ws.close();
                    resolve({
                        success: true,
                        duration: Math.round(duration),
                        url: wsUrl
                    });
                };
                
                ws.onerror = () => {
                    clearTimeout(timeout);
                    resolve({
                        success: false,
                        error: 'WebSocket connection failed',
                        duration: performance.now() - startTime
                    });
                };

            } catch (error) {
                resolve({
                    success: false,
                    error: error.message,
                    duration: performance.now() - startTime
                });
            }

        });
    }

    /**
     * Test network latency
     */
    async testNetworkLatency() {
        const iterations = 5;
        const latencies = [];
        
        for (let i = 0; i < iterations; i++) {
            const startTime = performance.now();
            
            try {
                await fetch('/api/health', {
                    method: 'HEAD',
                    cache: 'no-cache'
                });
                
                latencies.push(performance.now() - startTime);
            } catch (error) {
                // Skip failed requests
                console.debug('Network latency test failed:', error.message);
            }
        }
        
        if (latencies.length === 0) {
            return {
                success: false,
                error: 'All latency tests failed'
            };
        }
        
        const avgLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
        const minLatency = Math.min(...latencies);
        const maxLatency = Math.max(...latencies);
        
        return {
            success: true,
            iterations: latencies.length,
            average: Math.round(avgLatency),
            minimum: Math.round(minLatency),
            maximum: Math.round(maxLatency),
            jitter: Math.round(maxLatency - minLatency)
        };
    }

    /**
     * Test DNS resolution
     */
    async testDNSResolution() {
        const domains = [
            window.location.hostname,
            'api.linkdao.io',
            'localhost'
        ];

        const results = {};
        
        for (const domain of domains) {
            const startTime = performance.now();
            
            try {
                // Use a simple fetch to test DNS resolution
                await fetch(`http://${domain}/favicon.ico`, {
                    method: 'HEAD',
                    mode: 'no-cors',
                    cache: 'no-cache'
                });
                
                results[domain] = {
                    success: true,
                    duration: Math.round(performance.now() - startTime)
                };
            } catch (error) {
                results[domain] = {
                    success: false,
                    error: error.message,
                    duration: Math.round(performance.now() - startTime)
                };
            }
        }
        
        return results;
    }

    /**
     * Generate diagnostic report
     */
    generateDiagnosticReport(results) {
        console.group('📊 Connectivity Diagnostic Report');
        
        const issues = [];
        const recommendations = [];
        
        // Analyze basic connectivity
        if (!results.testBasicConnectivity?.success) {
            issues.push('Backend server is not reachable');
            recommendations.push('Check if backend server is running and accessible');
        }
        
        // Analyze CORS
        const corsResults = results.testCORSConfiguration || {};
        const failedCors = Object.entries(corsResults).filter(([, result]) => !result.success);
        if (failedCors.length > 0) {
            issues.push(`CORS configuration issues for ${failedCors.length} origins`);
            recommendations.push('Review CORS middleware configuration and allowed origins');
        }
        
        // Analyze API endpoints
        const apiResults = results.testAPIEndpoints || {};
        const failedApis = Object.entries(apiResults).filter(([, result]) => !result.success);
        if (failedApis.length > 0) {
            issues.push(`${failedApis.length} API endpoints are not responding`);
            recommendations.push('Check API server status and endpoint configurations');
        }

        // Analyze WebSocket
        if (!results.testWebSocketConnection?.success) {
            issues.push('WebSocket connection failed');
            recommendations.push('Check WebSocket server configuration and firewall settings');
        }
        
        // Analyze latency
        const latencyResult = results.testNetworkLatency;
        if (latencyResult?.success && latencyResult.average > 1000) {
            issues.push(`High network latency: ${latencyResult.average}ms average`);
            recommendations.push('Check network connection and server performance');
        }
        
        console.log('🔍 Issues Found:', issues.length === 0 ? 'None' : issues);
        console.log('💡 Recommendations:', recommendations.length === 0 ? 'None' : recommendations);
        console.log('📈 Full Results:', results);
        
        console.groupEnd();
        
        return { issues, recommendations, results };
    }
}

// Export singleton instances
export const requestInterceptor = new RequestInterceptor();
export const connectivityDiagnostics = new ConnectivityDiagnostics();

// Auto-start in development mode
if (process.env.NODE_ENV === 'development') {
    requestInterceptor.start();
}