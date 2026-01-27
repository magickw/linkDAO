import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Tax API Hooks
 * Handles all tax-related API calls for the admin dashboard
 */

// Types
export interface TaxSummary {
  pending: { count: number; amount: number; jurisdictions: Record<string, number> };
  filed: { count: number; amount: number; jurisdictions: Record<string, number> };
  paid: { count: number; amount: number; jurisdictions: Record<string, number> };
  total: { count: number; amount: number };
  dueThisQuarter: number;
  overdue: number;
  complianceScore: number;
}

export interface TaxLiability {
  id: string;
  orderId: string;
  taxJurisdiction: string;
  taxRate: number;
  taxAmount: number;
  taxableAmount: number;
  taxType: string;
  collectionDate: string;
  dueDate: string;
  status: 'pending' | 'calculated' | 'filed' | 'paid' | 'partial' | 'failed';
  remittanceProvider?: string;
  remittanceReference?: string;
}

export interface TaxRemittanceBatch {
  id: string;
  batchNumber: string;
  period: { start: string; end: string };
  jurisdiction: string;
  totalTaxAmount: number;
  totalLiabilities: number;
  jurisdictionBreakdown: Record<string, number>;
  status: 'pending' | 'processing' | 'filed' | 'paid' | 'failed';
  createdAt: string;
  filedAt?: string;
  paidAt?: string;
  remittanceReference?: string;
}

export interface ComplianceAlert {
  id: string;
  alertType: 'overdue' | 'filing_required' | 'payment_failed' | 'rate_change';
  severity: 'info' | 'warning' | 'critical';
  jurisdiction?: string;
  message: string;
  created: string;
  resolved: boolean;
  resolvedAt?: string;
}

// Fetch Tax Summary
export const useTaxSummary = (jurisdiction?: string) => {
  return useQuery({
    queryKey: ['tax-summary', jurisdiction],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (jurisdiction) params.append('jurisdiction', jurisdiction);

      const res = await fetch(`/api/admin/tax/summary?${params}`);
      if (!res.ok) throw new Error('Failed to fetch tax summary');
      return res.json() as Promise<TaxSummary>;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Fetch Tax Liabilities
export const useTaxLiabilities = (
  page = 1,
  limit = 10,
  status?: string,
  jurisdiction?: string
) => {
  return useQuery({
    queryKey: ['tax-liabilities', page, limit, status, jurisdiction],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (status) params.append('status', status);
      if (jurisdiction) params.append('jurisdiction', jurisdiction);

      const res = await fetch(`/api/admin/tax/liabilities?${params}`);
      if (!res.ok) throw new Error('Failed to fetch tax liabilities');
      return res.json() as Promise<{
        data: TaxLiability[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }>;
    },
  });
};

// Fetch Remittance Batches
export const useRemittanceBatches = (page = 1, limit = 10, status?: string) => {
  return useQuery({
    queryKey: ['remittance-batches', page, limit, status],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (status) params.append('status', status);

      const res = await fetch(`/api/admin/tax/remittances?${params}`);
      if (!res.ok) throw new Error('Failed to fetch remittance batches');
      return res.json() as Promise<{
        data: TaxRemittanceBatch[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }>;
    },
  });
};

// Create Remittance Batch
export const useCreateRemittanceBatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { jurisdiction: string; periodStart: string; periodEnd: string }) => {
      const res = await fetch('/api/admin/tax/remittances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create remittance batch');
      return res.json() as Promise<TaxRemittanceBatch>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['remittance-batches'] });
    },
  });
};

// Fetch Compliance Alerts
export const useComplianceAlerts = (resolved = false, page = 1, limit = 10) => {
  return useQuery({
    queryKey: ['compliance-alerts', resolved, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('resolved', resolved.toString());
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      const res = await fetch(`/api/admin/tax/compliance-alerts?${params}`);
      if (!res.ok) throw new Error('Failed to fetch compliance alerts');
      return res.json() as Promise<{
        data: ComplianceAlert[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }>;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Resolve Compliance Alert
export const useResolveAlert = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { alertId: string; resolved: boolean }) => {
      const res = await fetch('/api/admin/tax/compliance-alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to resolve alert');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-alerts'] });
    },
  });
};
