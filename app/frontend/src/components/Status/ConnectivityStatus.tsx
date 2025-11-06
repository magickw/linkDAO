import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface ConnectivityStatusProps {
  className?: string;
  showDetails?: boolean;
}

interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  responseTime?: number;
  lastCheck: Date;
}

export const ConnectivityStatus: React.FC<ConnectivityStatusProps> = ({
  className = '',
  showDetails = false
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [backendStatus, setBackendStatus] = useState<'connected' | 'degraded' | 'disconnected' | 'checking'>('checking');
  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [lastCheck, setLastCheck] = useState<Date>(new Date());

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const checkBackendHealth = async () => {
      if (!isOnline) {
        setBackendStatus('disconnected');
        return;
      }

      setBackendStatus('checking');
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch('/api/health', {
          signal: controller.signal,
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const healthData = await response.json();
          setBackendStatus('connected');
          
          if (healthData.services) {
            setServices(healthData.services.map((service: any) => ({
              ...service,
              lastCheck: new Date(service.lastCheck)
            })));
          }
        } else if (response.status >= 500) {
          setBackendStatus('degraded');
        } else {
          setBackendStatus('disconnected');
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          setBackendStatus('degraded');
        } else {
          setBackendStatus('disconnected');
        }
      }
      
      setLastCheck(new Date());
    };

    // Initial check
    checkBackendHealth();

    // Periodic health checks
    const interval = setInterval(checkBackendHealth, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [isOnline]);

  const getStatusIcon = () => {
    if (!isOnline) {
      return <WifiOff className="h-4 w-4 text-red-500" />;
    }

    switch (backendStatus) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'disconnected':
        return <WifiOff className="h-4 w-4 text-red-500" />;
      case 'checking':
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
      default:
        return <Wifi className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    if (!isOnline) {
      return 'Offline';
    }

    switch (backendStatus) {
      case 'connected':
        return 'Connected';
      case 'degraded':
        return 'Degraded';
      case 'disconnected':
        return 'Disconnected';
      case 'checking':
        return 'Checking...';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = () => {
    if (!isOnline || backendStatus === 'disconnected') {
      return 'text-red-600 bg-red-50 border-red-200';
    }

    switch (backendStatus) {
      case 'connected':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'checking':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!showDetails) {
    return (
      <div className={`inline-flex items-center space-x-2 px-2 py-1 rounded-md border ${getStatusColor()} ${className}`}>
        {getStatusIcon()}
        <span className="text-sm font-medium">{getStatusText()}</span>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-lg border ${getStatusColor()} ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className="font-medium">{getStatusText()}</span>
        </div>
        <span className="text-xs opacity-75">
          Last check: {formatTime(lastCheck)}
        </span>
      </div>

      {!isOnline && (
        <div className="mb-3 p-2 bg-red-100 border border-red-200 rounded text-sm">
          <p className="font-medium">You're offline</p>
          <p className="text-xs mt-1">Some features may not work until you reconnect.</p>
        </div>
      )}

      {backendStatus === 'degraded' && (
        <div className="mb-3 p-2 bg-yellow-100 border border-yellow-200 rounded text-sm">
          <p className="font-medium">Service degraded</p>
          <p className="text-xs mt-1">Some features may be slower than usual.</p>
        </div>
      )}

      {backendStatus === 'disconnected' && isOnline && (
        <div className="mb-3 p-2 bg-red-100 border border-red-200 rounded text-sm">
          <p className="font-medium">Backend unavailable</p>
          <p className="text-xs mt-1">Using cached data where possible.</p>
        </div>
      )}

      {services.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">Service Status</h4>
          <div className="space-y-1">
            {services.map((service) => (
              <div key={service.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    service.status === 'healthy' ? 'bg-green-500' :
                    service.status === 'degraded' ? 'bg-yellow-500' :
                    service.status === 'unhealthy' ? 'bg-red-500' :
                    'bg-gray-500'
                  }`} />
                  <span className="capitalize">{service.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="capitalize">{service.status}</span>
                  {service.responseTime && (
                    <span className="opacity-75">({service.responseTime}ms)</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectivityStatus;