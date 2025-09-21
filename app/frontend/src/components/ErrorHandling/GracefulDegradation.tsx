import React from 'react';
import { AlertTriangle, Info, Settings, Zap } from 'lucide-react';

interface GracefulDegradationProps {
  feature: string;
  fallbackContent?: React.ReactNode;
  severity?: 'low' | 'medium' | 'high';
  showFallback?: boolean;
  onEnableFeature?: () => void;
  children?: React.ReactNode;
}

interface FeatureConfig {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  iconColor: string;
}

export const GracefulDegradation: React.FC<GracefulDegradationProps> = ({
  feature,
  fallbackContent,
  severity = 'medium',
  showFallback = true,
  onEnableFeature,
  children
}) => {
  const getFeatureConfig = (feature: string, severity: string): FeatureConfig => {
    const configs: Record<string, FeatureConfig> = {
      'web3-features': {
        icon: <Zap className="w-4 h-4" />,
        title: 'Web3 Features Unavailable',
        description: 'Blockchain features are currently unavailable. You can still browse and interact with posts.',
        actionText: 'Connect Wallet',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-800',
        iconColor: 'text-blue-500'
      },
      'governance': {
        icon: <Settings className="w-4 h-4" />,
        title: 'Governance Features Limited',
        description: 'Voting and governance features are temporarily unavailable. Community content is still accessible.',
        actionText: 'Learn More',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
        textColor: 'text-purple-800',
        iconColor: 'text-purple-500'
      },
      'real-time-updates': {
        icon: <Info className="w-4 h-4" />,
        title: 'Real-time Updates Disabled',
        description: 'Live updates are currently disabled. Please refresh the page to see new content.',
        actionText: 'Refresh',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        textColor: 'text-yellow-800',
        iconColor: 'text-yellow-500'
      },
      'notifications': {
        icon: <Info className="w-4 h-4" />,
        title: 'Notifications Unavailable',
        description: 'Push notifications are currently disabled. You can still receive updates by refreshing.',
        actionText: 'Enable Notifications',
        bgColor: 'bg-indigo-50',
        borderColor: 'border-indigo-200',
        textColor: 'text-indigo-800',
        iconColor: 'text-indigo-500'
      }
    };

    const defaultConfig: FeatureConfig = {
      icon: <AlertTriangle className="w-4 h-4" />,
      title: 'Feature Temporarily Unavailable',
      description: 'This feature is currently unavailable, but the rest of the application should work normally.',
      bgColor: severity === 'high' ? 'bg-red-50' : severity === 'medium' ? 'bg-yellow-50' : 'bg-gray-50',
      borderColor: severity === 'high' ? 'border-red-200' : severity === 'medium' ? 'border-yellow-200' : 'border-gray-200',
      textColor: severity === 'high' ? 'text-red-800' : severity === 'medium' ? 'text-yellow-800' : 'text-gray-800',
      iconColor: severity === 'high' ? 'text-red-500' : severity === 'medium' ? 'text-yellow-500' : 'text-gray-500'
    };

    return configs[feature] || defaultConfig;
  };

  const config = getFeatureConfig(feature, severity);

  // Check if feature should be hidden completely
  const shouldHide = severity === 'low' && !showFallback;
  if (shouldHide) {
    return <>{fallbackContent || null}</>;
  }

  // For high severity issues, show prominent warning
  if (severity === 'high') {
    return (
      <div className={`${config.bgColor} ${config.borderColor} border rounded-lg p-4 mb-4`}>
        <div className="flex items-start space-x-3">
          <div className={config.iconColor}>
            {config.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`text-sm font-medium ${config.textColor}`}>
              {config.title}
            </h3>
            <p className={`text-sm ${config.textColor} mt-1 opacity-90`}>
              {config.description}
            </p>
            {onEnableFeature && config.actionText && (
              <button
                onClick={onEnableFeature}
                className={`mt-2 inline-flex items-center px-3 py-1.5 text-xs font-medium ${config.textColor} bg-white hover:bg-gray-50 border ${config.borderColor} rounded-md transition-colors`}
              >
                {config.actionText}
              </button>
            )}
          </div>
        </div>
        {fallbackContent && (
          <div className="mt-4 pt-4 border-t border-current border-opacity-20">
            {fallbackContent}
          </div>
        )}
      </div>
    );
  }

  // For medium severity, show inline notice
  if (severity === 'medium') {
    return (
      <div className="space-y-4">
        <div className={`${config.bgColor} ${config.borderColor} border rounded-md p-3`}>
          <div className="flex items-center space-x-2">
            <div className={config.iconColor}>
              {config.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs ${config.textColor} font-medium`}>
                {config.title}
              </p>
              <p className={`text-xs ${config.textColor} opacity-90`}>
                {config.description}
              </p>
            </div>
            {onEnableFeature && config.actionText && (
              <button
                onClick={onEnableFeature}
                className={`text-xs font-medium ${config.textColor} hover:underline`}
              >
                {config.actionText}
              </button>
            )}
          </div>
        </div>
        {fallbackContent || children}
      </div>
    );
  }

  // For low severity, show minimal notice or just fallback
  return (
    <div className="space-y-2">
      {showFallback && (
        <div className={`${config.bgColor} ${config.borderColor} border rounded p-2`}>
          <div className="flex items-center space-x-2">
            <div className={`${config.iconColor} opacity-75`}>
              {config.icon}
            </div>
            <p className={`text-xs ${config.textColor} opacity-90`}>
              {config.description}
            </p>
            {onEnableFeature && config.actionText && (
              <button
                onClick={onEnableFeature}
                className={`text-xs font-medium ${config.textColor} hover:underline ml-auto`}
              >
                {config.actionText}
              </button>
            )}
          </div>
        </div>
      )}
      {fallbackContent || children}
    </div>
  );
};

export default GracefulDegradation;