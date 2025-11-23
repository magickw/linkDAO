import React from 'react';

interface ProgressIndicatorProps {
  progress: number; // 0-100
  status: 'idle' | 'loading' | 'success' | 'error';
  message?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'linear' | 'circular';
  className?: string;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  progress,
  status,
  message,
  showPercentage = true,
  size = 'md',
  variant = 'linear',
  className = ''
}) => {
  const sizeClasses = {
    sm: variant === 'linear' ? 'h-2' : 'w-8 h-8',
    md: variant === 'linear' ? 'h-3' : 'w-12 h-12',
    lg: variant === 'linear' ? 'h-4' : 'w-16 h-16'
  };

  const statusColors = {
    idle: 'bg-gray-200',
    loading: 'bg-blue-500',
    success: 'bg-green-500',
    error: 'bg-red-500'
  };

  const statusTextColors = {
    idle: 'text-gray-600',
    loading: 'text-blue-600',
    success: 'text-green-600',
    error: 'text-red-600'
  };

  if (variant === 'circular') {
    const circumference = 2 * Math.PI * 16; // radius = 16
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
      <div className={`flex flex-col items-center space-y-2 ${className}`}>
        <div className={`relative ${sizeClasses[size]}`}>
          <svg className="transform -rotate-90 w-full h-full" viewBox="0 0 36 36">
            <circle
              cx="18"
              cy="18"
              r="16"
              fill="none"
              className="stroke-gray-200"
              strokeWidth="2"
            />
            <circle
              cx="18"
              cy="18"
              r="16"
              fill="none"
              className={`${statusColors[status].replace('bg-', 'stroke-')} transition-all duration-300`}
              strokeWidth="2"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          {showPercentage && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-xs font-medium ${statusTextColors[status]}`}>
                {Math.round(progress)}%
              </span>
            </div>
          )}
        </div>
        {message && (
          <div className={`text-sm ${statusTextColors[status]} text-center`}>
            {message}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        {message && (
          <span className={`text-sm font-medium ${statusTextColors[status]}`}>
            {message}
          </span>
        )}
        {showPercentage && (
          <span className={`text-sm ${statusTextColors[status]}`}>
            {Math.round(progress)}%
          </span>
        )}
      </div>
      <div className={`w-full ${statusColors.idle} rounded-full ${sizeClasses[size]}`}>
        <div
          className={`${statusColors[status]} ${sizeClasses[size]} rounded-full transition-all duration-300 ease-out`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

// Upload Progress Component
export const UploadProgress: React.FC<{
  files: Array<{
    name: string;
    progress: number;
    status: 'uploading' | 'processing' | 'complete' | 'error';
    error?: string;
  }>;
  className?: string;
}> = ({ files, className = '' }) => {
  const getStatusMessage = (file: any) => {
    switch (file.status) {
      case 'uploading':
        return 'Uploading...';
      case 'processing':
        return 'Processing image...';
      case 'complete':
        return 'Upload complete';
      case 'error':
        return file.error || 'Upload failed';
      default:
        return '';
    }
  };

  const getStatusType = (status: string) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return 'loading';
      case 'complete':
        return 'success';
      case 'error':
        return 'error';
      default:
        return 'idle';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {files.map((file, index) => (
        <div key={index} className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 truncate">
              {file.name}
            </span>
            <span className="text-xs text-gray-500">
              {file.progress}%
            </span>
          </div>
          <ProgressIndicator
            progress={file.progress}
            status={getStatusType(file.status) as any}
            message={getStatusMessage(file)}
            showPercentage={false}
            size="small"
          />
        </div>
      ))}
    </div>
  );
};

// Transaction Progress Component
export const TransactionProgress: React.FC<{
  steps: Array<{
    label: string;
    status: 'pending' | 'active' | 'complete' | 'error';
    description?: string;
  }>;
  className?: string;
}> = ({ steps, className = '' }) => {
  const getStepIcon = (status: string, index: number) => {
    switch (status) {
      case 'complete':
        return (
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'active':
        return (
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
          </div>
        );
      case 'error':
        return (
          <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-gray-600">{index + 1}</span>
          </div>
        );
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {steps.map((step, index) => (
        <div key={index} className="flex items-start space-x-3">
          {getStepIcon(step.status, index)}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className={`text-sm font-medium ${
                step.status === 'complete' ? 'text-green-600' :
                step.status === 'active' ? 'text-blue-600' :
                step.status === 'error' ? 'text-red-600' :
                'text-gray-500'
              }`}>
                {step.label}
              </span>
              {step.status === 'active' && (
                <div className="flex space-x-1">
                  <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" />
                  <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              )}
            </div>
            {step.description && (
              <p className="text-xs text-gray-500 mt-1">{step.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};