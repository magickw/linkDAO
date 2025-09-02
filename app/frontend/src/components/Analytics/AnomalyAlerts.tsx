import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassPanel } from '../../design-system/components/GlassPanel';

interface AnomalyAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: Date;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  affectedEntity?: string;
  confidence?: number;
  suggestedActions?: string[];
}

interface AnomalyAlertsProps {
  anomalies: AnomalyAlert[];
  onDismiss?: (id: string) => void;
  onViewDetails?: (anomaly: AnomalyAlert) => void;
}

export const AnomalyAlerts: React.FC<AnomalyAlertsProps> = ({
  anomalies,
  onDismiss,
  onViewDetails
}) => {
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);

  const visibleAnomalies = anomalies.filter(anomaly => !dismissedAlerts.has(anomaly.id));

  const handleDismiss = (id: string) => {
    setDismissedAlerts(prev => new Set([...prev, id]));
    onDismiss?.(id);
  };

  const getAlertIcon = (type: string, severity?: string) => {
    if (severity === 'critical') return '🚨';
    
    switch (type) {
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  const getAlertColor = (type: string, severity?: string) => {
    if (severity === 'critical') return 'border-red-500 bg-red-500/10';
    
    switch (type) {
      case 'error':
        return 'border-red-400 bg-red-400/10';
      case 'warning':
        return 'border-yellow-400 bg-yellow-400/10';
      case 'info':
      default:
        return 'border-blue-400 bg-blue-400/10';
    }
  };

  const getSeverityBadge = (severity?: string) => {
    if (!severity) return null;

    const colors = {
      low: 'bg-green-500/20 text-green-400 border-green-500/30',
      medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      critical: 'bg-red-500/20 text-red-400 border-red-500/30'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded border ${colors[severity as keyof typeof colors]}`}>
        {severity.toUpperCase()}
      </span>
    );
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  if (visibleAnomalies.length === 0) {
    return null;
  }

  return (
    <GlassPanel className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          🔍 Anomaly Detection
          <span className="text-sm font-normal text-gray-300">
            ({visibleAnomalies.length} active)
          </span>
        </h3>
        
        {visibleAnomalies.length > 0 && (
          <button
            onClick={() => setDismissedAlerts(new Set(anomalies.map(a => a.id)))}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Dismiss All
          </button>
        )}
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {visibleAnomalies.map((anomaly) => (
            <motion.div
              key={anomaly.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className={`border rounded-lg p-4 ${getAlertColor(anomaly.type, anomaly.severity)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <span className="text-xl" role="img">
                    {getAlertIcon(anomaly.type, anomaly.severity)}
                  </span>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-white font-medium">{anomaly.message}</p>
                      {getSeverityBadge(anomaly.severity)}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-300">
                      <span>{formatTimestamp(anomaly.timestamp)}</span>
                      
                      {anomaly.affectedEntity && (
                        <span>Entity: {anomaly.affectedEntity}</span>
                      )}
                      
                      {anomaly.confidence && (
                        <span>Confidence: {Math.round(anomaly.confidence * 100)}%</span>
                      )}
                    </div>

                    {/* Expandable Details */}
                    {anomaly.suggestedActions && anomaly.suggestedActions.length > 0 && (
                      <div className="mt-3">
                        <button
                          onClick={() => setExpandedAlert(
                            expandedAlert === anomaly.id ? null : anomaly.id
                          )}
                          className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          {expandedAlert === anomaly.id ? 'Hide' : 'Show'} Suggested Actions
                        </button>
                        
                        <AnimatePresence>
                          {expandedAlert === anomaly.id && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="mt-2 pl-4 border-l-2 border-blue-400/30"
                            >
                              <ul className="space-y-1 text-sm text-gray-300">
                                {anomaly.suggestedActions.map((action, index) => (
                                  <li key={index} className="flex items-start gap-2">
                                    <span className="text-blue-400 mt-1">•</span>
                                    <span>{action}</span>
                                  </li>
                                ))}
                              </ul>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {onViewDetails && (
                    <button
                      onClick={() => onViewDetails(anomaly)}
                      className="p-1 text-gray-400 hover:text-white transition-colors"
                      title="View Details"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleDismiss(anomaly.id)}
                    className="p-1 text-gray-400 hover:text-white transition-colors"
                    title="Dismiss"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {visibleAnomalies.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <p className="text-sm">No anomalies detected</p>
          <p className="text-xs text-gray-500 mt-1">System is operating normally</p>
        </div>
      )}
    </GlassPanel>
  );
};

export default AnomalyAlerts;