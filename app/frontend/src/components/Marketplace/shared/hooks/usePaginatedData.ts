import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';

export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface UsePaginatedDataOptions<T> extends Omit<UseQueryOptions<PaginatedResponse<T>>, 'queryKey' | 'queryFn'> {
  queryKey: string[];
  queryFn: (params: PaginationParams) => Promise<PaginatedResponse<T>>;
  initialPage?: number;
  initialPageSize?: number;
  initialSortBy?: string;
  initialSortOrder?: 'asc' | 'desc';
  autoFetch?: boolean;
}

export function usePaginatedData<T>({
  queryKey,
  queryFn,
  initialPage = 1,
  initialPageSize = 10,
  initialSortBy,
  initialSortOrder = 'desc',
  autoFetch = true,
  ...options
}: UsePaginatedDataOptions<T>) {
  const [pagination, setPagination] = useState<PaginationParams>({
    page: initialPage,
    pageSize: initialPageSize,
    sortBy: initialSortBy,
    sortOrder: initialSortOrder,
  });

  const queryClient = useQueryClient();
  
  const { data, isLoading, isFetching, error, refetch, ...rest } = useQuery<PaginatedResponse<T>>({
    queryKey: [...queryKey, pagination],
    queryFn: () => queryFn(pagination),
    enabled: autoFetch,
    placeholderData: (previousData) => previousData,
    ...options,
  });

  const setPage = useCallback((page: number) => {
    setPagination(prev => ({
      ...prev,
      page,
    }));
  }, []);

  const setPageSize = useCallback((pageSize: number) => {
    setPagination(prev => ({
      ...prev,
      pageSize,
      page: 1, // Reset to first page when page size changes
    }));
  }, []);

  const setSort = useCallback((sortBy: string, sortOrder: 'asc' | 'desc' = 'desc') => {
    setPagination(prev => ({
      ...prev,
      sortBy,
      sortOrder,
      page: 1, // Reset to first page when sort changes
    }));
  }, []);

  // Invalidate and refetch the current page
  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey });
    await refetch();
  }, [queryClient, queryKey, refetch]);

  return {
    data: data?.data || [],
    pagination: {
      ...pagination,
      total: data?.total || 0,
      totalPages: data?.totalPages || 0,
    },
    isLoading,
    isFetching,
    error,
    setPage,
    setPageSize,
    setSort,
    refresh,
    ...rest,
  };
}

export default usePaginatedData;
