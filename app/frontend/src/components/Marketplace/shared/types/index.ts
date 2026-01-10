import React from 'react';

// Common status variants for UI elements
export type StatusVariant = 'active' | 'inactive' | 'pending' | 'completed' | 'draft' | 'sold' | 'paused';

// Pagination related types
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

// Action button related types
export type ActionType = 'view' | 'edit' | 'delete' | 'activate' | 'deactivate' | 'complete' | 'cancel';

export interface ActionButtonConfig {
  type: ActionType;
  onClick: () => void;
  label?: string;
  loading?: boolean;
  disabled?: boolean;
  confirmMessage?: string;
  className?: string;
  iconOnly?: boolean;
}

// Data table related types
export interface ColumnDef<T> {
  key: string;
  header: string | React.ReactNode;
  render: (item: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  sortable?: boolean;
  width?: string | number;
}

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  keyField?: string;
  loading?: boolean;
  emptyMessage?: string | React.ReactNode;
  onRowClick?: (item: T) => void;
  className?: string;
  headerClassName?: string;
  rowClassName?: string | ((item: T, index: number) => string);
  actions?: ActionButtonConfig[] | ((item: T) => ActionButtonConfig[]);
  actionsColumnClassName?: string;
  striped?: boolean;
  hoverable?: boolean;
  compact?: boolean;
}

// Common entity types for the Marketplace
export interface BaseEntity {
  id: string | number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface Product extends BaseEntity {
  name: string;
  description: string;
  price: string;
  image?: string;
  status: 'active' | 'draft' | 'sold';
  category: string;
  inventory: number;
}

export interface Order extends BaseEntity {
  productId: string | number;
  buyerAddress: string;
  sellerAddress: string;
  amount: string;
  status: 'pending' | 'completed' | 'cancelled' | 'refunded';
  txHash?: string;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Form related types
export interface FormField<T = any> {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'textarea' | 'file' | 'checkbox' | 'date';
  required?: boolean;
  placeholder?: string;
  options?: { label: string; value: any }[];
  defaultValue?: any;
  validate?: (value: any, values?: T) => string | undefined;
}
