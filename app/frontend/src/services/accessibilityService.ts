/**
 * Advanced Accessibility Service
 * Provides comprehensive accessibility features including voice navigation,
 * audio reading, simplified interfaces, and motor impairment accommodations
 */

export interface AccessibilityPreferences {
  // Visual accessibility
  highContrast: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  magnification: number;
  reducedMotion: boolean;
  colorBlindnessFilter: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
  
  // Audio accessibility
  audioReading: boolean;
  audioSpeed: number;
  audioVoice: string;
  soundEffects: boolean;
  
  // Motor accessibility
  alternativeInput: boolean;
  dwellTime: number;
  keyboardNavigation: boolean;
  stickyKeys: boolean;
  
  // Cognitive accessibility
  simplifiedInterface: boolean;
  focusAssist: boolean;
  readingGuide: boolean;
  autoScroll: boolean;
  
  // Voice navigation
  voiceNavigation: boolean;
  voiceCommands: boolean;
  voiceSensitivity: number;
}

export interface VoiceCommand {
  command: string;
  aliases: string[];
  action: () => void;
  description: string;
  category: 'navigation' | 'reading' | 'interaction' | 'system';
}

class AccessibilityService {
  private preferences: AccessibilityPreferences;
  private speechSynthesis: SpeechSynthesis | null = null;
  private speechRecognition: any = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private voiceCommands: Map<string, VoiceCommand> = new Map();
  private isListening: boolean = false;
  private focusTracker: HTMLElement | null = null;

  constructor() {
    this.preferences = this.getDefaultPreferences();
    this.initializeSpeechSynthesis();
    this.initializeSpeechRecognition();
    this.setupVoiceCommands();
    this.loadPreferences();
  }

  /**
   * Get default accessibility preferences
   */
  private getDefaultPreferences(): AccessibilityPreferences {
    return {
      highContrast: false,
      fontSize: 'medium',
      magnification: 1.0,
      reducedMotion: false,
      colorBlindnessFilter: 'none',
      audioReading: false,
      audioSpeed: 1.0,
      audioVoice: 'default',
      soundEffects: true,
      alternativeInput: false,
      dwellTime: 1000,
      keyboardNavigation: true,
      stickyKeys: false,
      simplifiedInterface: false,
      focusAssist: false,
      readingGuide: false,
      autoScroll: false,
      voiceNavigation: false,
      voiceCommands: false,
      voiceSensitivity: 0.7
    };
  }

