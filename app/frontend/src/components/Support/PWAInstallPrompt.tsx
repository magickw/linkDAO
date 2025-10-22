/**
 * PWA Install Prompt Component
 * Provides progressive web app installation capabilities
 */

import React, { useState, useEffect } from 'react';
import {
  ArrowDownTrayIcon,
  XMarkIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  CloudArrowDownIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAInstallPromptProps {
  className?: string;
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({
  className = ''
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installMethod, setInstallMethod] = useState<'browser' | 'manual' | null>(null);

  useEffect(() => {
    // Check if already installed
    const checkInstallStatus = () => {
      // Check if running as PWA
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInWebAppiOS = (window.navigator as any).standalone === true;
      const isInstalled = isStandalone || isInWebAppiOS;
      
      setIsInstalled(isInstalled);
      
      // Don't show prompt if already installed
      if (isInstalled) {
        setShowPrompt(false);
        return;
      }
      
      // Show prompt after a delay if not installed
      const timer = setTimeout(() => {
        const hasSeenPrompt = localStorage.getItem('pwa-install-prompt-seen');
        const lastPromptTime = localStorage.getItem('pwa-install-prompt-time');
        
        // Show prompt if never seen or if it's been more than 7 days
        if (!hasSeenPrompt || 
            (lastPromptTime && Date.now() - parseInt(lastPromptTime) > 7 * 24 * 60 * 60 * 1000)) {
          setShowPrompt(true);
        }
      }, 5000); // Show after 5 seconds
      
      return () => clearTimeout(timer);
    };

    checkInstallStatus();

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setInstallMethod('browser');
    };

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      console.log('PWA was installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Detect iOS Safari for manual install instructions
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
    if (isIOS && isSafari && !isInstalled) {
      setInstallMethod('manual');
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    setIsInstalling(true);
    
    try {
      // Show the install prompt
      await deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      
      setDeferredPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      console.error('Error during PWA installation:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-prompt-seen', 'true');
    localStorage.setItem('pwa-install-prompt-time', Date.now().toString());
  };

  const getInstallInstructions = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('chrome') && !userAgent.includes('edg')) {
      return {
        browser: 'Chrome',
        steps: [
          'Click the install button in the address bar',
          'Or use the three-dot menu → "Install Support Docs"'
        ]
      };
    } else if (userAgent.includes('firefox')) {
      return {
        browser: 'Firefox',
        steps: [
          'Click the install button in the address bar',
          'Or use the menu → "Install this site as an app"'
        ]
      };
    } else if (userAgent.includes('safari') && userAgent.includes('iphone')) {
      return {
        browser: 'Safari (iOS)',
        steps: [
          'Tap the Share button at the bottom',
          'Scroll down and tap "Add to Home Screen"',
          'Tap "Add" to install the app'
        ]
      };
    } else if (userAgent.includes('safari')) {
      return {
        browser: 'Safari (macOS)',
        steps: [
          'Click File menu → "Add to Dock"',
          'Or use the share button in the toolbar'
        ]
      };
    } else if (userAgent.includes('edg')) {
      return {
        browser: 'Edge',
        steps: [
          'Click the install button in the address bar',
          'Or use the three-dot menu → "Apps" → "Install this site as an app"'
        ]
      };
    }
    
    return {
      browser: 'Your Browser',
      steps: [
        'Look for an install button in the address bar',
        'Or check your browser menu for "Install app" option'
      ]
    };
  };

  if (isInstalled) {
    return (
      <div className={`flex items-center space-x-2 text-green-600 ${className}`}>
        <CheckCircleIcon className="h-5 w-5" />
        <span className="text-sm font-medium">App Installed</span>
      </div>
    );
  }

  if (!showPrompt) return null;

  const instructions = getInstallInstructions();

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <ArrowDownTrayIcon className="h-6 w-6 text-blue-600" />
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-blue-900 mb-1">
              Install Support Docs App
            </h3>
            <p className="text-blue-700 mb-3">
              Get offline access to all documentation and faster loading times.
            </p>
            
            {/* Benefits */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div className="flex items-center space-x-2">
                <CloudArrowDownIcon className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-700">Offline Access</span>
              </div>
              <div className="flex items-center space-x-2">
                <DevicePhoneMobileIcon className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-700">Mobile Optimized</span>
              </div>
              <div className="flex items-center space-x-2">
                <ComputerDesktopIcon className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-700">Desktop App</span>
              </div>
            </div>
            
            {/* Install button or instructions */}
            {installMethod === 'browser' && deferredPrompt ? (
              <button
                onClick={handleInstallClick}
                disabled={isInstalling}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isInstalling ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Installing...</span>
                  </>
                ) : (
                  <>
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    <span>Install App</span>
                  </>
                )}
              </button>
            ) : (
              <div className="bg-white rounded-lg p-3 border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">
                  Install in {instructions.browser}:
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-blue-700">
                  {instructions.steps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>
        
        <button
          onClick={handleDismiss}
          className="p-1 hover:bg-blue-100 rounded transition-colors"
          title="Dismiss"
        >
          <XMarkIcon className="h-5 w-5 text-blue-600" />
        </button>
      </div>
    </div>
  );
};