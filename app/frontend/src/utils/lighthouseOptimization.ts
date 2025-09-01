/**
 * Lighthouse Optimization Utilities
 * 
 * This module provides utilities to optimize Lighthouse scores and Core Web Vitals
 */

interface LighthouseMetrics {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  pwa: number;
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
}

interface OptimizationRecommendation {
  category: 'performance' | 'accessibility' | 'seo' | 'pwa';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: number; // Estimated score improvement
  implementation: string;
}

class LighthouseOptimizer {
  private metrics: Partial<LighthouseMetrics> = {};
  private recommendations: OptimizationRecommendation[] = [];

  /**
   * Analyze current page performance
   */
  async analyzePerformance(): Promise<LighthouseMetrics> {
    const metrics: Partial<LighthouseMetrics> = {};

    try {
      // Measure Core Web Vitals
      await this.measureCoreWebVitals(metrics);
      
      // Analyze performance metrics
      await this.analyzePerformanceMetrics(metrics);
      
      // Check accessibility
      await this.analyzeAccessibility(metrics);
      
      // Check SEO
      await this.analyzeSEO(metrics);
      
      // Check PWA readiness
      await this.analyzePWA(metrics);

      this.metrics = metrics;
      return metrics as LighthouseMetrics;
    } catch (error) {
      console.error('Performance analysis failed:', error);
      throw error;
    }
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations(): OptimizationRecommendation[] {
    this.recommendations = [];

    // Performance recommendations
    this.addPerformanceRecommendations();
    
    // Accessibility recommendations
    this.addAccessibilityRecommendations();
    
    // SEO recommendations
    this.addSEORecommendations();
    
    // PWA recommendations
    this.addPWARecommendations();

    // Sort by priority and impact
    this.recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      
      if (priorityDiff !== 0) return priorityDiff;
      return b.impact - a.impact;
    });

