/**
 * Tax Utilities
 * Helper functions for tax-related operations
 */

export const formatCurrency = (amount: number, currency = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
};

export const formatPercentage = (value: number, decimals = 2): string => {
  return `${(value * 100).toFixed(decimals)}%`;
};

export const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    pending: 'Pending',
    calculated: 'Calculated',
    filed: 'Filed',
    paid: 'Paid',
    partial: 'Partial',
    failed: 'Failed',
    processing: 'Processing',
  };
  return labels[status] || status;
};

export const getTaxTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    sales_tax: 'Sales Tax',
    vat: 'VAT',
    gst: 'GST',
    hst: 'HST',
    pst: 'PST',
  };
  return labels[type] || type;
};

export const getAlertTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    overdue: 'Overdue',
    filing_required: 'Filing Required',
    payment_failed: 'Payment Failed',
    rate_change: 'Rate Change',
  };
  return labels[type] || type;
};

export const calculateTaxDueDate = (
  collectionDate: Date,
  jurisdiction: string
): Date => {
  const date = new Date(collectionDate);
  const month = date.getMonth();

  // US: Quarterly (April 15, July 15, Oct 15, Jan 15)
  if (jurisdiction.startsWith('US-')) {
    const quarter = Math.floor(month / 3);
    const nextQuarter = (quarter + 1) % 4;
    const nextQuarterMonth = nextQuarter === 0 ? 0 : nextQuarter * 3;
    const dueYear = nextQuarter === 0 ? date.getFullYear() + 1 : date.getFullYear();

    return new Date(dueYear, nextQuarterMonth, 15);
  }

  // EU: Monthly (15th of next month)
  if (['GB', 'DE', 'FR', 'IT', 'ES'].includes(jurisdiction)) {
    const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 15);
    return nextMonth;
  }

  // Default: 30 days
  return new Date(date.getTime() + 30 * 24 * 60 * 60 * 1000);
};

export const isOverdue = (dueDate: Date | string): boolean => {
  const d = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  return d < new Date();
};

export const daysUntilDue = (dueDate: Date | string): number => {
  const d = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  const today = new Date();
  const diffTime = d.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const getComplianceScore = (
  totalLiabilities: number,
  paidLiabilities: number,
  overdueLiabilities: number
): number => {
  if (totalLiabilities === 0) return 100;

  const paidPercentage = (paidLiabilities / totalLiabilities) * 100;
  const overduePercentage = (overdueLiabilities / totalLiabilities) * 100;

  // Score = paid% - (overdue% * 2)
  return Math.max(0, Math.min(100, paidPercentage - overduePercentage * 2));
};

export const generateBatchNumber = (jurisdiction: string, period: Date): string => {
  const yearMonth = period.toISOString().slice(0, 7).replace('-', '');
  const random = Math.random().toString(36).slice(2, 8);
  return `TB-${jurisdiction}-${yearMonth}-${random}`;
};

/**
 * Parse jurisdiction code into readable format
 */
export const formatJurisdiction = (jurisdiction: string): string => {
  if (jurisdiction === 'GB') return 'United Kingdom';
  if (jurisdiction.startsWith('US-')) {
    const stateCode = jurisdiction.slice(3);
    const states: Record<string, string> = {
      CA: 'California',
      NY: 'New York',
      TX: 'Texas',
      FL: 'Florida',
      PA: 'Pennsylvania',
      IL: 'Illinois',
      OH: 'Ohio',
      GA: 'Georgia',
      NC: 'North Carolina',
      MI: 'Michigan',
    };
    return states[stateCode] || stateCode;
  }
  return jurisdiction;
};

/**
 * Calculate quarterly periods
 */
export const getQuarterlyPeriods = (year: number) => {
  return [
    {
      quarter: 1,
      label: 'Q1',
      start: new Date(year, 0, 1),
      end: new Date(year, 2, 31),
      dueDate: new Date(year, 3, 15),
    },
    {
      quarter: 2,
      label: 'Q2',
      start: new Date(year, 3, 1),
      end: new Date(year, 5, 30),
      dueDate: new Date(year, 6, 15),
    },
    {
      quarter: 3,
      label: 'Q3',
      start: new Date(year, 6, 1),
      end: new Date(year, 8, 30),
      dueDate: new Date(year, 9, 15),
    },
    {
      quarter: 4,
      label: 'Q4',
      start: new Date(year, 9, 1),
      end: new Date(year, 11, 31),
      dueDate: new Date(year + 1, 0, 15),
    },
  ];
};
