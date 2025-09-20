import React from 'react';
import { motion } from 'framer-motion';
import { useResponsive } from '@/design-system/hooks/useResponsive';

// Responsive Container
interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

export function ResponsiveContainer({
  children,
  className = '',
  maxWidth = 'xl',
  padding = 'md'
}: ResponsiveContainerProps) {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full'
  };

  const paddingClasses = {
    none: '',
    sm: 'px-2 sm:px-4',
    md: 'px-4 sm:px-6',
    lg: 'px-6 sm:px-8',
    xl: 'px-8 sm:px-12'
  };

  return (
    <div className={`mx-auto ${maxWidthClasses[maxWidth]} ${paddingClasses[padding]} ${className}`}>
      {children}
    </div>
  );
}

// Responsive Grid
interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  cols?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

export function ResponsiveGrid({
  children,
  className = '',
  cols = { xs: 1, sm: 2, md: 3, lg: 4 },
  gap = 'md'
}: ResponsiveGridProps) {
  const gapClasses = {
    none: 'gap-0',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8'
  };

  const getGridCols = () => {
    const classes = [];
    if (cols.xs) classes.push(`grid-cols-${cols.xs}`);
    if (cols.sm) classes.push(`sm:grid-cols-${cols.sm}`);
    if (cols.md) classes.push(`md:grid-cols-${cols.md}`);
    if (cols.lg) classes.push(`lg:grid-cols-${cols.lg}`);
    if (cols.xl) classes.push(`xl:grid-cols-${cols.xl}`);
    return classes.join(' ');
  };

  return (
    <div className={`grid ${getGridCols()} ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  );
}

// Responsive Stack
interface ResponsiveStackProps {
  children: React.ReactNode;
  className?: string;
  direction?: {
    xs?: 'row' | 'col';
    sm?: 'row' | 'col';
    md?: 'row' | 'col';
    lg?: 'row' | 'col';
  };
  spacing?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
}

export function ResponsiveStack({
  children,
  className = '',
  direction = { xs: 'col', md: 'row' },
  spacing = 'md',
  align = 'start',
  justify = 'start'
}: ResponsiveStackProps) {
  const spacingClasses = {
    none: 'gap-0',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8'
  };

  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch'
  };

  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
    evenly: 'justify-evenly'
  };

  const getDirectionClasses = () => {
    const classes = [];
    if (direction.xs) classes.push(`flex-${direction.xs}`);
    if (direction.sm) classes.push(`sm:flex-${direction.sm}`);
    if (direction.md) classes.push(`md:flex-${direction.md}`);
    if (direction.lg) classes.push(`lg:flex-${direction.lg}`);
    return classes.join(' ');
  };

  return (
    <div className={`flex ${getDirectionClasses()} ${spacingClasses[spacing]} ${alignClasses[align]} ${justifyClasses[justify]} ${className}`}>
      {children}
    </div>
  );
}

// Responsive Text
interface ResponsiveTextProps {
  children: React.ReactNode;
  className?: string;
  size?: {
    xs?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
    sm?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
    md?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
    lg?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  };
  weight?: 'light' | 'normal' | 'medium' | 'semibold' | 'bold';
  align?: {
    xs?: 'left' | 'center' | 'right';
    sm?: 'left' | 'center' | 'right';
    md?: 'left' | 'center' | 'right';
    lg?: 'left' | 'center' | 'right';
  };
}

export function ResponsiveText({
  children,
  className = '',
  size = { xs: 'base' },
  weight = 'normal',
  align = { xs: 'left' }
}: ResponsiveTextProps) {
  const weightClasses = {
    light: 'font-light',
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold'
  };

  const getSizeClasses = () => {
    const classes = [];
    if (size.xs) classes.push(`text-${size.xs}`);
    if (size.sm) classes.push(`sm:text-${size.sm}`);
    if (size.md) classes.push(`md:text-${size.md}`);
    if (size.lg) classes.push(`lg:text-${size.lg}`);
    return classes.join(' ');
  };

  const getAlignClasses = () => {
    const classes = [];
    if (align.xs) classes.push(`text-${align.xs}`);
    if (align.sm) classes.push(`sm:text-${align.sm}`);
    if (align.md) classes.push(`md:text-${align.md}`);
    if (align.lg) classes.push(`lg:text-${align.lg}`);
    return classes.join(' ');
  };

  return (
    <div className={`${getSizeClasses()} ${weightClasses[weight]} ${getAlignClasses()} ${className}`}>
      {children}
    </div>
  );
}

// Mobile-First Card
interface MobileFirstCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: {
    xs?: 'none' | 'sm' | 'md' | 'lg';
    sm?: 'none' | 'sm' | 'md' | 'lg';
    md?: 'none' | 'sm' | 'md' | 'lg';
  };
  rounded?: {
    xs?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    sm?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    md?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  };
}

export function MobileFirstCard({
  children,
  className = '',
  padding = { xs: 'md', md: 'lg' },
  rounded = { xs: 'lg', md: 'xl' }
}: MobileFirstCardProps) {
  const getPaddingClasses = () => {
    const classes = [];
    if (padding.xs) {
      const p = padding.xs === 'none' ? '' : padding.xs === 'sm' ? 'p-3' : padding.xs === 'md' ? 'p-4' : 'p-6';
      if (p) classes.push(p);
    }
    if (padding.sm) {
      const p = padding.sm === 'none' ? 'sm:p-0' : padding.sm === 'sm' ? 'sm:p-3' : padding.sm === 'md' ? 'sm:p-4' : 'sm:p-6';
      classes.push(p);
    }
    if (padding.md) {
      const p = padding.md === 'none' ? 'md:p-0' : padding.md === 'sm' ? 'md:p-3' : padding.md === 'md' ? 'md:p-4' : 'md:p-6';
      classes.push(p);
    }
    return classes.join(' ');
  };

  const getRoundedClasses = () => {
    const classes = [];
    if (rounded.xs) {
      const r = rounded.xs === 'none' ? 'rounded-none' : `rounded-${rounded.xs}`;
      classes.push(r);
    }
    if (rounded.sm) {
      const r = rounded.sm === 'none' ? 'sm:rounded-none' : `sm:rounded-${rounded.sm}`;
      classes.push(r);
    }
    if (rounded.md) {
      const r = rounded.md === 'none' ? 'md:rounded-none' : `md:rounded-${rounded.md}`;
      classes.push(r);
    }
    return classes.join(' ');
  };

  return (
    <motion.div
      className={`
        bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg
        border border-white/30 dark:border-gray-700/50
        shadow-lg hover:shadow-xl transition-all duration-300
        ${getPaddingClasses()} ${getRoundedClasses()} ${className}
      `}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
    >
      {children}
    </motion.div>
  );
}

// Responsive Navigation
interface ResponsiveNavigationProps {
  children: React.ReactNode;
  className?: string;
  mobileBreakpoint?: 'sm' | 'md' | 'lg';
  mobileLayout?: 'drawer' | 'bottom' | 'overlay';
}

export function ResponsiveNavigation({
  children,
  className = '',
  mobileBreakpoint = 'md',
  mobileLayout = 'drawer'
}: ResponsiveNavigationProps) {
  const { isMobile, isTablet } = useResponsive();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const breakpointClass = mobileBreakpoint === 'sm' ? 'sm:block' : mobileBreakpoint === 'md' ? 'md:block' : 'lg:block';
  const hiddenClass = mobileBreakpoint === 'sm' ? 'sm:hidden' : mobileBreakpoint === 'md' ? 'md:hidden' : 'lg:hidden';

  if (isMobile || (mobileBreakpoint === 'md' && isTablet)) {
    return (
      <>
        {/* Mobile menu button */}
        <motion.button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="fixed top-4 left-4 z-50 p-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg rounded-lg shadow-lg border border-white/30 dark:border-gray-700/50"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </motion.button>

        {/* Mobile navigation */}
        {mobileLayout === 'drawer' && (
          <motion.div
            className={`fixed inset-y-0 left-0 z-40 w-64 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border-r border-white/30 dark:border-gray-700/50 transform ${className}`}
            initial={{ x: '-100%' }}
            animate={{ x: mobileMenuOpen ? 0 : '-100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="pt-16 pb-4 overflow-y-auto">
              {children}
            </div>
          </motion.div>
        )}

        {mobileLayout === 'bottom' && mobileMenuOpen && (
          <motion.div
            className={`fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border-t border-white/30 dark:border-gray-700/50 ${className}`}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="p-4 max-h-96 overflow-y-auto">
              {children}
            </div>
          </motion.div>
        )}

        {mobileLayout === 'overlay' && mobileMenuOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-30 bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              className={`fixed inset-4 z-40 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl border border-white/30 dark:border-gray-700/50 ${className}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div className="p-4 h-full overflow-y-auto">
                {children}
              </div>
            </motion.div>
          </>
        )}

        {/* Backdrop */}
        {mobileMenuOpen && mobileLayout !== 'overlay' && (
          <motion.div
            className="fixed inset-0 z-30 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </>
    );
  }

  // Desktop navigation
  return (
    <div className={`${breakpointClass} ${className}`}>
      {children}
    </div>
  );
}

