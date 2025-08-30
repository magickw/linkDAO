import React, { useState, useEffect, useRef } from 'react';

// Page Transition Wrapper
interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
  animation?: 'fade' | 'slide' | 'scale' | 'blur';
  duration?: number;
}

export function PageTransition({
  children,
  className = '',
  animation = 'fade',
  duration = 300
}: PageTransitionProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const animationClasses = {
    fade: isVisible ? 'animate-fadeIn' : 'opacity-0',
    slide: isVisible ? 'animate-slideInLeft' : 'opacity-0 -translate-x-4',
    scale: isVisible ? 'animate-scaleIn' : 'opacity-0 scale-95',
    blur: isVisible ? 'animate-fadeIn' : 'opacity-0 blur-sm'
  };

  return (
    <div 
      className={`transition-all duration-${duration} ${animationClasses[animation]} ${className}`}
    >
      {children}
    </div>
  );
}

// Modal Transition Component
interface ModalTransitionProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  overlayClassName?: string;
  closeOnOverlayClick?: boolean;
}

export function ModalTransition({
  isOpen,
  onClose,
  children,
  className = '',
  overlayClassName = '',
  closeOnOverlayClick = true
}: ModalTransitionProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Small delay to ensure the element is rendered before animation
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
      // Wait for animation to complete before unmounting
      setTimeout(() => setShouldRender(false), 300);
    }
  }, [isOpen]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!shouldRender) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div
          className={`fixed inset-0 bg-black transition-opacity duration-300 ${
            isVisible ? 'bg-opacity-50' : 'bg-opacity-0'
          } ${overlayClassName}`}
          onClick={handleOverlayClick}
        />

        {/* Modal Content */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>

        <div
          className={`inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all duration-300 sm:my-8 sm:align-middle sm:max-w-lg sm:w-full ${
            isVisible 
              ? 'opacity-100 translate-y-0 sm:scale-100' 
              : 'opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95'
          } ${className}`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

// Slide Transition for Navigation
interface SlideTransitionProps {
  children: React.ReactNode;
  direction: 'left' | 'right' | 'up' | 'down';
  isVisible: boolean;
  className?: string;
}

export function SlideTransition({
  children,
  direction,
  isVisible,
  className = ''
}: SlideTransitionProps) {
  const directionClasses = {
    left: isVisible ? 'translate-x-0' : '-translate-x-full',
    right: isVisible ? 'translate-x-0' : 'translate-x-full',
    up: isVisible ? 'translate-y-0' : '-translate-y-full',
    down: isVisible ? 'translate-y-0' : 'translate-y-full'
  };

  return (
    <div
      className={`transform transition-transform duration-300 ease-in-out ${directionClasses[direction]} ${className}`}
    >
      {children}
    </div>
  );
}

// Collapse Transition
interface CollapseTransitionProps {
  isOpen: boolean;
  children: React.ReactNode;
  className?: string;
}

export function CollapseTransition({
  isOpen,
  children,
  className = ''
}: CollapseTransitionProps) {
  const [height, setHeight] = useState<number | 'auto'>(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      if (isOpen) {
        const scrollHeight = contentRef.current.scrollHeight;
        setHeight(scrollHeight);
        // Set to auto after animation completes
        setTimeout(() => setHeight('auto'), 300);
      } else {
        setHeight(contentRef.current.scrollHeight);
        // Force reflow
        contentRef.current.offsetHeight;
        setHeight(0);
      }
    }
  }, [isOpen]);

  return (
    <div
      className={`overflow-hidden transition-all duration-300 ease-in-out ${className}`}
      style={{ height: height === 'auto' ? 'auto' : `${height}px` }}
    >
      <div ref={contentRef}>
        {children}
      </div>
    </div>
  );
}

// Fade Transition
interface FadeTransitionProps {
  show: boolean;
  children: React.ReactNode;
  className?: string;
  duration?: number;
}

export function FadeTransition({
  show,
  children,
  className = '',
  duration = 300
}: FadeTransitionProps) {
  const [shouldRender, setShouldRender] = useState(show);

  useEffect(() => {
    if (show) {
      setShouldRender(true);
    } else {
      const timer = setTimeout(() => setShouldRender(false), duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration]);

  if (!shouldRender) return null;

  return (
    <div
      className={`transition-opacity duration-${duration} ${
        show ? 'opacity-100' : 'opacity-0'
      } ${className}`}
    >
      {children}
    </div>
  );
}

// Staggered List Transition
interface StaggeredListTransitionProps {
  items: React.ReactNode[];
  className?: string;
  itemClassName?: string;
  delay?: number;
  animation?: 'fadeInUp' | 'fadeInLeft' | 'scaleIn';
}

export function StaggeredListTransition({
  items,
  className = '',
  itemClassName = '',
  delay = 100,
  animation = 'fadeInUp'
}: StaggeredListTransitionProps) {
  const [visibleItems, setVisibleItems] = useState<boolean[]>([]);

  useEffect(() => {
    const newVisibleItems = new Array(items.length).fill(false);
    setVisibleItems(newVisibleItems);

    items.forEach((_, index) => {
      setTimeout(() => {
        setVisibleItems(prev => {
          const updated = [...prev];
          updated[index] = true;
          return updated;
        });
      }, index * delay);
    });
  }, [items.length, delay]);

  const animationClasses = {
    fadeInUp: 'animate-fadeInUp',
    fadeInLeft: 'animate-slideInLeft',
    scaleIn: 'animate-scaleIn'
  };

  return (
    <div className={className}>
      {items.map((item, index) => (
        <div
          key={index}
          className={`transition-all duration-300 ${
            visibleItems[index] 
              ? `${animationClasses[animation]} opacity-100` 
              : 'opacity-0 translate-y-4'
          } ${itemClassName}`}
          style={{ animationDelay: `${index * delay}ms` }}
        >
          {item}
        </div>
      ))}
    </div>
  );
}

// View Transition for Dashboard Views
interface ViewTransitionProps {
  currentView: string;
  views: Record<string, React.ReactNode>;
  className?: string;
  animation?: 'fade' | 'slide' | 'scale';
}

export function ViewTransition({
  currentView,
  views,
  className = '',
  animation = 'fade'
}: ViewTransitionProps) {
  const [displayView, setDisplayView] = useState(currentView);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (currentView !== displayView) {
      setIsTransitioning(true);
      
      setTimeout(() => {
        setDisplayView(currentView);
        setIsTransitioning(false);
      }, 150);
    }
  }, [currentView, displayView]);

  const animationClasses = {
    fade: isTransitioning ? 'opacity-0' : 'opacity-100',
    slide: isTransitioning ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0',
    scale: isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
  };

  return (
    <div className={`transition-all duration-300 ${animationClasses[animation]} ${className}`}>
      {views[displayView]}
    </div>
  );
}

// Notification Transition
interface NotificationTransitionProps {
  notifications: Array<{
    id: string;
    content: React.ReactNode;
  }>;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  className?: string;
}

export function NotificationTransition({
  notifications,
  position = 'top-right',
  className = ''
}: NotificationTransitionProps) {
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-50 space-y-2 ${className}`}>
      {notifications.map((notification, index) => (
        <div
          key={notification.id}
          className="animate-slideInRight"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          {notification.content}
        </div>
      ))}
    </div>
  );
}