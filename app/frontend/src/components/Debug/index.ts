// Debug Components and Utilities Export
export { default as MonitoringDashboard } from './MonitoringDashboard';
export { default as DebugToggle } from './DebugToggle';

// Re-export debug utilities
export { requestInterceptor, connectivityDiagnostics } from '../../utils/debugTools';
export { default as useDebugMonitoring } from '../../hooks/useDebugMonitoring';

// Types for TypeScript support
export interface DebugMonitoringState {
  isActive: boolean;
  connectivity: {
    status: 'online' | 'degraded' | 'offline' | 'unknown';
    lastCheck: number | null;
  };
  performance: {
    totalRequests: number;
    recentRequests: number;
    recentErrors: number;
    errorRate: number;
    avgResponseTime: number;
    uptime: number;
  };
  circuitBreakers: Record<string, any>;
  recentRequests: Array<{
    id: string;
    method: string;
    url: string;
    status?: number;
    duration?: number;
    timestamp: string;
  }>;
}

export interface DiagnosticResult {
  success: boolean;
  error?: string;
  duration?: number;
  status?: number;
  [key: string]: any;
}

export interface ConnectivityDiagnosticResults {
  testBasicConnectivity: DiagnosticResult;
  testCORSConfiguration: Record<string, DiagnosticResult>;
  testAPIEndpoints: Record<string, DiagnosticResult>;
  testWebSocketConnection: DiagnosticResult;
  testNetworkLatency: DiagnosticResult;
  testDNSResolution: Record<string, DiagnosticResult>;
}

// Global debug API interface
declare global {
  interface Window {
    debugLinkDAO: {
      testBackendConnection: () => Promise<boolean>;
      testPostsAPI: () => Promise<boolean>;
      testCreatePost: () => Promise<boolean>;
      testEnvironmentVariables: () => boolean;
      runAllTests: () => Promise<Record<string, boolean>>;
      monitoring: {
        getRequestLog: () => any[];
        clearRequestLog: () => void;
        getPerformanceMetrics: () => any;
        getPerformanceSummary: () => any;
        getRateLimitAnalysis: () => any;
        getRateLimitViolations: () => any[];
        getCircuitBreakerStates: () => Record<string, any>;
        getCircuitBreakerHistory: () => any[];
        getConnectivityStatus: () => any;
        startConnectivityMonitoring: () => void;
        stopConnectivityMonitoring: () => void;
        analyzeRequestPatterns: () => Record<string, any>;
        diagnoseConnectivityIssues: () => any;
        getDashboardData: () => any;
      };
    };
    debugMonitoringAPI: {
      circuitBreakerMonitor: any;
      rateLimitAnalyzer: any;
      performanceCollector: any;
      connectivityMonitor: any;
      getRequestLog: () => any[];
      getRealtimeData: () => any;
      addEventListener: (event: string, callback: Function) => void;
    };
  }
}

export {};