    return this.recommendations;
  }

  /**
   * Apply automatic optimizations
   */
  async applyOptimizations(): Promise<{
    applied: string[];
    failed: string[];
  }> {
    const applied: string[] = [];
    const failed: string[] = [];

    try {
      // Resource hints optimization
      if (await this.optimizeResourceHints()) {
        applied.push('Resource hints optimization');
      } else {
        failed.push('Resource hints optimization');
      }

      // Image optimization
      if (await this.optimizeImages()) {
        applied.push('Image optimization');
      } else {
        failed.push('Image optimization');
      }

      // Font optimization
      if (await this.optimizeFonts()) {
        applied.push('Font optimization');
      } else {
        failed.push('Font optimization');
      }

      // Critical CSS optimization
      if (await this.optimizeCriticalCSS()) {
        applied.push('Critical CSS optimization');
      } else {
        failed.push('Critical CSS optimization');
      }

      // Service Worker optimization
      if (await this.optimizeServiceWorker()) {
        applied.push('Service Worker optimization');
      } else {
        failed.push('Service Worker optimization');
      }

    } catch (error) {
      console.error('Optimization application failed:', error);
    }

    return { applied, failed };
  }

  /**
   * Measure Core Web Vitals
   */
  private async measureCoreWebVitals(metrics: Partial<LighthouseMetrics>): Promise<void> {
    return new Promise((resolve) => {
      // FCP - First Contentful Paint
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
        if (fcpEntry) {
          metrics.fcp = fcpEntry.startTime;
        }
      });

      try {
        fcpObserver.observe({ entryTypes: ['paint'] });
      } catch (error) {
        console.warn('FCP measurement not supported');
      }

      // LCP - Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          metrics.lcp = lastEntry.startTime;
        }
      });

      try {
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (error) {
        console.warn('LCP measurement not supported');
      }

      // FID - First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (entry.processingStart && entry.startTime) {
            metrics.fid = entry.processingStart - entry.startTime;
          }
        });
      });

      try {
        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (error) {
        console.warn('FID measurement not supported');
      }

      // CLS - Cumulative Layout Shift
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        metrics.cls = clsValue;
      });

      try {
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        console.warn('CLS measurement not supported');
      }

      // TTFB - Time to First Byte
      const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      if (navigationEntries.length > 0) {
        const navEntry = navigationEntries[0];
        metrics.ttfb = navEntry.responseStart - navEntry.requestStart;
      }

      // Resolve after a short delay to allow measurements
      setTimeout(resolve, 1000);
    });
  }

  /**
   * Analyze performance metrics
   */
  private async analyzePerformanceMetrics(metrics: Partial<LighthouseMetrics>): Promise<void> {
    let score = 100;

    // FCP scoring
    if (metrics.fcp) {
      if (metrics.fcp > 3000) score -= 20;
      else if (metrics.fcp > 1800) score -= 10;
    }

    // LCP scoring
    if (metrics.lcp) {
      if (metrics.lcp > 4000) score -= 25;
      else if (metrics.lcp > 2500) score -= 15;
    }

    // FID scoring
    if (metrics.fid) {
      if (metrics.fid > 300) score -= 20;
      else if (metrics.fid > 100) score -= 10;
    }

    // CLS scoring
    if (metrics.cls) {
      if (metrics.cls > 0.25) score -= 15;
      else if (metrics.cls > 0.1) score -= 8;
    }

    // TTFB scoring
    if (metrics.ttfb) {
      if (metrics.ttfb > 800) score -= 10;
      else if (metrics.ttfb > 600) score -= 5;
    }

    metrics.performance = Math.max(0, score);
  }

  /**
   * Analyze accessibility
   */
  private async analyzeAccessibility(metrics: Partial<LighthouseMetrics>): Promise<void> {
    let score = 100;

    // Check for common accessibility issues
    const issues = [];

    // Missing alt attributes
    const imagesWithoutAlt = document.querySelectorAll('img:not([alt])');
    if (imagesWithoutAlt.length > 0) {
      issues.push('Images without alt attributes');
      score -= 10;
    }

    // Missing form labels
    const inputsWithoutLabels = document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])');
    if (inputsWithoutLabels.length > 0) {
      issues.push('Form inputs without labels');
      score -= 15;
    }

    // Low contrast (simplified check)
    const elements = document.querySelectorAll('*');
    let lowContrastCount = 0;
    elements.forEach(el => {
      const styles = window.getComputedStyle(el);
      const color = styles.color;
      const backgroundColor = styles.backgroundColor;
      
      // Simplified contrast check (would need proper contrast calculation)
      if (color === 'rgb(128, 128, 128)' && backgroundColor === 'rgb(255, 255, 255)') {
        lowContrastCount++;
      }
    });

    if (lowContrastCount > 5) {
      issues.push('Low contrast elements');
      score -= 20;
    }

    // Missing focus indicators
    const focusableElements = document.querySelectorAll('button, a, input, select, textarea');
    let missingFocusCount = 0;
    focusableElements.forEach(el => {
      const styles = window.getComputedStyle(el, ':focus');
      if (!styles.outline || styles.outline === 'none') {
        missingFocusCount++;
      }
    });

    if (missingFocusCount > focusableElements.length * 0.5) {
      issues.push('Missing focus indicators');
      score -= 10;
    }

    metrics.accessibility = Math.max(0, score);
  }

  /**
   * Analyze SEO
   */
  private async analyzeSEO(metrics: Partial<LighthouseMetrics>): Promise<void> {
    let score = 100;

    // Check meta tags
    const title = document.querySelector('title');
    if (!title || title.textContent!.length < 10) {
      score -= 15;
    }

    const metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription || metaDescription.getAttribute('content')!.length < 50) {
      score -= 10;
    }

    // Check heading structure
    const h1s = document.querySelectorAll('h1');
    if (h1s.length !== 1) {
      score -= 10;
    }

    // Check for robots meta
    const robotsMeta = document.querySelector('meta[name="robots"]');
    if (!robotsMeta) {
      score -= 5;
    }

    // Check for canonical URL
    const canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      score -= 5;
    }

    // Check for structured data
    const structuredData = document.querySelectorAll('script[type="application/ld+json"]');
    if (structuredData.length === 0) {
      score -= 10;
    }

    metrics.seo = Math.max(0, score);
  }

  /**
   * Analyze PWA readiness
   */
  private async analyzePWA(metrics: Partial<LighthouseMetrics>): Promise<void> {
    let score = 0;

    // Check for manifest
    const manifest = document.querySelector('link[rel="manifest"]');
    if (manifest) score += 20;

    // Check for service worker
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) score += 30;
    }

    // Check for HTTPS
    if (location.protocol === 'https:') score += 20;

    // Check for offline functionality
    if (navigator.onLine === false) {
      // Test if app works offline (simplified)
      try {
        const response = await fetch('/', { cache: 'only-if-cached' });
        if (response.ok) score += 15;
      } catch (error) {
        // App doesn't work offline
      }
    } else {
      score += 10; // Assume it works if we can't test
    }

    // Check for app-like features
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) score += 10;

    // Check for theme color
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) score += 5;

    metrics.pwa = Math.min(100, score);
  }

  /**
   * Add performance recommendations
   */
  private addPerformanceRecommendations(): void {
    if (this.metrics.fcp && this.metrics.fcp > 2000) {
      this.recommendations.push({
        category: 'performance',
        priority: 'high',
        title: 'Improve First Contentful Paint',
        description: 'Optimize critical rendering path and reduce render-blocking resources',
        impact: 15,
        implementation: 'Inline critical CSS, defer non-critical JavaScript, optimize images'
      });
    }

    if (this.metrics.lcp && this.metrics.lcp > 3000) {
      this.recommendations.push({
        category: 'performance',
        priority: 'high',
        title: 'Optimize Largest Contentful Paint',
        description: 'Optimize the largest element in the viewport',
        impact: 20,
        implementation: 'Preload hero images, optimize server response times, use CDN'
      });
    }

    if (this.metrics.cls && this.metrics.cls > 0.1) {
      this.recommendations.push({
        category: 'performance',
        priority: 'medium',
        title: 'Reduce Cumulative Layout Shift',
        description: 'Prevent unexpected layout shifts',
        impact: 10,
        implementation: 'Set explicit dimensions for images and videos, reserve space for ads'
      });
    }
  }

  /**
   * Add accessibility recommendations
   */
  private addAccessibilityRecommendations(): void {
    const imagesWithoutAlt = document.querySelectorAll('img:not([alt])');
    if (imagesWithoutAlt.length > 0) {
      this.recommendations.push({
        category: 'accessibility',
        priority: 'high',
        title: 'Add Alt Text to Images',
        description: 'All images should have descriptive alt text',
        impact: 10,
        implementation: 'Add meaningful alt attributes to all images'
      });
    }

    const inputsWithoutLabels = document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])');
    if (inputsWithoutLabels.length > 0) {
      this.recommendations.push({
        category: 'accessibility',
        priority: 'high',
        title: 'Add Labels to Form Inputs',
        description: 'All form inputs should have associated labels',
        impact: 15,
        implementation: 'Add proper labels or aria-label attributes to form inputs'
      });
    }
  }

  /**
   * Add SEO recommendations
   */
  private addSEORecommendations(): void {
    const title = document.querySelector('title');
    if (!title || title.textContent!.length < 10) {
      this.recommendations.push({
        category: 'seo',
        priority: 'high',
        title: 'Improve Page Title',
        description: 'Page title should be descriptive and unique',
        impact: 15,
        implementation: 'Add a descriptive title tag with 50-60 characters'
      });
    }

    const metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      this.recommendations.push({
        category: 'seo',
        priority: 'medium',
        title: 'Add Meta Description',
        description: 'Meta description helps search engines understand page content',
        impact: 10,
        implementation: 'Add a meta description tag with 150-160 characters'
      });
    }
  }

  /**
   * Add PWA recommendations
   */
  private addPWARecommendations(): void {
    const manifest = document.querySelector('link[rel="manifest"]');
    if (!manifest) {
      this.recommendations.push({
        category: 'pwa',
        priority: 'medium',
        title: 'Add Web App Manifest',
        description: 'Web app manifest enables installation and app-like experience',
        impact: 20,
        implementation: 'Create and link a web app manifest file'
      });
    }

    if (!('serviceWorker' in navigator)) {
      this.recommendations.push({
        category: 'pwa',
        priority: 'medium',
        title: 'Implement Service Worker',
        description: 'Service worker enables offline functionality and caching',
        impact: 30,
        implementation: 'Register a service worker for caching and offline support'
      });
    }
  }

  /**
   * Optimization implementation methods
   */
  private async optimizeResourceHints(): Promise<boolean> {
    try {
      // Add preconnect hints for external domains
      const externalDomains = ['fonts.googleapis.com', 'cdn.jsdelivr.net'];
      
      externalDomains.forEach(domain => {
        if (!document.querySelector(`link[rel="preconnect"][href*="${domain}"]`)) {
          const link = document.createElement('link');
          link.rel = 'preconnect';
          link.href = `https://${domain}`;
          document.head.appendChild(link);
        }
      });

      return true;
    } catch (error) {
      console.error('Resource hints optimization failed:', error);
      return false;
    }
  }

  private async optimizeImages(): Promise<boolean> {
    try {
      // Add loading="lazy" to images below the fold
      const images = document.querySelectorAll('img:not([loading])');
      
      images.forEach((img, index) => {
        if (index > 2) { // Skip first 3 images (likely above the fold)
          img.setAttribute('loading', 'lazy');
        }
      });

      return true;
    } catch (error) {
      console.error('Image optimization failed:', error);
      return false;
    }
  }

  private async optimizeFonts(): Promise<boolean> {
    try {
      // Add font-display: swap to font faces
      const fontLinks = document.querySelectorAll('link[href*="fonts"]');
      
      fontLinks.forEach(link => {
        if (!link.getAttribute('href')?.includes('display=swap')) {
          const href = link.getAttribute('href');
          const separator = href?.includes('?') ? '&' : '?';
          link.setAttribute('href', `${href}${separator}display=swap`);
        }
      });

      return true;
    } catch (error) {
      console.error('Font optimization failed:', error);
      return false;
    }
  }

  private async optimizeCriticalCSS(): Promise<boolean> {
    try {
      // This would involve extracting and inlining critical CSS
      // For now, just ensure CSS is not render-blocking
      const cssLinks = document.querySelectorAll('link[rel="stylesheet"]:not([media])');
      
      cssLinks.forEach(link => {
        link.setAttribute('media', 'print');
        link.setAttribute('onload', "this.media='all'");
      });

      return true;
    } catch (error) {
      console.error('Critical CSS optimization failed:', error);
      return false;
    }
  }

  private async optimizeServiceWorker(): Promise<boolean> {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          // Update service worker if available
          await registration.update();
        }
      }

      return true;
    } catch (error) {
      console.error('Service worker optimization failed:', error);
      return false;
    }
  }
}

