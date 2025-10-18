import React, { useState, useEffect } from 'react';

export interface HelpTip {
  id: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  trigger: 'hover' | 'click' | 'focus';
  category: 'navigation' | 'feature' | 'workflow' | 'troubleshooting';
}

interface ContextualHelpProps {
  target: string;
  tips: HelpTip[];
  className?: string;
}

export const ContextualHelp: React.FC<ContextualHelpProps> = ({
  target,
  tips,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentTip, setCurrentTip] = useState<HelpTip | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const targetElement = document.querySelector(target);
    if (!targetElement || tips.length === 0) return;

    const showHelp = (tip: HelpTip) => {
      const rect = targetElement.getBoundingClientRect();
      let top = rect.top;
      let left = rect.left;

      switch (tip.position) {
        case 'top':
          top = rect.top - 10;
          left = rect.left + rect.width / 2;
          break;
        case 'bottom':
          top = rect.bottom + 10;
          left = rect.left + rect.width / 2;
          break;
        case 'left':
          top = rect.top + rect.height / 2;
          left = rect.left - 10;
          break;
        case 'right':
          top = rect.top + rect.height / 2;
          left = rect.right + 10;
          break;
      }

      setPosition({ top, left });
      setCurrentTip(tip);
      setIsVisible(true);
    };

    const hideHelp = () => {
      setIsVisible(false);
      setCurrentTip(null);
    };

    // Set up event listeners based on trigger types
    tips.forEach(tip => {
      switch (tip.trigger) {
        case 'hover':
          targetElement.addEventListener('mouseenter', () => showHelp(tip));
          targetElement.addEventListener('mouseleave', hideHelp);
          break;
        case 'click':
          targetElement.addEventListener('click', () => showHelp(tip));
          break;
        case 'focus':
          targetElement.addEventListener('focus', () => showHelp(tip));
          targetElement.addEventListener('blur', hideHelp);
          break;
      }
    });

    return () => {
      tips.forEach(tip => {
        switch (tip.trigger) {
          case 'hover':
            targetElement.removeEventListener('mouseenter', () => showHelp(tip));
            targetElement.removeEventListener('mouseleave', hideHelp);
            break;
          case 'click':
            targetElement.removeEventListener('click', () => showHelp(tip));
            break;
          case 'focus':
            targetElement.removeEventListener('focus', () => showHelp(tip));
            targetElement.removeEventListener('blur', hideHelp);
            break;
        }
      });
    };
  }, [target, tips]);

  if (!isVisible || !currentTip || !position) {
    return null;
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'navigation': return '🧭';
      case 'feature': return '⚙️';
      case 'workflow': return '🔄';
      case 'troubleshooting': return '🔧';
      default: return '💡';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'navigation': return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'feature': return 'bg-green-50 border-green-200 text-green-800';
      case 'workflow': return 'bg-purple-50 border-purple-200 text-purple-800';
      case 'troubleshooting': return 'bg-orange-50 border-orange-200 text-orange-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <div
      className={`fixed z-50 max-w-xs bg-white border border-gray-200 rounded-lg shadow-lg ${className}`}
      style={{
        top: position.top,
        left: position.left,
        transform: 'translate(-50%, -50%)'
      }}
    >
      {/* Arrow */}
      <div
        className={`absolute w-3 h-3 bg-white border-gray-200 transform rotate-45 ${
          currentTip.position === 'top' ? 'bottom-[-6px] border-b border-r' :
          currentTip.position === 'bottom' ? 'top-[-6px] border-t border-l' :
          currentTip.position === 'left' ? 'right-[-6px] border-r border-b' :
          'left-[-6px] border-l border-t'
        }`}
        style={{
          left: currentTip.position === 'top' || currentTip.position === 'bottom' ? '50%' : undefined,
          top: currentTip.position === 'left' || currentTip.position === 'right' ? '50%' : undefined,
          marginLeft: currentTip.position === 'top' || currentTip.position === 'bottom' ? '-6px' : undefined,
          marginTop: currentTip.position === 'left' || currentTip.position === 'right' ? '-6px' : undefined
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getCategoryIcon(currentTip.category)}</span>
          <h4 className="font-medium text-gray-900">{currentTip.title}</h4>
        </div>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getCategoryColor(currentTip.category)}`}>
          {currentTip.category}
        </span>
      </div>

      {/* Content */}
      <div className="p-3">
        <p className="text-sm text-gray-700">{currentTip.content}</p>
      </div>

      {/* Footer */}
      <div className="px-3 pb-3">
        <button
          onClick={() => setIsVisible(false)}
          className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};

// Hook for managing contextual help
export const useContextualHelp = () => {
  const [helpEnabled, setHelpEnabled] = useState(() => {
    const saved = localStorage.getItem('admin-contextual-help-enabled');
    return saved ? JSON.parse(saved) : true;
  });

  const [dismissedTips, setDismissedTips] = useState<string[]>(() => {
    const saved = localStorage.getItem('admin-dismissed-help-tips');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('admin-contextual-help-enabled', JSON.stringify(helpEnabled));
  }, [helpEnabled]);

  useEffect(() => {
    localStorage.setItem('admin-dismissed-help-tips', JSON.stringify(dismissedTips));
  }, [dismissedTips]);

  const dismissTip = (tipId: string) => {
    setDismissedTips(prev => [...prev, tipId]);
  };

  const resetDismissedTips = () => {
    setDismissedTips([]);
  };

  const toggleHelp = () => {
    setHelpEnabled((prev: boolean) => !prev);
  };

  return {
    helpEnabled,
    dismissedTips,
    dismissTip,
    resetDismissedTips,
    toggleHelp
  };
};

// Predefined help tips for common admin elements
export const adminHelpTips = {
  dashboard: [
    {
      id: 'dashboard-widgets',
      title: 'Dashboard Widgets',
      content: 'Drag widgets to rearrange them, click + to add new ones, or × to remove them.',
      position: 'bottom' as const,
      trigger: 'hover' as const,
      category: 'feature' as const
    }
  ],
  moderation: [
    {
      id: 'moderation-queue',
      title: 'Moderation Queue',
      content: 'Items are sorted by priority. Use AI recommendations to guide your decisions.',
      position: 'right' as const,
      trigger: 'hover' as const,
      category: 'workflow' as const
    },
    {
      id: 'ai-recommendations',
      title: 'AI Assistant',
      content: 'Review AI risk scores and recommendations, but always use your judgment.',
      position: 'left' as const,
      trigger: 'hover' as const,
      category: 'feature' as const
    }
  ],
  analytics: [
    {
      id: 'report-builder',
      title: 'Report Builder',
      content: 'Drag components to create custom reports. Save templates for reuse.',
      position: 'top' as const,
      trigger: 'click' as const,
      category: 'feature' as const
    }
  ],
  navigation: [
    {
      id: 'sidebar-navigation',
      title: 'Navigation',
      content: 'Use the sidebar to access different admin sections. Collapse it for more space.',
      position: 'right' as const,
      trigger: 'hover' as const,
      category: 'navigation' as const
    }
  ]
};

// Component for help toggle button
export const HelpToggle: React.FC = () => {
  const { helpEnabled, toggleHelp } = useContextualHelp();

  return (
    <button
      onClick={toggleHelp}
      className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
        helpEnabled
          ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
      title={helpEnabled ? 'Disable contextual help' : 'Enable contextual help'}
    >
      <span>{helpEnabled ? '💡' : '💡'}</span>
      <span>Help Tips</span>
      {helpEnabled && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-200 text-blue-800">
          ON
        </span>
      )}
    </button>
  );
};