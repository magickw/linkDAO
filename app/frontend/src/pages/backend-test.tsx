import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';

interface BackendTestResult {
  test: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: any;
  duration?: number;
}

export default function BackendTest() {
  const [tests, setTests] = useState<BackendTestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [backendUrl, setBackendUrl] = useState('');

  useEffect(() => {
    setBackendUrl(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3002');
  }, []);

  const updateTest = (testName: string, updates: Partial<BackendTestResult>) => {
    setTests(prev => prev.map(test => 
      test.test === testName ? { ...test, ...updates } : test
    ));
  };

  const addTest = (test: BackendTestResult) => {
    setTests(prev => [...prev, test]);
  };

  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    const startTime = Date.now();
    updateTest(testName, { status: 'pending' });
    
    try {
      const result = await testFn();
      const duration = Date.now() - startTime;
      updateTest(testName, {
        status: 'success',
        message: 'Test passed',
        details: result,
        duration
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      updateTest(testName, {
        status: 'error',
        message: error.message || 'Test failed',
        details: error,
        duration
      });
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTests([]);

    // Initialize all tests
    const testList = [
      'Environment Variables',
      'Basic Connectivity',
      'CORS Check',
      'Health Check',
      'Auth Endpoint',
      'API Endpoints',
      'WebSocket Connection'
    ];

    testList.forEach(testName => {
      addTest({
        test: testName,
        status: 'pending',
        message: 'Waiting to run...'
      });
    });

    // Test 1: Environment Variables
    await runTest('Environment Variables', async () => {
      const envVars = {
        NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
        NODE_ENV: process.env.NODE_ENV
      };
      
      if (!envVars.NEXT_PUBLIC_BACKEND_URL) {
        throw new Error('NEXT_PUBLIC_BACKEND_URL is not set');
      }
      
      return envVars;
    });

    // Test 2: Basic Connectivity
    await runTest('Basic Connectivity', async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      try {
        const response = await fetch(backendUrl, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
          }
        });
        
        clearTimeout(timeoutId);
        
        return {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          url: response.url
        };
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error('Request timed out after 10 seconds');
        }
        throw error;
      }
    });

    // Test 3: CORS Check
    await runTest('CORS Check', async () => {
      const response = await fetch(`${backendUrl}/api/health`, {
        method: 'OPTIONS',
        headers: {
          'Origin': window.location.origin,
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      });
      
      const corsHeaders = {
        'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
        'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
        'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers')
      };
      
      return corsHeaders;
    });

    // Test 4: Health Check
    await runTest('Health Check', async () => {
      const response = await fetch(`${backendUrl}/api/health`);
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    });

    // Test 5: Auth Endpoint
    await runTest('Auth Endpoint', async () => {
      const testAddress = '0x1234567890123456789012345678901234567890';
      const response = await fetch(`${backendUrl}/api/auth/nonce/${testAddress}`);
      
      if (!response.ok) {
        throw new Error(`Auth endpoint failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    });

    // Test 6: API Endpoints
    await runTest('API Endpoints', async () => {
      const endpoints = [
        '/api/posts',
        '/api/communities',
        '/api/profiles'
      ];
      
      const results = await Promise.allSettled(
        endpoints.map(async endpoint => {
          const response = await fetch(`${backendUrl}${endpoint}`);
          return {
            endpoint,
            status: response.status,
            ok: response.ok
          };
        })
      );
      
      return results.map((result, index) => ({
        endpoint: endpoints[index],
        status: result.status === 'fulfilled' ? 'success' : 'error',
        data: result.status === 'fulfilled' ? result.value : result.reason
      }));
    });

    // Test 7: WebSocket Connection
    await runTest('WebSocket Connection', async () => {
      return new Promise((resolve, reject) => {
        const wsUrl = backendUrl.replace('http', 'ws');
        const ws = new WebSocket(wsUrl);
        
        const timeout = setTimeout(() => {
          ws.close();
          reject(new Error('WebSocket connection timed out'));
        }, 5000);
        
        ws.onopen = () => {
          clearTimeout(timeout);
          ws.close();
          resolve({ status: 'connected', url: wsUrl });
        };
        
        ws.onerror = (error) => {
          clearTimeout(timeout);
          reject(new Error('WebSocket connection failed'));
        };
      });
    });

    setIsRunning(false);
  };

  const getStatusColor = (status: BackendTestResult['status']) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-100';
      case 'error': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: BackendTestResult['status']) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'pending': return '⏳';
      default: return '⚪';
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Backend Connectivity Test</h1>
            
            {/* Configuration Info */}
            <div className="mb-8 p-4 bg-blue-50 rounded-lg">
              <h2 className="text-lg font-semibold text-blue-900 mb-2">Configuration</h2>
              <div className="space-y-1 text-sm">
                <p><strong>Backend URL:</strong> {backendUrl}</p>
                <p><strong>Environment:</strong> {process.env.NODE_ENV}</p>
                <p><strong>Frontend URL:</strong> {typeof window !== 'undefined' ? window.location.origin : 'Unknown'}</p>
              </div>
            </div>

            {/* Test Controls */}
            <div className="mb-8">
              <button
                onClick={runAllTests}
                disabled={isRunning}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRunning ? 'Running Tests...' : 'Run All Tests'}
              </button>
            </div>

            {/* Test Results */}
            <div className="space-y-4">
              {tests.map((test, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">{getStatusIcon(test.status)}</span>
                      <h3 className="text-lg font-semibold">{test.test}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(test.status)}`}>
                        {test.status}
                      </span>
                    </div>
                    {test.duration && (
                      <span className="text-sm text-gray-500">{test.duration}ms</span>
                    )}
                  </div>
                  
                  <p className="text-gray-700 mb-2">{test.message}</p>
                  
                  {test.details && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800">
                        Show Details
                      </summary>
                      <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
                        {JSON.stringify(test.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>

            {/* Troubleshooting Guide */}
            <div className="mt-12 p-6 bg-yellow-50 rounded-lg">
              <h2 className="text-xl font-semibold text-yellow-900 mb-4">Troubleshooting Guide</h2>
              <div className="space-y-3 text-sm text-yellow-800">
                <div>
                  <strong>If Basic Connectivity fails:</strong>
                  <ul className="list-disc list-inside ml-4 mt-1">
                    <li>Check if your Render backend service is running</li>
                    <li>Verify the backend URL is correct</li>
                    <li>Check Render service logs for errors</li>
                  </ul>
                </div>
                <div>
                  <strong>If CORS Check fails:</strong>
                  <ul className="list-disc list-inside ml-4 mt-1">
                    <li>Backend needs to allow your Vercel domain in CORS settings</li>
                    <li>Check backend CORS configuration</li>
                    <li>Ensure frontend domain is whitelisted</li>
                  </ul>
                </div>
                <div>
                  <strong>If Health Check fails:</strong>
                  <ul className="list-disc list-inside ml-4 mt-1">
                    <li>Backend may not have a /api/health endpoint</li>
                    <li>Backend service might be starting up (Render cold start)</li>
                    <li>Check backend service status on Render dashboard</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold mb-3">Quick Actions</h3>
              <div className="space-x-4">
                <a
                  href={backendUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Open Backend URL
                </a>
                <a
                  href={`${backendUrl}/api/health`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Check Health Endpoint
                </a>
                <button
                  onClick={() => window.open('https://dashboard.render.com', '_blank')}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                >
                  Open Render Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}