  /**
   * Initialize speech synthesis
   */
  private initializeSpeechSynthesis(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.speechSynthesis = window.speechSynthesis;
    }
  }

  /**
   * Initialize speech recognition
   */
  private initializeSpeechRecognition(): void {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      this.speechRecognition = new SpeechRecognition();
      this.speechRecognition.continuous = true;
      this.speechRecognition.interimResults = false;
      this.speechRecognition.lang = 'en-US';

      this.speechRecognition.onresult = (event: any) => {
        const command = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
        this.processVoiceCommand(command);
      };

      this.speechRecognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
      };
    }
  }

  /**
   * Set up voice commands
   */
  private setupVoiceCommands(): void {
    if (typeof window === 'undefined') return;

    const commands: VoiceCommand[] = [
      // Navigation commands
      {
        command: 'go home',
        aliases: ['home', 'main page', 'dashboard'],
        action: () => window.location.href = '/',
        description: 'Navigate to home page',
        category: 'navigation'
      },
      {
        command: 'go back',
        aliases: ['back', 'previous page'],
        action: () => window.history.back(),
        description: 'Go to previous page',
        category: 'navigation'
      },
      {
        command: 'scroll up',
        aliases: ['up', 'scroll top'],
        action: () => window.scrollBy(0, -200),
        description: 'Scroll up on the page',
        category: 'navigation'
      },
      {
        command: 'scroll down',
        aliases: ['down', 'scroll bottom'],
        action: () => window.scrollBy(0, 200),
        description: 'Scroll down on the page',
        category: 'navigation'
      },
      
      // Reading commands
      {
        command: 'read page',
        aliases: ['read this', 'start reading'],
        action: () => this.readPageContent(),
        description: 'Read the current page content aloud',
        category: 'reading'
      },
      {
        command: 'stop reading',
        aliases: ['stop', 'pause reading'],
        action: () => this.stopReading(),
        description: 'Stop audio reading',
        category: 'reading'
      },
      {
        command: 'read faster',
        aliases: ['speed up', 'faster'],
        action: () => this.adjustReadingSpeed(0.2),
        description: 'Increase reading speed',
        category: 'reading'
      },
      {
        command: 'read slower',
        aliases: ['slow down', 'slower'],
        action: () => this.adjustReadingSpeed(-0.2),
        description: 'Decrease reading speed',
        category: 'reading'
      },
      
      // Interaction commands
      {
        command: 'click',
        aliases: ['select', 'activate'],
        action: () => this.clickFocusedElement(),
        description: 'Click the currently focused element',
        category: 'interaction'
      },
      {
        command: 'next',
        aliases: ['next element', 'tab'],
        action: () => this.focusNextElement(),
        description: 'Focus next interactive element',
        category: 'interaction'
      },
      {
        command: 'previous',
        aliases: ['previous element', 'shift tab'],
        action: () => this.focusPreviousElement(),
        description: 'Focus previous interactive element',
        category: 'interaction'
      },
      
      // System commands
      {
        command: 'help',
        aliases: ['show help', 'commands'],
        action: () => this.showVoiceCommands(),
        description: 'Show available voice commands',
        category: 'system'
      },
      {
        command: 'settings',
        aliases: ['accessibility settings', 'preferences'],
        action: () => this.openAccessibilitySettings(),
        description: 'Open accessibility settings',
        category: 'system'
      }
    ];

    // Register all commands and their aliases
    commands.forEach(command => {
      this.voiceCommands.set(command.command, command);
      command.aliases.forEach(alias => {
        this.voiceCommands.set(alias, command);
      });
    });
  }

  /**
   * Load saved preferences
   */
  private loadPreferences(): void {
    if (typeof window === 'undefined') return;

    try {
      const saved = localStorage.getItem('accessibility-preferences');
      if (saved) {
        this.preferences = { ...this.preferences, ...JSON.parse(saved) };
        this.applyPreferences();
      }
    } catch (error) {
      console.error('Failed to load accessibility preferences:', error);
    }
  }

  /**
   * Save preferences
   */
  private savePreferences(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem('accessibility-preferences', JSON.stringify(this.preferences));
    } catch (error) {
      console.error('Failed to save accessibility preferences:', error);
    }
  }

  /**
   * Apply accessibility preferences to the page
   */
  private applyPreferences(): void {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    
    // High contrast
    if (this.preferences.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
    
    // Font size
    root.classList.remove('font-small', 'font-medium', 'font-large', 'font-extra-large');
    root.classList.add(`font-${this.preferences.fontSize}`);
    
    // Magnification
    root.style.setProperty('--magnification', this.preferences.magnification.toString());
    
    // Reduced motion
    if (this.preferences.reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }
    
    // Color blindness filter
    if (this.preferences.colorBlindnessFilter !== 'none') {
      root.classList.add(`filter-${this.preferences.colorBlindnessFilter}`);
    } else {
      root.classList.remove('filter-protanopia', 'filter-deuteranopia', 'filter-tritanopia');
    }
    
    // Simplified interface
    if (this.preferences.simplifiedInterface) {
      root.classList.add('simplified-interface');
    } else {
      root.classList.remove('simplified-interface');
    }
    
    // Focus assist
    if (this.preferences.focusAssist) {
      this.enableFocusAssist();
    } else {
      this.disableFocusAssist();
    }
    
    // Reading guide
    if (this.preferences.readingGuide) {
      this.enableReadingGuide();
    } else {
      this.disableReadingGuide();
    }
  }

  /**
   * Update accessibility preferences
   */
  updatePreferences(updates: Partial<AccessibilityPreferences>): void {
    this.preferences = { ...this.preferences, ...updates };
    this.applyPreferences();
    this.savePreferences();

    // Dispatch event for components to react to changes
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('accessibility-preferences-changed', {
        detail: this.preferences
      }));
    }
  }

  /**
   * Get current preferences
   */
  getPreferences(): AccessibilityPreferences {
    return { ...this.preferences };
  }

  /**
   * Start voice navigation
   */
  startVoiceNavigation(): void {
    if (!this.speechRecognition) {
      console.warn('Speech recognition not supported');
      return;
    }
    
    try {
      this.speechRecognition.start();
      this.isListening = true;
      this.speak('Voice navigation activated. Say "help" for available commands.');
    } catch (error) {
      console.error('Failed to start voice navigation:', error);
    }
  }

  /**
   * Stop voice navigation
   */
  stopVoiceNavigation(): void {
    if (this.speechRecognition && this.isListening) {
      this.speechRecognition.stop();
      this.isListening = false;
      this.speak('Voice navigation deactivated.');
    }
  }

  /**
   * Process voice command
   */
  private processVoiceCommand(command: string): void {
    const voiceCommand = this.voiceCommands.get(command);
    
    if (voiceCommand) {
      try {
        voiceCommand.action();
        this.speak(`Executed: ${voiceCommand.description}`);
      } catch (error) {
        console.error('Failed to execute voice command:', error);
        this.speak('Sorry, I could not execute that command.');
      }
    } else {
      this.speak('Command not recognized. Say "help" for available commands.');
    }
  }

  /**
   * Speak text using text-to-speech
   */
  speak(text: string, options?: { rate?: number; voice?: string }): void {
    if (!this.speechSynthesis) {
      console.warn('Speech synthesis not supported');
      return;
    }
    
    // Stop current speech
    this.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options?.rate || this.preferences.audioSpeed;
    utterance.volume = 1;
    
    // Set voice if specified
    if (options?.voice || this.preferences.audioVoice !== 'default') {
      const voices = this.speechSynthesis.getVoices();
      const voice = voices.find(v => v.name === (options?.voice || this.preferences.audioVoice));
      if (voice) {
        utterance.voice = voice;
      }
    }
    
    this.currentUtterance = utterance;
    this.speechSynthesis.speak(utterance);
  }

  /**
   * Stop current speech
   */
  stopReading(): void {
    if (this.speechSynthesis) {
      this.speechSynthesis.cancel();
      this.currentUtterance = null;
    }
  }

  /**
   * Read page content aloud
   */
  readPageContent(): void {
    const content = this.extractReadableContent();
    if (content) {
      this.speak(content);
    }
  }

  /**
   * Extract readable content from the page
   */
  private extractReadableContent(): string {
    const contentSelectors = [
      'main',
      '[role="main"]',
      '.content',
      'article',
      '.document-content'
    ];
    
    for (const selector of contentSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        return this.getTextContent(element);
      }
    }
    
    // Fallback to body content
    return this.getTextContent(document.body);
  }

  /**
   * Get clean text content from element
   */
  private getTextContent(element: Element): string {
    // Clone element to avoid modifying original
    const clone = element.cloneNode(true) as Element;
    
    // Remove script and style elements
    const unwantedElements = clone.querySelectorAll('script, style, nav, header, footer, .sr-only');
    unwantedElements.forEach(el => el.remove());
    
    return clone.textContent?.trim() || '';
  }

  /**
   * Adjust reading speed
   */
  adjustReadingSpeed(delta: number): void {
    const newSpeed = Math.max(0.1, Math.min(3.0, this.preferences.audioSpeed + delta));
    this.updatePreferences({ audioSpeed: newSpeed });
  }

  /**
   * Enable focus assist
   */
  private enableFocusAssist(): void {
    document.addEventListener('focusin', this.handleFocusIn);
    document.addEventListener('focusout', this.handleFocusOut);
  }

  /**
   * Disable focus assist
   */
  private disableFocusAssist(): void {
    document.removeEventListener('focusin', this.handleFocusIn);
    document.removeEventListener('focusout', this.handleFocusOut);
  }

  /**
   * Handle focus in events
   */
  private handleFocusIn = (event: FocusEvent): void => {
    const target = event.target as HTMLElement;
    this.focusTracker = target;
    
    // Add focus indicator
    target.classList.add('accessibility-focus');
    
    // Announce focused element
    if (this.preferences.audioReading) {
      const announcement = this.getElementAnnouncement(target);
      if (announcement) {
        this.speak(announcement);
      }
    }
  };

  /**
   * Handle focus out events
   */
  private handleFocusOut = (event: FocusEvent): void => {
    const target = event.target as HTMLElement;
    target.classList.remove('accessibility-focus');
  };

  /**
   * Get announcement text for element
   */
  private getElementAnnouncement(element: HTMLElement): string {
    const tagName = element.tagName.toLowerCase();
    const role = element.getAttribute('role');
    const ariaLabel = element.getAttribute('aria-label');
    const title = element.getAttribute('title');
    const text = element.textContent?.trim();
    
    let announcement = '';
    
    // Use aria-label if available
    if (ariaLabel) {
      announcement = ariaLabel;
    } else if (title) {
      announcement = title;
    } else if (text) {
      announcement = text;
    }
    
    // Add element type
    if (role) {
      announcement += `, ${role}`;
    } else if (tagName === 'button') {
      announcement += ', button';
    } else if (tagName === 'input') {
      const type = element.getAttribute('type') || 'text';
      announcement += `, ${type} input`;
    } else if (tagName === 'a') {
      announcement += ', link';
    }
    
    return announcement;
  }

  /**
   * Enable reading guide
   */
  private enableReadingGuide(): void {
    // Create reading guide overlay
    const guide = document.createElement('div');
    guide.id = 'reading-guide';
    guide.className = 'reading-guide';
    document.body.appendChild(guide);
    
    // Track mouse movement to position guide
    document.addEventListener('mousemove', this.updateReadingGuide);
  }

  /**
   * Disable reading guide
   */
  private disableReadingGuide(): void {
    const guide = document.getElementById('reading-guide');
    if (guide) {
      guide.remove();
    }
    document.removeEventListener('mousemove', this.updateReadingGuide);
  }

  /**
   * Update reading guide position
   */
  private updateReadingGuide = (event: MouseEvent): void => {
    const guide = document.getElementById('reading-guide');
    if (guide) {
      guide.style.top = `${event.clientY}px`;
    }
  };

  /**
   * Click focused element
   */
  private clickFocusedElement(): void {
    if (this.focusTracker) {
      this.focusTracker.click();
    }
  }

  /**
   * Focus next interactive element
   */
  private focusNextElement(): void {
    const focusableElements = this.getFocusableElements();
    const currentIndex = focusableElements.indexOf(this.focusTracker as HTMLElement);
    const nextIndex = (currentIndex + 1) % focusableElements.length;
    focusableElements[nextIndex]?.focus();
  }

  /**
   * Focus previous interactive element
   */
  private focusPreviousElement(): void {
    const focusableElements = this.getFocusableElements();
    const currentIndex = focusableElements.indexOf(this.focusTracker as HTMLElement);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : focusableElements.length - 1;
    focusableElements[prevIndex]?.focus();
  }

  /**
   * Get all focusable elements
   */
  private getFocusableElements(): HTMLElement[] {
    const selector = 'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])';
    return Array.from(document.querySelectorAll(selector)) as HTMLElement[];
  }

  /**
   * Show voice commands help
   */
  private showVoiceCommands(): void {
    const commands = Array.from(this.voiceCommands.values())
      .filter((command, index, array) => array.findIndex(c => c.command === command.command) === index)
      .map(command => `${command.command}: ${command.description}`)
      .join('. ');
    
    this.speak(`Available voice commands: ${commands}`);
  }

  /**
   * Open accessibility settings
   */
  private openAccessibilitySettings(): void {
    if (typeof window === 'undefined') return;

    // Dispatch event to open accessibility settings modal
    window.dispatchEvent(new CustomEvent('open-accessibility-settings'));
  }

  /**
   * Get available voices
   */
  getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.speechSynthesis) {
      return [];
    }
    return this.speechSynthesis.getVoices();
  }

  /**
   * Check if feature is supported
   */
  isFeatureSupported(feature: 'speech-synthesis' | 'speech-recognition'): boolean {
    switch (feature) {
      case 'speech-synthesis':
        return !!this.speechSynthesis;
      case 'speech-recognition':
        return !!this.speechRecognition;
      default:
        return false;
    }
  }
}

export const accessibilityService = new AccessibilityService();