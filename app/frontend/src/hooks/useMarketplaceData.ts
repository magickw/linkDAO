/**
 * useMarketplaceData Hook
 * Provides consistent data access with automatic cache management and real-time updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  marketplaceDataManager,
  type DataChangeEvent,
  type PriceData
} from '@/services/marketplaceDataManager';
import { type Product, type SellerInfo } from '@/services/marketplaceService';

// Hook return types
export interface UseProductReturn {
  product: Product | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateProduct: (updates: Partial<Product>) => void;
}

export interface UseSellerReturn {
  seller: SellerInfo | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateSeller: (updates: Partial<SellerInfo>) => void;
}

export interface UsePriceReturn {
  priceData: PriceData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export interface UseProductsReturn {
  products: Product[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
}

// ============================================================================
// INDIVIDUAL PRODUCT HOOK
// ============================================================================

export function useProduct(productId: string | null): UseProductReturn {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentProductId = useRef<string | null>(null);

  const loadProduct = useCallback(async (id: string, forceRefresh = false) => {
    if (currentProductId.current === id && product && !forceRefresh) {
      return; // Already loaded
    }

    setLoading(true);
    setError(null);
    currentProductId.current = id;

    try {
      const productData = await marketplaceDataManager.getProduct(id, forceRefresh);

      // Only update if this is still the current product being requested
      if (currentProductId.current === id) {
        setProduct(productData);
      }
    } catch (err) {
      if (currentProductId.current === id) {
        setError(err instanceof Error ? err.message : 'Failed to load product');
        setProduct(null);
      }
    } finally {
      if (currentProductId.current === id) {
        setLoading(false);
      }
    }
  }, [product]);

  const refresh = useCallback(async () => {
    if (productId) {
      await loadProduct(productId, true);
    }
  }, [productId, loadProduct]);

  const updateProduct = useCallback((updates: Partial<Product>) => {
    if (productId && product) {
      marketplaceDataManager.updateProduct(productId, updates);
    }
  }, [productId, product]);

  // Load product when productId changes
  useEffect(() => {
    if (productId) {
      loadProduct(productId);
    } else {
      setProduct(null);
      setError(null);
      setLoading(false);
      currentProductId.current = null;
    }
  }, [productId, loadProduct]);

  // Subscribe to data changes
  useEffect(() => {
    if (!productId) return;

    const unsubscribe = marketplaceDataManager.subscribe((event: DataChangeEvent) => {
      if (event.type === 'product_updated' && event.productId === productId) {
        setProduct(event.data);
      } else if (event.type === 'product_deleted' && event.productId === productId) {
        setProduct(null);
      }
    });

    return unsubscribe;
  }, [productId]);

  return {
    product,
    loading,
    error,
    refresh,
    updateProduct
  };
}

// ============================================================================
// INDIVIDUAL SELLER HOOK
// ============================================================================

export function useSeller(sellerId: string | null): UseSellerReturn {
  const [seller, setSeller] = useState<SellerInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentSellerId = useRef<string | null>(null);

  const loadSeller = useCallback(async (id: string, forceRefresh = false) => {
    if (currentSellerId.current === id && seller && !forceRefresh) {
      return; // Already loaded
    }

    setLoading(true);
    setError(null);
    currentSellerId.current = id;

    try {
      const sellerData = await marketplaceDataManager.getSeller(id, forceRefresh);

      // Only update if this is still the current seller being requested
      if (currentSellerId.current === id) {
        setSeller(sellerData);
      }
    } catch (err) {
      if (currentSellerId.current === id) {
        setError(err instanceof Error ? err.message : 'Failed to load seller');
        setSeller(null);
      }
    } finally {
      if (currentSellerId.current === id) {
        setLoading(false);
      }
    }
  }, [seller]);

  const refresh = useCallback(async () => {
    if (sellerId) {
      await loadSeller(sellerId, true);
    }
  }, [sellerId, loadSeller]);

  const updateSeller = useCallback((updates: Partial<SellerInfo>) => {
    if (sellerId && seller) {
      marketplaceDataManager.updateSeller(sellerId, updates);
    }
  }, [sellerId, seller]);

  // Load seller when sellerId changes
  useEffect(() => {
    if (sellerId) {
      loadSeller(sellerId);
    } else {
      setSeller(null);
      setError(null);
      setLoading(false);
      currentSellerId.current = null;
    }
  }, [sellerId, loadSeller]);

  // Subscribe to data changes
  useEffect(() => {
    if (!sellerId) return;

    const unsubscribe = marketplaceDataManager.subscribe((event: DataChangeEvent) => {
      if (event.type === 'seller_updated' && event.sellerId === sellerId) {
        setSeller(event.data);
      }
    });

    return unsubscribe;
  }, [sellerId]);

  return {
    seller,
    loading,
    error,
    refresh,
    updateSeller
  };
}

// ============================================================================
// PRICE DATA HOOK
// ============================================================================

export function usePrice(productId: string | null): UsePriceReturn {
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentProductId = useRef<string | null>(null);

  const loadPrice = useCallback(async (id: string, forceRefresh = false) => {
    if (currentProductId.current === id && priceData && !forceRefresh) {
      return; // Already loaded
    }

    setLoading(true);
    setError(null);
    currentProductId.current = id;

    try {
      const price = await marketplaceDataManager.getPrice(id, forceRefresh);

      // Only update if this is still the current product being requested
      if (currentProductId.current === id) {
        setPriceData(price);
      }
    } catch (err) {
      if (currentProductId.current === id) {
        setError(err instanceof Error ? err.message : 'Failed to load price data');
        setPriceData(null);
      }
    } finally {
      if (currentProductId.current === id) {
        setLoading(false);
      }
    }
  }, [priceData]);

  const refresh = useCallback(async () => {
    if (productId) {
      await loadPrice(productId, true);
    }
  }, [productId, loadPrice]);

  // Load price when productId changes
  useEffect(() => {
    if (productId) {
      loadPrice(productId);
    } else {
      setPriceData(null);
      setError(null);
      setLoading(false);
      currentProductId.current = null;
    }
  }, [productId, loadPrice]);

  // Subscribe to price changes
  useEffect(() => {
    if (!productId) return;

    const unsubscribe = marketplaceDataManager.subscribe((event: DataChangeEvent) => {
      if (event.type === 'price_updated' && event.productId === productId) {
        setPriceData(event.priceData);
      }
    });

    return unsubscribe;
  }, [productId]);

  return {
    priceData,
    loading,
    error,
    refresh
  };
}

// ============================================================================
// PRODUCTS LIST HOOK
// ============================================================================

export function useProducts(filters?: any): UseProductsReturn {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const filtersRef = useRef(filters);

  const isMounted = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const loadProducts = useCallback(async (newFilters?: any, reset = false) => {
    setLoading(true);
    setError(null);

    try {
      const currentPage = reset ? 1 : page;
      const searchFilters = {
        ...newFilters,
        limit: 20,
        offset: (currentPage - 1) * 20
      };

      const newProducts = await marketplaceDataManager.getProducts(searchFilters);

      if (!isMounted.current) return;

      if (reset) {
        setProducts(newProducts);
        setPage(2);
      } else {
        setProducts(prev => [...prev, ...newProducts]);
        setPage(prev => prev + 1);
      }

      setHasMore(newProducts.length === 20); // Has more if we got a full page
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Failed to load products');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [page]);

  const refresh = useCallback(async () => {
    setPage(1);
    await loadProducts(filtersRef.current, true);
  }, [loadProducts]);

  const loadMore = useCallback(async () => {
    if (!loading && hasMore) {
      await loadProducts(filtersRef.current, false);
    }
  }, [loading, hasMore, loadProducts]);

  // Load initial products when filters change
  useEffect(() => {
    filtersRef.current = filters;
    setPage(1);
    loadProducts(filters, true);
  }, [filters, loadProducts]);

  // Subscribe to product changes
  useEffect(() => {
    const unsubscribe = marketplaceDataManager.subscribe((event: DataChangeEvent) => {
      if (event.type === 'product_updated') {
        setProducts(prev =>
          prev.map(p => p.id === event.productId ? event.data : p)
        );
      } else if (event.type === 'product_deleted') {
        setProducts(prev =>
          prev.filter(p => p.id !== event.productId)
        );
      } else if (event.type === 'cache_invalidated' && event.entityType === 'product') {
        // Refresh the list when cache is invalidated
        refresh();
      }
    });

    return unsubscribe;
  }, [refresh]);

  return {
    products,
    loading,
    error,
    refresh,
    loadMore,
    hasMore
  };
}

// ============================================================================
// COMBINED PRODUCT AND SELLER HOOK
// ============================================================================

export function useProductWithSeller(productId: string | null) {
  const { product, loading: productLoading, error: productError, refresh: refreshProduct } = useProduct(productId);
  const { seller, loading: sellerLoading, error: sellerError, refresh: refreshSeller } = useSeller(product?.sellerId || null);

  const loading = productLoading || sellerLoading;
  const error = productError || sellerError;

  const refresh = useCallback(async () => {
    await Promise.all([refreshProduct(), refreshSeller()]);
  }, [refreshProduct, refreshSeller]);

  return {
    product,
    seller,
    loading,
    error,
    refresh
  };
}

// ============================================================================
// DATA CONSISTENCY VALIDATION HOOK
// ============================================================================

export function useDataConsistency() {
  const [inconsistencies, setInconsistencies] = useState<string[]>([]);

  const validateConsistency = useCallback(() => {
    const issues: string[] = [];

    // This would run validation checks across cached data
    // For now, we'll just return the cache stats
    const stats = marketplaceDataManager.getCacheStats();

    if (stats.products.hitRate < 0.7) {
      issues.push('Low product cache hit rate');
    }

    if (stats.sellers.hitRate < 0.7) {
      issues.push('Low seller cache hit rate');
    }

    setInconsistencies(issues);
    return issues;
  }, []);

  const getCacheStats = useCallback(() => {
    return marketplaceDataManager.getCacheStats();
  }, []);

  const invalidateAll = useCallback(() => {
    marketplaceDataManager.invalidateAll();
  }, []);

  return {
    inconsistencies,
    validateConsistency,
    getCacheStats,
    invalidateAll
  };
}