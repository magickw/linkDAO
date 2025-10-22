/**
 * Intelligent Preloading Service
 * Provides smart preloading based on user behavior and network conditions
 */

export interface PreloadingStrategy {
  documents: {
    url: string;
    priority: 'high' | 'medium' | 'low';
    probability: number;
  }[];
  translations: {
    language: string;
    documentId: string;
    priority: 'high' | 'medium' | 'low';
  }[];
  images: {
    url: string;
    priority: 'high' | 'medium' | 'low';
  }[];
}

export interface UserBehaviorPattern {
  documentSequences: string[][];
  languagePreferences: string[];
  timeSpentPerDocument: Record<string, number>;
  searchQueries: string[];
  deviceType: 'mobile' | 'desktop' | 'tablet';
  sessionTime: number;
  returnVisitor: boolean;
}

export interface PreloadingConfig {
  enabled: boolean;
  maxConcurrentRequests: number;
  maxCacheSize: number; // in MB
  networkThreshold: 'slow-2g' | '2g' | '3g' | '4g' | 'wifi';
  batteryThreshold: number; // percentage
  memoryThreshold: number; // in GB
}

class IntelligentPreloadingService {
  private config: PreloadingConfig;
  private userBehavior: UserBehaviorPattern;
  private preloadQueue: Map<string, Promise<Response>> = new Map();
  private preloadedResources: Map<string, { data: any; timestamp: number; size: number }> = new Map();
  private isPreloading = false;
  private preloadingListeners: ((status: { active: boolean; queueSize: number }) => void)[] = [];

  constructor() {
    this.config = {
      enabled: true,
      maxConcurrentRequests: 3,
      maxCacheSize: 50, // 50MB
      networkThreshold: '3g',
      batteryThreshold: 20,
      memoryThreshold: 2
    };

    this.userBehavior = {
      documentSequences: [],
      languagePreferences: ['en'],
      timeSpentPerDocument: {},
      searchQueries: [],
      deviceType: this.detectDeviceType(),
      sessionTime: 0,
      returnVisitor: false
    };

    this.loadUserBehavior();
  }

  /**
   * Initialize intelligent preloading
   */
  async initialize(): Promise<void> {
    try {
      // Load configuration
      this.loadConfiguration();
      
      // Analyze user behavior
      this.analyzeUserBehavior();
      
      // Set up behavior tracking
      this.setupBehaviorTracking();
      
      // Start preloading if conditions are met
      if (this.shouldEnablePreloading()) {
        this.startIntelligentPreloading();
      }
      
      console.log('Intelligent preloading initialized');
    } catch (error) {
      console.error('Failed to initialize intelligent preloading:', error);
      throw error;
    }
  }

  /**
   * Get preloading strategy based on current context
   */
  getPreloadingStrategy(): PreloadingStrategy {
    const networkCondition = this.getNetworkCondition();
    const deviceCapabilities = this.getDeviceCapabilities();
    const userContext = this.analyzeCurrentUserContext();

    return {
      documents: this.predictNextDocuments(userContext, networkCondition),
      translations: this.predictTranslations(userContext),
      images: this.predictImages(userContext, networkCondition)
    };
  }

  /**
   * Preload a specific resource
   */
  async preloadResource(url: string, priority: 'high' | 'medium' | 'low' = 'medium'): Promise<void> {
    if (!this.config.enabled || this.preloadQueue.has(url)) {
      return;
    }

    // Check if we should preload based on conditions
    if (!this.shouldPreloadResource(priority)) {
      return;
    }

    try {
      const preloadPromise = this.fetchWithTimeout(url, 10000);
      this.preloadQueue.set(url, preloadPromise);
      
      this.notifyPreloadingListeners();

      const response = await preloadPromise;
      
      if (response.ok) {
        const data = await response.text();
        const size = new Blob([data]).size;
        
        // Check cache size limit
        if (this.getCurrentCacheSize() + size > this.config.maxCacheSize * 1024 * 1024) {
          this.evictOldestResources();
        }
        
        this.preloadedResources.set(url, {
          data,
          timestamp: Date.now(),
          size
        });
        
        console.log(`Preloaded resource: ${url} (${this.formatBytes(size)})`);
      }
    } catch (error) {
      console.warn(`Failed to preload resource: ${url}`, error);
    } finally {
      this.preloadQueue.delete(url);
      this.notifyPreloadingListeners();
    }
  }

