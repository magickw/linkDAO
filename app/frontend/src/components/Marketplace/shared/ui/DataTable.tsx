import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { StatusBadge, StatusVariant } from './StatusBadge';
import { ActionButtons, ActionButtonConfig } from './ActionButtons';

export interface Column<T> {
  key: string;
  header: string | ReactNode;
  render: (item: T) => ReactNode;
  className?: string;
  headerClassName?: string;
  sortable?: boolean;
  width?: string | number;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyField?: string;
  loading?: boolean;
  emptyMessage?: string | ReactNode;
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

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  keyField = 'id',
  loading = false,
  emptyMessage = 'No data available',
  onRowClick,
  className = '',
  headerClassName = '',
  rowClassName = '',
  actions,
  actionsColumnClassName = 'w-40',
  striped = true,
  hoverable = true,
  compact = false,
}: DataTableProps<T>) {
  const getRowClassName = (item: T, index: number) => {
    const baseClasses = [
      'transition-colors',
      hoverable && 'hover:bg-white/5',
      striped && index % 2 === 0 ? 'bg-white/2.5' : 'bg-white/5',
      onRowClick && 'cursor-pointer',
      typeof rowClassName === 'function' ? rowClassName(item, index) : rowClassName,
    ];

    return cn(baseClasses);
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {Array(5).fill(0).map((_, i) => (
          <div key={i} className="h-12 bg-white/5 animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-white/60 text-sm">
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full">
        <thead>
          <tr className={cn('text-left text-xs font-medium text-white/60', headerClassName)}>
            {columns.map((column) => (
              <th 
                key={column.key}
                className={cn(
                  'px-4 py-3 first:pl-6 last:pr-6',
                  column.headerClassName,
                  compact ? 'py-2' : 'py-3',
                  column.sortable && 'cursor-pointer hover:text-white/80'
                )}
                style={{ width: column.width }}
              >
                {column.header}
              </th>
            ))}
            {actions && <th className={cn('w-0', actionsColumnClassName)} />}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {data.map((item, rowIndex) => (
            <tr 
              key={item[keyField] || rowIndex}
              className={getRowClassName(item, rowIndex)}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((column) => (
                <td 
                  key={`${item[keyField]}-${column.key}`}
                  className={cn(
                    'whitespace-nowrap px-4 py-3 text-sm first:pl-6 last:pr-6',
                    column.className,
                    compact ? 'py-2' : 'py-3'
                  )}
                >
                  {column.render(item)}
                </td>
              ))}
              {actions && (
                <td 
                  className="whitespace-nowrap px-4 py-3 text-right text-sm"
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                >
                  <ActionButtons 
                    actions={typeof actions === 'function' ? actions(item) : actions} 
                    size={compact ? 'sm' : 'default'}
                    spacing="xs"
                  />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
