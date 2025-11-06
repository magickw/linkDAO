import React from 'react';
import { useDebugMonitoring } from '../../hooks/useDebugMonitoring';
import MonitoringDashboard from './MonitoringDashboard';

interface DebugToggleProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  showInProduction?: boolean;
}

export const DebugToggle: React.FC<DebugToggleProps> = ({
  position = 'top-right',
  showInProduction = false
}) => {
  const {
    isActive,
    isDashboardVisible,
    connectivity,
    performance,
    toggleMonitoring,
    toggleDashboard,
    runDiagnostics,
    isEnabled
  } = useDebugMonitoring();

  // Don't render in production unless explicitly enabled
  if (!isEnabled && !showInProduction) {
    return null;
  }

  const getPositionStyles = () => {
    const baseStyles = {
      position: 'fixed' as const,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '8px'
    };

    switch (position) {
      case 'top-left':
        return { ...baseStyles, top: '10px', left: '10px' };
      case 'bottom-right':
        return { ...baseStyles, bottom: '10px', right: '10px' };
      case 'bottom-left':
        return { ...baseStyles, bottom: '10px', left: '10px' };
      default: // top-right
        return { ...baseStyles, top: '10px', right: isDashboardVisible ? '620px' : '10px' };
    }
  };

  const getStatusColor = () => {
    if (!isActive) return '#6c757d';
    
    switch (connectivity.status) {
      case 'online': return '#28a745';
      case 'degraded': return '#ffc107';
      case 'offline': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getStatusIcon = () => {
    if (!isActive) return '⚪';
    
    switch (connectivity.status) {
      case 'online': return '🟢';
      case 'degraded': return '🟡';
      case 'offline': return '🔴';
      default: return '⚪';
    }
  };

  return (
    <>
      <div style={getPositionStyles()}>
        {/* Main Debug Toggle Button */}
        <button
          onClick={toggleDashboard}
          style={{
            background: isActive ? getStatusColor() : '#6c757d',
            color: 'white',
            border: 'none',
            padding: '8px 12px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {getStatusIcon()} Debug
          {isActive && (
            <span style={{ 
              fontSize: '10px', 
              background: 'rgba(255, 255, 255, 0.2)', 
              padding: '2px 4px', 
              borderRadius: '3px' 
            }}>
              {performance.recentRequests}
            </span>
          )}
        </button>

        {/* Quick Action Buttons */}
        {isActive && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <button
              onClick={toggleMonitoring}
              style={{
                background: '#007bff',
                color: 'white',
                border: 'none',
                padding: '6px 10px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '10px',
                boxShadow: '0 1px 4px rgba(0, 0, 0, 0.2)'
              }}
              title={isActive ? 'Stop Monitoring' : 'Start Monitoring'}
            >
              {isActive ? '⏹️' : '▶️'}
            </button>
            
            <button
              onClick={runDiagnostics}
              style={{
                background: '#17a2b8',
                color: 'white',
                border: 'none',
                padding: '6px 10px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '10px',
                boxShadow: '0 1px 4px rgba(0, 0, 0, 0.2)'
              }}
              title="Run Diagnostics"
            >
              🔍
            </button>
          </div>
        )}
      </div>

      {/* Monitoring Dashboard */}
      <MonitoringDashboard
        isVisible={isDashboardVisible}
        onToggle={toggleDashboard}
      />
    </>
  );
};

export default DebugToggle;