  /**
   * Get preloaded resource
   */
  getPreloadedResource(url: string): any | null {
    const resource = this.preloadedResources.get(url);
    
    if (resource) {
      // Check if resource is still fresh (24 hours)
      const maxAge = 24 * 60 * 60 * 1000;
      if (Date.now() - resource.timestamp < maxAge) {
        return resource.data;
      } else {
        // Remove stale resource
        this.preloadedResources.delete(url);
      }
    }
    
    return null;
  }

  /**
   * Track user behavior
   */
  trackDocumentView(documentId: string, timeSpent: number): void {
    // Update time spent
    this.userBehavior.timeSpentPerDocument[documentId] = 
      (this.userBehavior.timeSpentPerDocument[documentId] || 0) + timeSpent;
    
    // Update document sequences
    const currentSequence = this.getCurrentDocumentSequence();
    currentSequence.push(documentId);
    
    // Save behavior
    this.saveUserBehavior();
    
    // Update preloading strategy
    this.updatePreloadingStrategy();
  }

  /**
   * Track search query
   */
  trackSearchQuery(query: string): void {
    this.userBehavior.searchQueries.push(query);
    
    // Keep only last 50 queries
    if (this.userBehavior.searchQueries.length > 50) {
      this.userBehavior.searchQueries = this.userBehavior.searchQueries.slice(-50);
    }
    
    this.saveUserBehavior();
  }

  /**
   * Track language preference
   */
  trackLanguagePreference(language: string): void {
    if (!this.userBehavior.languagePreferences.includes(language)) {
      this.userBehavior.languagePreferences.unshift(language);
      
      // Keep only top 5 languages
      this.userBehavior.languagePreferences = this.userBehavior.languagePreferences.slice(0, 5);
      
      this.saveUserBehavior();
    }
  }

  /**
   * Add preloading listener
   */
  addPreloadingListener(listener: (status: { active: boolean; queueSize: number }) => void): void {
    this.preloadingListeners.push(listener);
  }

  /**
   * Remove preloading listener
   */
  removePreloadingListener(listener: (status: { active: boolean; queueSize: number }) => void): void {
    const index = this.preloadingListeners.indexOf(listener);
    if (index > -1) {
      this.preloadingListeners.splice(index, 1);
    }
  }

  /**
   * Get preloading statistics
   */
  getPreloadingStats(): {
    totalPreloaded: number;
    cacheSize: number;
    hitRate: number;
    queueSize: number;
    enabled: boolean;
  } {
    const hits = parseInt(localStorage.getItem('preload-cache-hits') || '0');
    const misses = parseInt(localStorage.getItem('preload-cache-misses') || '0');
    const total = hits + misses;
    
    return {
      totalPreloaded: this.preloadedResources.size,
      cacheSize: this.getCurrentCacheSize(),
      hitRate: total > 0 ? (hits / total) * 100 : 0,
      queueSize: this.preloadQueue.size,
      enabled: this.config.enabled
    };
  }

  /**
   * Update configuration
   */
  updateConfiguration(newConfig: Partial<PreloadingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    localStorage.setItem('preloading-config', JSON.stringify(this.config));
    
    if (!this.config.enabled) {
      this.stopPreloading();
    } else if (this.shouldEnablePreloading()) {
      this.startIntelligentPreloading();
    }
  }

  /**
   * Clear preloaded resources
   */
  clearPreloadedResources(): void {
    this.preloadedResources.clear();
    console.log('Preloaded resources cleared');
  }