// Performance budget checker
export class PerformanceBudget {
  private budgets = {
    fcp: 1800, // ms
    lcp: 2500, // ms
    fid: 100,  // ms
    cls: 0.1,  // score
    ttfb: 600, // ms
    bundleSize: 512 * 1024, // bytes
    imageSize: 1024 * 1024, // bytes per image
    totalImages: 50 // count
  };

  async checkBudgets(): Promise<{
    passed: boolean;
    violations: Array<{
      metric: string;
      actual: number;
      budget: number;
      severity: 'error' | 'warning';
    }>;
  }> {
    const violations: Array<{
      metric: string;
      actual: number;
      budget: number;
      severity: 'warning' | 'error';
    }> = [];
    const optimizer = new LighthouseOptimizer();
    const metrics = await optimizer.analyzePerformance();

    // Check Core Web Vitals
    if (metrics.fcp > this.budgets.fcp) {
      violations.push({
        metric: 'First Contentful Paint',
        actual: metrics.fcp,
        budget: this.budgets.fcp,
        severity: metrics.fcp > this.budgets.fcp * 1.5 ? 'error' : 'warning'
      });
    }

    if (metrics.lcp > this.budgets.lcp) {
      violations.push({
        metric: 'Largest Contentful Paint',
        actual: metrics.lcp,
        budget: this.budgets.lcp,
        severity: metrics.lcp > this.budgets.lcp * 1.5 ? 'error' : 'warning'
      });
    }

    if (metrics.fid > this.budgets.fid) {
      violations.push({
        metric: 'First Input Delay',
        actual: metrics.fid,
        budget: this.budgets.fid,
        severity: metrics.fid > this.budgets.fid * 2 ? 'error' : 'warning'
      });
    }

    if (metrics.cls > this.budgets.cls) {
      violations.push({
        metric: 'Cumulative Layout Shift',
        actual: metrics.cls,
        budget: this.budgets.cls,
        severity: metrics.cls > this.budgets.cls * 2 ? 'error' : 'warning'
      });
    }

    return {
      passed: violations.length === 0,
      violations
    };
  }
}

export const lighthouseOptimizer = new LighthouseOptimizer();
export const performanceBudget = new PerformanceBudget();

export default LighthouseOptimizer;