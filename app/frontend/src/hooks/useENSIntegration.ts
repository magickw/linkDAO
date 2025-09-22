/**
 * ENS Integration Hook
 * Provides ENS/SNS resolution and validation functionality
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ensService, ResolvedName } from '../services/ensService';

export interface UseENSIntegrationOptions {
  autoResolve?: boolean;
  cacheResults?: boolean;
  batchSize?: number;
}

export interface UseENSIntegrationReturn {
  resolvedNames: Map<string, ResolvedName>;
  isLoading: boolean;
  error: string | null;
  resolveName: (name: string) => Promise<ResolvedName>;
  resolveNames: (names: string[]) => Promise<Map<string, ResolvedName>>;
  clearCache: () => void;
  isENSName: (name: string) => boolean;
  isSNSName: (name: string) => boolean;
  isValidAddress: (address: string) => boolean;
}

export const useENSIntegration = (
  initialNames: string[] = [],
  options: UseENSIntegrationOptions = {}
): UseENSIntegrationReturn => {
  const {
    autoResolve = true,
    cacheResults = true,
    batchSize = 5,
  } = options;

  const [resolvedNames, setResolvedNames] = useState<Map<string, ResolvedName>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const pendingResolutions = useRef<Set<string>>(new Set());

  // Resolve a single name
  const resolveName = useCallback(async (name: string): Promise<ResolvedName> => {
    if (!name || name.length === 0) {
      throw new Error('Name cannot be empty');
    }

    // Check if already resolved and cached
    if (cacheResults && resolvedNames.has(name)) {
      return resolvedNames.get(name)!;
    }

    // Check if resolution is already pending
    if (pendingResolutions.current.has(name)) {
      // Wait for pending resolution
      return new Promise((resolve, reject) => {
        const checkResolution = () => {
          if (resolvedNames.has(name)) {
            resolve(resolvedNames.get(name)!);
          } else if (!pendingResolutions.current.has(name)) {
            reject(new Error('Resolution failed'));
          } else {
            setTimeout(checkResolution, 100);
          }
        };
        checkResolution();
      });
    }

    pendingResolutions.current.add(name);
    setError(null);

    try {
      const result = await ensService.resolveName(name);
      
      if (cacheResults) {
        setResolvedNames(prev => new Map(prev).set(name, result));
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Resolution failed';
      setError(errorMessage);
      throw err;
    } finally {
      pendingResolutions.current.delete(name);
    }
  }, [resolvedNames, cacheResults]);

  // Resolve multiple names in batches
  const resolveNames = useCallback(async (names: string[]): Promise<Map<string, ResolvedName>> => {
    if (names.length === 0) {
      return new Map();
    }

    // Filter out already resolved names if caching is enabled
    const namesToResolve = cacheResults 
      ? names.filter(name => !resolvedNames.has(name))
      : names;

    if (namesToResolve.length === 0) {
      // Return cached results
      const results = new Map<string, ResolvedName>();
      names.forEach(name => {
        const resolved = resolvedNames.get(name);
        if (resolved) {
          results.set(name, resolved);
        }
      });
      return results;
    }

    setIsLoading(true);
    setError(null);

    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const results = await ensService.validateNames(namesToResolve);
      
      if (cacheResults) {
        setResolvedNames(prev => {
          const newMap = new Map(prev);
          results.forEach((result, name) => {
            newMap.set(name, result);
          });
          return newMap;
        });
      }

      // Include cached results for complete response
      if (cacheResults) {
        names.forEach(name => {
          if (!results.has(name) && resolvedNames.has(name)) {
            results.set(name, resolvedNames.get(name)!);
          }
        });
      }

      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Batch resolution failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [resolvedNames, cacheResults]);

  // Clear cache
  const clearCache = useCallback(() => {
    setResolvedNames(new Map());
    ensService.clearCache();
  }, []);

  // Utility functions
  const isENSName = useCallback((name: string) => ensService.isENSName(name), []);
  const isSNSName = useCallback((name: string) => ensService.isSNSName(name), []);
  const isValidAddress = useCallback((address: string) => ensService.isEthereumAddress(address), []);

  // Auto-resolve initial names
  useEffect(() => {
    if (autoResolve && initialNames.length > 0) {
      resolveNames(initialNames).catch(err => {
        console.error('Auto-resolution failed:', err);
      });
    }
  }, [initialNames, autoResolve, resolveNames]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    resolvedNames,
    isLoading,
    error,
    resolveName,
    resolveNames,
    clearCache,
    isENSName,
    isSNSName,
    isValidAddress,
  };
};

export default useENSIntegration;