// Responsive Image
interface ResponsiveImageProps {
  src: string;
  alt: string;
  className?: string;
  sizes?: {
    xs?: { width: number; height: number };
    sm?: { width: number; height: number };
    md?: { width: number; height: number };
    lg?: { width: number; height: number };
  };
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

export function ResponsiveImage({
  src,
  alt,
  className = '',
  sizes = { xs: { width: 300, height: 200 }, md: { width: 600, height: 400 } },
  objectFit = 'cover',
  rounded = 'lg'
}: ResponsiveImageProps) {
  const { isMobile, isTablet } = useResponsive();
  
  const getCurrentSize = () => {
    if (isMobile && sizes.xs) return sizes.xs;
    if (isTablet && sizes.sm) return sizes.sm;
    if (sizes.md) return sizes.md;
    if (sizes.lg) return sizes.lg;
    return sizes.xs || { width: 300, height: 200 };
  };

  const currentSize = getCurrentSize();
  const objectFitClass = `object-${objectFit}`;
  const roundedClass = rounded === 'none' ? '' : `rounded-${rounded}`;

  return (
    <motion.div
      className={`overflow-hidden ${roundedClass} ${className}`}
      style={{ width: currentSize.width, height: currentSize.height }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <img
        src={src}
        alt={alt}
        className={`w-full h-full ${objectFitClass} transition-transform duration-300 hover:scale-105`}
        loading="lazy"
      />
    </motion.div>
  );
}

// Responsive Spacing
export function useResponsiveSpacing() {
  const { isMobile, isTablet, isDesktop } = useResponsive();

  const getSpacing = (mobile: string, tablet?: string, desktop?: string) => {
    if (isMobile) return mobile;
    if (isTablet && tablet) return tablet;
    if (isDesktop && desktop) return desktop;
    return mobile;
  };

  return { getSpacing };
}