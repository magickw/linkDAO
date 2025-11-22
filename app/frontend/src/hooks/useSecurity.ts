/**
 * Security Hook for React Components
 * Provides security validation and management for the enhanced social dashboard
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import SecurityManager, { SecurityValidationResult, SecurityContext } from '../security/securityManager';

export interface UseSecurityConfig {
  enableRealTimeValidation?: boolean;
  autoSanitize?: boolean;
  showWarnings?: boolean;
  logSecurityEvents?: boolean;
}

export interface SecurityState {
  isValidating: boolean;
  lastValidation?: SecurityValidationResult;
  errors: string[];
  warnings: string[];
  blocked: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface SecurityActions {
  validateContent: (content: string) => Promise<SecurityValidationResult>;
  validateMedia: (files: File[]) => Promise<SecurityValidationResult>;
  validateUrl: (url: string) => Promise<SecurityValidationResult>;
  validateTransaction: (transaction: ethers.TransactionRequest, provider: ethers.Provider) => Promise<SecurityValidationResult>;
  performComprehensiveScan: (data: any) => Promise<SecurityValidationResult>;
  clearSecurityState: () => void;
  getSecurityRecommendations: () => string[];
}

export function useSecurity(
  context: Partial<SecurityContext> = {},
  config: UseSecurityConfig = {}
): [SecurityState, SecurityActions] {
  const [state, setState] = useState<SecurityState>({
    isValidating: false,
    errors: [],
    warnings: [],
    blocked: [],
    riskLevel: 'low'
  });

  const securityManager = useRef<SecurityManager>();
  const validationCache = useRef<Map<string, SecurityValidationResult & { timestamp: number }>>(new Map());

  // Initialize security manager
  useEffect(() => {
    const initSecurity = async () => {
      try {
        securityManager.current = SecurityManager.getInstance();
        await securityManager.current.initialize();
      } catch (error) {
        console.error('Failed to initialize security manager:', error);
        setState(prev => ({
          ...prev,
          errors: [`Security initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
          riskLevel: 'critical'
        }));
      }
    };

    initSecurity();
  }, []);

  // Create security context
  const createSecurityContext = useCallback((): SecurityContext => {
    return {
      ...context,
      timestamp: new Date(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      ipAddress: undefined // Would be set by backend
    };
  }, [context]);

  // Update state helper
  const updateState = useCallback((result: SecurityValidationResult) => {
    setState(prev => ({
      ...prev,
      isValidating: false,
      lastValidation: result,
      errors: result.errors,
      warnings: result.warnings,
      blocked: result.blocked,
      riskLevel: result.riskLevel
    }));
  }, []);

  // Validate content
  const validateContent = useCallback(async (content: string): Promise<SecurityValidationResult> => {
    if (!securityManager.current) {
      throw new Error('Security manager not initialized');
    }

    setState(prev => ({ ...prev, isValidating: true }));

    try {
      // Check cache first
      const cacheKey = `content:${content.substring(0, 100)}`;
      const cached = validationCache.current.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 60000) { // 1 minute cache
        updateState(cached);
        return cached;
      }

      const securityContext = createSecurityContext();
      const result = await securityManager.current.validateRichContent(content, securityContext);
      
      // Cache result
      validationCache.current.set(cacheKey, { ...result, timestamp: Date.now() });
      
      updateState(result);
      return result;

    } catch (error) {
      const errorResult: SecurityValidationResult = {
        valid: false,
        errors: [`Content validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        blocked: [],
        riskLevel: 'critical',
        recommendations: ['Content validation failed']
      };
      
      updateState(errorResult);
      return errorResult;
    }
  }, [createSecurityContext, updateState]);

  // Validate media
  const validateMedia = useCallback(async (files: File[]): Promise<SecurityValidationResult> => {
    if (!securityManager.current) {
      throw new Error('Security manager not initialized');
    }

    setState(prev => ({ ...prev, isValidating: true }));

    try {
      const securityContext = createSecurityContext();
      const results: SecurityValidationResult[] = [];

      for (const file of files) {
        const result = await securityManager.current.validateMediaUpload(file, securityContext);
        results.push(result);
      }

      // Combine results
      const combinedResult: SecurityValidationResult = {
        valid: results.every(r => r.valid),
        data: results.map(r => r.data),
        errors: results.flatMap(r => r.errors),
        warnings: results.flatMap(r => r.warnings),
        blocked: results.flatMap(r => r.blocked),
        riskLevel: results.reduce((max, r) => {
          const levels = ['low', 'medium', 'high', 'critical'];
          return levels.indexOf(r.riskLevel) > levels.indexOf(max) ? r.riskLevel : max;
        }, 'low' as any),
        recommendations: results.flatMap(r => r.recommendations)
      };

      updateState(combinedResult);
      return combinedResult;

    } catch (error) {
      const errorResult: SecurityValidationResult = {
        valid: false,
        errors: [`Media validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        blocked: [],
        riskLevel: 'critical',
        recommendations: ['Media validation failed']
      };
      
      updateState(errorResult);
      return errorResult;
    }
  }, [createSecurityContext, updateState]);

  // Validate URL
  const validateUrl = useCallback(async (url: string): Promise<SecurityValidationResult> => {
    if (!securityManager.current) {
      throw new Error('Security manager not initialized');
    }

    setState(prev => ({ ...prev, isValidating: true }));

    try {
      // Check cache first
      const cacheKey = `url:${url}`;
      const cached = validationCache.current.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 300000) { // 5 minute cache for URLs
        updateState(cached);
        return cached;
      }

      const securityContext = createSecurityContext();
      const result = await securityManager.current.generateSecureLinkPreview(url, securityContext);
      
      // Cache result
      validationCache.current.set(cacheKey, { ...result, timestamp: Date.now() });
      
      updateState(result);
      return result;

    } catch (error) {
      const errorResult: SecurityValidationResult = {
        valid: false,
        errors: [`URL validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        blocked: [],
        riskLevel: 'critical',
        recommendations: ['URL validation failed']
      };
      
      updateState(errorResult);
      return errorResult;
    }
  }, [createSecurityContext, updateState]);

  // Validate transaction
  const validateTransaction = useCallback(async (
    transaction: ethers.TransactionRequest,
    provider: ethers.Provider
  ): Promise<SecurityValidationResult> => {
    if (!securityManager.current) {
      throw new Error('Security manager not initialized');
    }

    setState(prev => ({ ...prev, isValidating: true }));

    try {
      const securityContext = createSecurityContext();
      const result = await securityManager.current.validateTokenTransaction(
        transaction,
        provider,
        securityContext
      );
      
      updateState(result);
      return result;

    } catch (error) {
      const errorResult: SecurityValidationResult = {
        valid: false,
        errors: [`Transaction validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        blocked: [],
        riskLevel: 'critical',
        recommendations: ['Transaction validation failed']
      };
      
      updateState(errorResult);
      return errorResult;
    }
  }, [createSecurityContext, updateState]);

  // Perform comprehensive scan
  const performComprehensiveScan = useCallback(async (data: {
    content?: string;
    media?: File[];
    urls?: string[];
    transaction?: ethers.TransactionRequest;
    provider?: ethers.Provider;
  }): Promise<SecurityValidationResult> => {
    if (!securityManager.current) {
      throw new Error('Security manager not initialized');
    }

    setState(prev => ({ ...prev, isValidating: true }));

    try {
      const securityContext = createSecurityContext();
      const result = await securityManager.current.performSecurityScan(
        {
          content: data.content,
          media: data.media,
          urls: data.urls,
          transaction: data.transaction
        },
        securityContext,
        data.provider
      );
      
      updateState(result);
      return result;

    } catch (error) {
      const errorResult: SecurityValidationResult = {
        valid: false,
        errors: [`Comprehensive scan error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        blocked: [],
        riskLevel: 'critical',
        recommendations: ['Security scan failed']
      };
      
      updateState(errorResult);
      return errorResult;
    }
  }, [createSecurityContext, updateState]);

  // Clear security state
  const clearSecurityState = useCallback(() => {
    setState({
      isValidating: false,
      errors: [],
      warnings: [],
      blocked: [],
      riskLevel: 'low'
    });
  }, []);

  // Get security recommendations
  const getSecurityRecommendations = useCallback((): string[] => {
    if (!state.lastValidation) {
      return ['No security validation performed yet'];
    }

    return state.lastValidation.recommendations;
  }, [state.lastValidation]);

  // Real-time validation effect
  useEffect(() => {
    if (!config.enableRealTimeValidation) {
      return;
    }

    // Set up real-time monitoring
    const interval = setInterval(() => {
      // Clean up old cache entries
      const now = Date.now();
      for (const [key, value] of validationCache.current.entries()) {
        if (now - value.timestamp > 600000) { // 10 minutes
          validationCache.current.delete(key);
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [config.enableRealTimeValidation]);

  const actions: SecurityActions = {
    validateContent,
    validateMedia,
    validateUrl,
    validateTransaction,
    performComprehensiveScan,
    clearSecurityState,
    getSecurityRecommendations
  };

  return [state, actions];
}

export default useSecurity;