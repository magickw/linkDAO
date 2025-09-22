import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';

interface DebugResult {
  test: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: any;
  timestamp?: string;
}

export default function BackendDebug() {
  const [results, setResults] = useState<DebugResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [backendUrl, setBackendUrl] = useState('');

  useEffect(() => {
    setBackendUrl(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000');
  }, []);

  const addResult = (result: DebugResult) => {
    setResults(prev => [...prev, { ...result, timestamp: new Date().toISOString() }]);
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults([]);

    // Test 1: Check if backend URL is reachable
    addResult({ test: 'Backend URL Check', status: 'pending', message: 'Testing backend URL...' });
    
    try {
      const response = await fetch(backendUrl, { 
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        addResult({ 
          test: 'Backend URL Check', 
          status: 'success', 
          message: 'Backend is reachable', 
          details: { status: response.status, data } 
        });
      } else {
        addResult({ 
          test: 'Backend URL Check', 
          status: 'error', 
          message: `Backend returned ${response.status}: ${response.statusText}`, 
          details: { status: response.status, statusText: response.statusText } 
        });
      }
    } catch (error: any) {
      addResult({ 
        test: 'Backend URL Check', 
        status: 'error', 
        message: `Failed to reach backend: ${error.message}`, 
        details: error 
      });
    }

    // Test 2: Check health endpoint
    addResult({ test: 'Health Endpoint', status: 'pending', message: 'Testing /health endpoint...' });
    
    try {
      const response = await fetch(`${backendUrl}/health`, { 
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        addResult({ 
          test: 'Health Endpoint', 
          status: 'success', 
          message: 'Health endpoint is working', 
          details: data 
        });
      } else {
        addResult({ 
          test: 'Health Endpoint', 
          status: 'error', 
          message: `Health endpoint returned ${response.status}: ${response.statusText}`, 
          details: { status: response.status, statusText: response.statusText } 
        });
      }
    } catch (error: any) {
      addResult({ 
        test: 'Health Endpoint', 
        status: 'error', 
        message: `Health endpoint failed: ${error.message}`, 
        details: error 
      });
    }

    // Test 3: Check API health endpoint
    addResult({ test: 'API Health Endpoint', status: 'pending', message: 'Testing /api/health endpoint...' });
    
    try {
      const response = await fetch(`${backendUrl}/api/health`, { 
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        addResult({ 
          test: 'API Health Endpoint', 
          status: 'success', 
          message: 'API health endpoint is working', 
          details: data 
        });
      } else {
        addResult({ 
          test: 'API Health Endpoint', 
          status: 'error', 
          message: `API health endpoint returned ${response.status}: ${response.statusText}`, 
          details: { status: response.status, statusText: response.statusText } 
        });
      }
    } catch (error: any) {
      addResult({ 
        test: 'API Health Endpoint', 
        status: 'error', 
        message: `API health endpoint failed: ${error.message}`, 
        details: error 
      });
    }

    // Test 4: Check marketplace listings endpoint (the one that's failing)
    addResult({ test: 'Marketplace Listings', status: 'pending', message: 'Testing marketplace listings...' });
    
    try {
      const response = await fetch(`${backendUrl}/api/marketplace/listings`, { 
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        addResult({ 
          test: 'Marketplace Listings', 
          status: 'success', 
          message: 'Marketplace listings endpoint is working', 
          details: data 
        });
      } else {
        addResult({ 
          test: 'Marketplace Listings', 
          status: 'error', 
          message: `Marketplace listings returned ${response.status}: ${response.statusText}`, 
          details: { status: response.status, statusText: response.statusText } 
        });
      }
    } catch (error: any) {
      addResult({ 
        test: 'Marketplace Listings', 
        status: 'error', 
        message: `Marketplace listings failed: ${error.message}`, 
        details: error 
      });
    }

    // Test 5: Check if it's a CORS issue
    addResult({ test: 'CORS Test', status: 'pending', message: 'Testing CORS configuration...' });
    
    try {
      const response = await fetch(`${backendUrl}/api/health`, { 
        method: 'OPTIONS',
        mode: 'cors',
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
      
      addResult({ 
        test: 'CORS Test', 
        status: response.ok ? 'success' : 'error', 
        message: response.ok ? 'CORS is configured' : 'CORS configuration issue', 
        details: corsHeaders 
      });
    } catch (error: any) {
      addResult({ 
        test: 'CORS Test', 
        status: 'error', 
        message: `CORS test failed: ${error.message}`, 
        details: error 
      });
    }

    setIsRunning(false);
  };

  const getStatusColor = (status: DebugResult['status']) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-100';
      case 'error': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: DebugResult['status']) => {
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
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Backend Debug & Diagnostics</h1>
            
            {/* Current Configuration */}
            <div className="mb-8 p-4 bg-blue-50 rounded-lg">
              <h2 className="text-lg font-semibold text-blue-900 mb-2">Current Configuration</h2>
              <div className="space-y-1 text-sm">
                <p><strong>Backend URL:</strong> {backendUrl}</p>
                <p><strong>Frontend URL:</strong> {typeof window !== 'undefined' ? window.location.origin : 'Unknown'}</p>
                <p><strong>Environment:</strong> {process.env.NODE_ENV}</p>
                <p><strong>Time:</strong> {new Date().toISOString()}</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mb-8 flex flex-wrap gap-4">
              <button
                onClick={runDiagnostics}
                disabled={isRunning}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRunning ? 'Running Diagnostics...' : 'Run Full Diagnostics'}
              </button>
              
              <a
                href={backendUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Open Backend URL
              </a>
              
              <a
                href="https://dashboard.render.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Open Render Dashboard
              </a>
            </div>

            {/* Diagnostic Results */}
            <div className="space-y-4">
              {results.map((result, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">{getStatusIcon(result.status)}</span>
                      <h3 className="text-lg font-semibold">{result.test}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(result.status)}`}>
                        {result.status}
                      </span>
                    </div>
                    {result.timestamp && (
                      <span className="text-sm text-gray-500">
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-gray-700 mb-2">{result.message}</p>
                  
                  {result.details && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800">
                        Show Details
                      </summary>
                      <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>

            {/* Troubleshooting Guide */}
            <div className="mt-12 p-6 bg-red-50 rounded-lg">
              <h2 className="text-xl font-semibold text-red-900 mb-4">503 Error Troubleshooting</h2>
              <div className="space-y-3 text-sm text-red-800">
                <div>
                  <strong>503 Service Unavailable means:</strong>
                  <ul className="list-disc list-inside ml-4 mt-1">
                    <li>Your Render service is not running or crashed</li>
                    <li>The service is starting up (cold start)</li>
                    <li>The service ran out of memory or resources</li>
                    <li>There's an error in your backend code preventing startup</li>
                  </ul>
                </div>
                <div>
                  <strong>Immediate Actions:</strong>
                  <ul className="list-disc list-inside ml-4 mt-1">
                    <li>Check Render dashboard for service status</li>
                    <li>Look at Render logs for error messages</li>
                    <li>Try manually restarting the service</li>
                    <li>Verify environment variables are set correctly</li>
                  </ul>
                </div>
                <div>
                  <strong>If service won't start:</strong>
                  <ul className="list-disc list-inside ml-4 mt-1">
                    <li>Check if package.json start script is correct</li>
                    <li>Verify all dependencies are installed</li>
                    <li>Look for syntax errors in backend code</li>
                    <li>Check if the port is configured correctly (10000)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Backend Status Indicators */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Expected Status</h3>
                <p className="text-sm text-gray-600">✅ 200 OK responses</p>
                <p className="text-sm text-gray-600">✅ JSON data returned</p>
                <p className="text-sm text-gray-600">✅ CORS headers present</p>
              </div>
              
              <div className="p-4 bg-red-50 rounded-lg">
                <h3 className="font-semibold text-red-900 mb-2">Current Issue</h3>
                <p className="text-sm text-red-600">❌ 503 Service Unavailable</p>
                <p className="text-sm text-red-600">❌ Backend not responding</p>
                <p className="text-sm text-red-600">❌ Service likely crashed</p>
              </div>
              
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Next Steps</h3>
                <p className="text-sm text-blue-600">1. Check Render logs</p>
                <p className="text-sm text-blue-600">2. Restart service</p>
                <p className="text-sm text-blue-600">3. Deploy fixed backend</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}