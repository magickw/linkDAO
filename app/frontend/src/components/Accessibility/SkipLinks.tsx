import React from 'react';
import { motion } from 'framer-motion';

interface SkipLink {
  href: string;
  label: string;
  description?: string;
}

interface SkipLinksProps {
  links?: SkipLink[];
  className?: string;
}

const defaultLinks: SkipLink[] = [
  { 
    href: '#main-content', 
    label: 'Skip to main content',
    description: 'Jump to the main content area'
  },
  { 
    href: '#navigation', 
    label: 'Skip to navigation',
    description: 'Jump to the main navigation menu'
  },
  { 
    href: '#sidebar', 
    label: 'Skip to sidebar',
    description: 'Jump to the sidebar content'
  },
  { 
    href: '#search', 
    label: 'Skip to search',
    description: 'Jump to the search functionality'
  },
  { 
    href: '#footer', 
    label: 'Skip to footer',
    description: 'Jump to the page footer'
  },
];

export const SkipLinks: React.FC<SkipLinksProps> = ({ 
  links = defaultLinks, 
  className = '' 
}) => {
  const handleSkipLinkClick = (e: React.MouseEvent, link: SkipLink) => {
    e.preventDefault();
    const target = document.querySelector(link.href) as HTMLElement;
    if (target) {
      // Make element focusable if it isn't already
      if (!target.hasAttribute('tabindex')) {
        target.setAttribute('tabindex', '-1');
      }
      
      // Focus and scroll to target
      target.focus();
      target.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start',
        inline: 'nearest'
      });
      
      // Announce to screen readers
      const announcement = `Skipped to ${link.label}`;
      const liveRegion = document.getElementById('skip-links-announcer');
      if (liveRegion) {
        liveRegion.textContent = announcement;
        setTimeout(() => {
          liveRegion.textContent = '';
        }, 1000);
      }
    }
  };

  const handleSkipLinkFocus = (link: SkipLink) => {
    // Ensure the target element exists and prepare it for focus
    const target = document.querySelector(link.href);
    if (target && !target.hasAttribute('tabindex')) {
      target.setAttribute('tabindex', '-1');
    }
  };

  return (
    <>
      {/* Screen reader announcer */}
      <div
        id="skip-links-announcer"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      />
      
      <nav 
        className={`skip-links ${className}`}
        aria-label="Skip navigation links"
        role="navigation"
      >
        {links.map((link, index) => (
          <motion.a
            key={`${link.href}-${index}`}
            href={link.href}
            className="
              absolute left-[-10000px] top-auto w-1 h-1 overflow-hidden
              focus:left-4 focus:top-4 focus:w-auto focus:h-auto focus:overflow-visible
              bg-blue-600 dark:bg-blue-500 text-white px-4 py-2 rounded-md font-medium
              focus:z-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              transition-all duration-200 shadow-lg
              hover:bg-blue-700 dark:hover:bg-blue-600
              focus:bg-blue-700 dark:focus:bg-blue-600
            "
            onFocus={() => handleSkipLinkFocus(link)}
            onClick={(e) => handleSkipLinkClick(e, link)}
            whileFocus={{ scale: 1.05 }}
            transition={{ duration: 0.1 }}
            aria-describedby={link.description ? `skip-desc-${index}` : undefined}
          >
            {link.label}
            {link.description && (
              <span 
                id={`skip-desc-${index}`}
                className="sr-only"
              >
                {link.description}
              </span>
            )}
          </motion.a>
        ))}
      </nav>
    </>
  );
};

export default SkipLinks;