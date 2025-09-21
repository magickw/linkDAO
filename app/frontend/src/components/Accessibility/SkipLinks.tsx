import React from 'react';

interface SkipLink {
  href: string;
  label: string;
}

interface SkipLinksProps {
  links?: SkipLink[];
  className?: string;
}

const defaultLinks: SkipLink[] = [
  { href: '#main-content', label: 'Skip to main content' },
  { href: '#navigation', label: 'Skip to navigation' },
  { href: '#sidebar', label: 'Skip to sidebar' },
  { href: '#footer', label: 'Skip to footer' },
];

export const SkipLinks: React.FC<SkipLinksProps> = ({ 
  links = defaultLinks, 
  className = '' 
}) => {
  return (
    <div className={`skip-links ${className}`}>
      {links.map((link, index) => (
        <a
          key={index}
          href={link.href}
          className="
            absolute left-[-10000px] top-auto w-1 h-1 overflow-hidden
            focus:left-2 focus:top-2 focus:w-auto focus:h-auto focus:overflow-visible
            bg-blue-600 text-white px-4 py-2 rounded-md font-medium
            focus:z-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            transition-all duration-200
          "
          onFocus={(e) => {
            // Ensure the target element exists and is focusable
            const target = document.querySelector(link.href);
            if (target) {
              target.setAttribute('tabindex', '-1');
            }
          }}
          onClick={(e) => {
            e.preventDefault();
            const target = document.querySelector(link.href) as HTMLElement;
            if (target) {
              target.focus();
              target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
};