  /**
   * Private methods
   */
  private loadConfiguration(): void {
    try {
      const saved = localStorage.getItem('preloading-config');
      if (saved) {
        this.config = { ...this.config, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.warn('Failed to load preloading configuration:', error);
    }
  }

  private loadUserBehavior(): void {
    try {
      const saved = localStorage.getItem('user-behavior-pattern');
      if (saved) {
        this.userBehavior = { ...this.userBehavior, ...JSON.parse(saved) };
        this.userBehavior.returnVisitor = true;
      }
    } catch (error) {
      console.warn('Failed to load user behavior:', error);
    }
  }

  private saveUserBehavior(): void {
    try {
      localStorage.setItem('user-behavior-pattern', JSON.stringify(this.userBehavior));
    } catch (error) {
      console.warn('Failed to save user behavior:', error);
    }
  }

  private analyzeUserBehavior(): void {
    // Analyze document sequences to find patterns
    const sequences = this.userBehavior.documentSequences;
    const patterns: Record<string, string[]> = {};
    
    sequences.forEach(sequence => {
      for (let i = 0; i < sequence.length - 1; i++) {
        const current = sequence[i];
        const next = sequence[i + 1];
        
        if (!patterns[current]) {
          patterns[current] = [];
        }
        patterns[current].push(next);
      }
    });
    
    // Store patterns for prediction
    localStorage.setItem('document-patterns', JSON.stringify(patterns));
  }

  private setupBehaviorTracking(): void {
    // Track session time
    const sessionStart = Date.now();
    
    window.addEventListener('beforeunload', () => {
      this.userBehavior.sessionTime = Date.now() - sessionStart;
      this.saveUserBehavior();
    });
    
    // Track page visibility
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.saveUserBehavior();
      }
    });
  }

  private shouldEnablePreloading(): boolean {
    const networkCondition = this.getNetworkCondition();
    const deviceCapabilities = this.getDeviceCapabilities();
    const batteryStatus = this.getBatteryStatus();
    
    // Check network condition
    const networkOrder = ['slow-2g', '2g', '3g', '4g', 'wifi'];
    const currentNetworkIndex = networkOrder.indexOf(networkCondition.effectiveType);
    const thresholdIndex = networkOrder.indexOf(this.config.networkThreshold);
    
    if (currentNetworkIndex < thresholdIndex) {
      return false;
    }
    
    // Check battery level
    if (batteryStatus.level < this.config.batteryThreshold / 100) {
      return false;
    }
    
    // Check memory
    if (deviceCapabilities.memory < this.config.memoryThreshold) {
      return false;
    }
    
    return true;
  }

  private shouldPreloadResource(priority: 'high' | 'medium' | 'low'): boolean {
    // Check queue size
    if (this.preloadQueue.size >= this.config.maxConcurrentRequests) {
      return priority === 'high';
    }
    
    // Check network conditions for different priorities
    const networkCondition = this.getNetworkCondition();
    
    if (priority === 'low' && (networkCondition.effectiveType === '2g' || networkCondition.effectiveType === 'slow-2g')) {
      return false;
    }
    
    return true;
  }

  private startIntelligentPreloading(): void {
    if (this.isPreloading) return;
    
    this.isPreloading = true;
    
    // Start preloading based on strategy
    const strategy = this.getPreloadingStrategy();
    
    // Preload high priority documents first
    strategy.documents
      .filter(doc => doc.priority === 'high')
      .forEach(doc => this.preloadResource(doc.url, doc.priority));
    
    // Preload medium priority documents with delay
    setTimeout(() => {
      strategy.documents
        .filter(doc => doc.priority === 'medium')
        .forEach(doc => this.preloadResource(doc.url, doc.priority));
    }, 2000);
    
    // Preload low priority documents with longer delay
    setTimeout(() => {
      strategy.documents
        .filter(doc => doc.priority === 'low')
        .forEach(doc => this.preloadResource(doc.url, doc.priority));
    }, 5000);
  }

  private stopPreloading(): void {
    this.isPreloading = false;
    
    // Cancel pending requests
    this.preloadQueue.clear();
    this.notifyPreloadingListeners();
  }

  private updatePreloadingStrategy(): void {
    if (this.isPreloading && this.shouldEnablePreloading()) {
      // Restart preloading with updated strategy
      this.stopPreloading();
      setTimeout(() => this.startIntelligentPreloading(), 1000);
    }
  }

  private predictNextDocuments(userContext: any, networkCondition: any): PreloadingStrategy['documents'] {
    const patterns = this.getDocumentPatterns();
    const currentDoc = userContext.currentDocument;
    const predictions: PreloadingStrategy['documents'] = [];
    
    if (currentDoc && patterns[currentDoc]) {
      const nextDocs = patterns[currentDoc];
      const docCounts: Record<string, number> = {};
      
      // Count occurrences
      nextDocs.forEach(doc => {
        docCounts[doc] = (docCounts[doc] || 0) + 1;
      });
      
      // Sort by frequency and add to predictions
      Object.entries(docCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .forEach(([doc, count], index) => {
          predictions.push({
            url: `/docs/support/${doc}.md`,
            priority: index === 0 ? 'high' : index < 3 ? 'medium' : 'low',
            probability: count / nextDocs.length
          });
        });
    }
    
    // Add popular documents if no patterns
    if (predictions.length === 0) {
      const popularDocs = [
        'beginners-guide',
        'troubleshooting-guide',
        'security-guide',
        'quick-faq'
      ];
      
      popularDocs.forEach((doc, index) => {
        predictions.push({
          url: `/docs/support/${doc}.md`,
          priority: index < 2 ? 'high' : 'medium',
          probability: 0.5 - (index * 0.1)
        });
      });
    }
    
    return predictions;
  }

  private predictTranslations(userContext: any): PreloadingStrategy['translations'] {
    const predictions: PreloadingStrategy['translations'] = [];
    const currentDoc = userContext.currentDocument;
    
    if (currentDoc) {
      this.userBehavior.languagePreferences.forEach((lang, index) => {
        if (lang !== 'en') { // Don't preload English if it's the default
          predictions.push({
            language: lang,
            documentId: currentDoc,
            priority: index === 0 ? 'high' : 'medium'
          });
        }
      });
    }
    
    return predictions;
  }

  private predictImages(userContext: any, networkCondition: any): PreloadingStrategy['images'] {
    // For now, return empty array as images are not a primary concern for documentation
    return [];
  }

  private analyzeCurrentUserContext(): any {
    return {
      currentDocument: this.getCurrentDocument(),
      timeOnPage: this.getTimeOnCurrentPage(),
      scrollDepth: this.getScrollDepth(),
      searchQuery: this.getLastSearchQuery()
    };
  }

  private getDocumentPatterns(): Record<string, string[]> {
    try {
      const patterns = localStorage.getItem('document-patterns');
      return patterns ? JSON.parse(patterns) : {};
    } catch (error) {
      return {};
    }
  }

  private getCurrentDocumentSequence(): string[] {
    const sequences = this.userBehavior.documentSequences;
    if (sequences.length === 0) {
      sequences.push([]);
    }
    return sequences[sequences.length - 1];
  }

  private getCurrentDocument(): string | null {
    const path = window.location.pathname;
    const match = path.match(/\/docs\/support\/(.+)\.md/);
    return match ? match[1] : null;
  }

  private getTimeOnCurrentPage(): number {
    const startTime = parseInt(sessionStorage.getItem('page-start-time') || '0');
    return startTime ? Date.now() - startTime : 0;
  }

  private getScrollDepth(): number {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
    return documentHeight > 0 ? (scrollTop / documentHeight) * 100 : 0;
  }

  private getLastSearchQuery(): string | null {
    const queries = this.userBehavior.searchQueries;
    return queries.length > 0 ? queries[queries.length - 1] : null;
  }

  private getNetworkCondition(): any {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    return {
      type: connection?.type || 'unknown',
      effectiveType: connection?.effectiveType || '4g',
      downlink: connection?.downlink || 10,
      rtt: connection?.rtt || 100
    };
  }

  private getDeviceCapabilities(): any {
    return {
      memory: (navigator as any).deviceMemory || 4,
      cores: navigator.hardwareConcurrency || 4
    };
  }

  private getBatteryStatus(): any {
    // Battery API is deprecated, return default values
    return {
      level: 1,
      charging: true
    };
  }

  private detectDeviceType(): 'mobile' | 'desktop' | 'tablet' {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/tablet|ipad/.test(userAgent)) {
      return 'tablet';
    }
    
    if (/mobile|android|iphone/.test(userAgent)) {
      return 'mobile';
    }
    
    return 'desktop';
  }

  private getCurrentCacheSize(): number {
    let totalSize = 0;
    this.preloadedResources.forEach(resource => {
      totalSize += resource.size;
    });
    return totalSize;
  }

  private evictOldestResources(): void {
    const resources = Array.from(this.preloadedResources.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp);
    
    // Remove oldest 25% of resources
    const toRemove = Math.ceil(resources.length * 0.25);
    
    for (let i = 0; i < toRemove; i++) {
      this.preloadedResources.delete(resources[i][0]);
    }
  }

  private async fetchWithTimeout(url: string, timeout: number): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        cache: 'force-cache'
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private notifyPreloadingListeners(): void {
    const status = {
      active: this.isPreloading,
      queueSize: this.preloadQueue.size
    };
    
    this.preloadingListeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('Error in preloading listener:', error);
      }
    });
  }
}

export const intelligentPreloadingService = new IntelligentPreloadingService();