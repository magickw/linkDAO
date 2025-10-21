import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKey } from '@tanstack/react-query';

interface Entity {
  id: string | number;
  [key: string]: any;
}

type IdType = string | number;

export interface CrudOptions<T extends Entity> {
  queryKey: QueryKey;
  createFn: (data: Omit<T, 'id'>) => Promise<T>;
  updateFn: (id: IdType, updates: Partial<T>) => Promise<T>;
  deleteFn: (id: IdType) => Promise<void>;
  onSuccess?: (operation: 'create' | 'update' | 'delete', data?: T) => void;
  onError?: (error: Error, operation: 'create' | 'update' | 'delete', data?: any) => void;
}

export function useCrudOperations<T extends Entity>({
  queryKey,
  createFn,
  updateFn,
  deleteFn,
  onSuccess,
  onError,
}: CrudOptions<T>) {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: createFn,
    onMutate: async (newItem) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousItems = queryClient.getQueryData<T[]>(queryKey) || [];

      // Create a properly typed temporary item
      const tempItem = { ...newItem, id: 'temp-id' } as unknown as T;
      
      // Optimistically update to the new value
      queryClient.setQueryData<T[]>(queryKey, [...previousItems, tempItem]);

      return { previousItems };
    },
    onError: (error, newItem, context) => {
      // Rollback on error
      if (context?.previousItems) {
        queryClient.setQueryData(queryKey, context.previousItems);
      }
      // Type guard to ensure error is an Error instance
      const errorObj = error instanceof Error ? error : new Error(String(error));
      onError?.(errorObj, 'create', newItem);
    },
    onSuccess: (data) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey });
      onSuccess?.('create', data);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...updates }: { id: IdType } & Partial<T>) => updateFn(id, updates as Partial<T>),
    onMutate: async (updatedItem) => {
      await queryClient.cancelQueries({ queryKey });
      const previousItems = queryClient.getQueryData<T[]>(queryKey) || [];
      
      // Optimistically update the item
      queryClient.setQueryData<T[]>(
        queryKey,
        previousItems.map((item) => 
          String(item.id) === String(updatedItem.id) 
            ? { ...item, ...updatedItem } 
            : item
        )
      );

      return { previousItems };
    },
    onError: (error, variables, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(queryKey, context.previousItems);
      }
      // Type guard to ensure error is an Error instance
      const errorObj = error instanceof Error ? error : new Error(String(error));
      onError?.(errorObj, 'update', variables);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey });
      onSuccess?.('update', data);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFn,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const previousItems = queryClient.getQueryData<T[]>(queryKey) || [];
      
      // Optimistically remove the item
      queryClient.setQueryData<T[]>(
        queryKey,
        previousItems.filter((item) => String(item.id) !== String(id))
      );

      return { previousItems };
    },
    onError: (error, id, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(queryKey, context.previousItems);
      }
      // Type guard to ensure error is an Error instance
      const errorObj = error instanceof Error ? error : new Error(String(error));
      onError?.(errorObj, 'delete', { id });
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey });
      onSuccess?.('delete', { id } as any);
    },
  });

  return {
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    createError: createMutation.error,
    updateError: updateMutation.error,
    deleteError: deleteMutation.error,
    reset: () => {
      createMutation.reset();
      updateMutation.reset();
      deleteMutation.reset();
    },
  };
}

export default useCrudOperations;
