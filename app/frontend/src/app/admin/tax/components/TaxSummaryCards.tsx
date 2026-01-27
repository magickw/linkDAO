'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TaxSummary } from '@/hooks/useTaxApi';
import { ArrowUpRight, ArrowDownRight, AlertCircle, CheckCircle2 } from 'lucide-react';

interface TaxSummaryCardsProps {
  summary: TaxSummary;
  onJurisdictionSelect?: (jurisdiction: string | undefined) => void;
}

/**
 * Tax Summary Cards Component
 * Displays key tax metrics in card format
 */
export default function TaxSummaryCards({ summary, onJurisdictionSelect }: TaxSummaryCardsProps) {
  const cards = [
    {
      title: 'Pending Liabilities',
      value: `$${summary.pending.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      count: summary.pending.count,
      icon: AlertCircle,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      trend: 'Awaiting filing',
    },
    {
      title: 'Filed (Not Paid)',
      value: `$${summary.filed.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      count: summary.filed.count,
      icon: CheckCircle2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      trend: 'In remittance queue',
    },
    {
      title: 'Paid This Year',
      value: `$${summary.paid.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      count: summary.paid.count,
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      trend: 'Fully remitted',
    },
    {
      title: 'Compliance Score',
      value: `${summary.complianceScore}%`,
      count: summary.complianceScore > 95 ? 'Excellent' : summary.complianceScore > 85 ? 'Good' : 'At Risk',
      icon: CheckCircle2,
      color: summary.complianceScore > 90 ? 'text-green-600' : 'text-orange-600',
      bgColor: summary.complianceScore > 90 ? 'bg-green-50' : 'bg-orange-50',
      trend: `${summary.overdue > 0 ? `${summary.overdue} overdue` : 'On track'}`,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index} className={card.bgColor}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <Icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <div className="flex justify-between mt-2">
                <p className="text-xs text-gray-600">{card.count} transactions</p>
                <p className={`text-xs ${card.color}`}>{card.trend}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
