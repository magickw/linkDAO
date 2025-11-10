import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassPanel } from './ui/GlassPanel';
import { Button } from '@/design-system/components/Button';

// Extend Navigator interface to include Safari's standalone property
declare global {
  interface Navigator {
    standalone?: boolean;
  }
}

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
  onInstall?: () => void;
  onDismiss?: () => void;
  autoShow?: boolean;
  showDelay?: number;
}

export function PWAInstallPrompt({
  className = '',
  onInstall,
  onDismiss,
  autoShow = true,
  showDelay = 3000
}: PWAInstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const checkInstallation = () => {
      // Check if running in standalone mode
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      // Check if running as PWA
      const isPWA = window.navigator.standalone === true || isStandalone;
      setIsInstalled(isPWA);
    };

    checkInstallation();

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setCanInstall(true);

      // Auto-show prompt after delay if enabled
      if (autoShow && !isInstalled) {
        setTimeout(() => {
          setShowPrompt(true);
        }, showDelay);
      }
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setCanInstall(false);
      setDeferredPrompt(null);
      console.log('PWA was installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [autoShow, showDelay, isInstalled]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      // Show the install prompt
      await deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
        onInstall?.();
      } else {
        console.log('User dismissed the install prompt');
        onDismiss?.();
      }
      
      // Clear the deferredPrompt
      setDeferredPrompt(null);
      setShowPrompt(false);
      setCanInstall(false);
    } catch (error) {
      console.error('Error during PWA installation:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    onDismiss?.();
    
    // Don't show again for this session
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.setItem('pwa-prompt-dismissed', 'true');
    }
  };

  // Don't show if already installed or dismissed this session
  const isDismissed = typeof window !== 'undefined' && window.sessionStorage ? sessionStorage.getItem('pwa-prompt-dismissed') : false;
  if (isInstalled || isDismissed) {
    return null;
  }

  return (
    <>
      {/* Manual install button for when prompt is not showing */}
      {canInstall && !showPrompt && (
        <Button
          variant="outline"
          size="small"
          onClick={handleManualShow}
          className="fixed bottom-4 right-4 z-40 md:bottom-6 md:right-6"
        >
          📱 Install App
        </Button>
      )}

      {/* Install prompt modal */}
      <AnimatePresence>
        {showPrompt && canInstall && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center p-4 md:items-center"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={handleDismiss}
            />

            {/* Prompt content */}
            <motion.div
              initial={{ y: 100, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 100, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={`relative w-full max-w-md ${className}`}
            >
              <GlassPanel className="p-6">
                <div className="text-center">
                  {/* App icon */}
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600">
                    <svg
                      className="h-8 w-8 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                      />
                    </svg>
                  </div>

                  {/* Title and description */}
                  <h3 className="mb-2 text-xl font-bold text-white">
                    Install Web3 Marketplace
                  </h3>
                  <p className="mb-6 text-sm text-gray-300">
                    Get the full experience with offline access, push notifications, 
                    and faster loading times.
                  </p>

                  {/* Features list */}
                  <div className="mb-6 space-y-2 text-left">
                    <div className="flex items-center space-x-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/20">
                        <svg className="h-3 w-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-sm text-gray-300">Works offline</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/20">
                        <svg className="h-3 w-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-sm text-gray-300">Push notifications</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/20">
                        <svg className="h-3 w-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-sm text-gray-300">Faster performance</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/20">
                        <svg className="h-3 w-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-sm text-gray-300">Native app experience</span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex space-x-3">
                    <Button
                      variant="outline"
                      size="medium"
                      onClick={handleDismiss}
                      className="flex-1"
                    >
                      Not Now
                    </Button>
                    <Button
                      variant="primary"
                      size="medium"
                      onClick={handleInstallClick}
                      className="flex-1"
                    >
                      Install
                    </Button>
                  </div>
                </div>
              </GlassPanel>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Hook for PWA installation state
export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const checkInstallation = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isPWA = window.navigator.standalone === true || isStandalone;
      setIsInstalled(isPWA);
    };

    checkInstallation();

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      setDeferredPrompt(null);
      setCanInstall(false);
      
      return outcome === 'accepted';
    } catch (error) {
      console.error('Error during PWA installation:', error);
      return false;
    }
  };

  return {
    canInstall,
    isInstalled,
    install
  };
}

export default PWAInstallPrompt;