'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TaxSummary } from '@/hooks/useTaxApi';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

interface TaxChartsProps {
  summary?: TaxSummary;
}

/**
 * Tax Charts Component
 * Displays tax data visualization with charts
 */
export default function TaxCharts({ summary }: TaxChartsProps) {
  if (!summary) return null;

  // Chart 1: Tax Status Distribution
  const statusData = [
    {
      name: 'Pending',
      value: summary.pending.amount,
      count: summary.pending.count,
    },
    {
      name: 'Filed',
      value: summary.filed.amount,
      count: summary.filed.count,
    },
    {
      name: 'Paid',
      value: summary.paid.amount,
      count: summary.paid.count,
    },
  ];

  // Chart 2: Tax by Jurisdiction (Pie)
  const jurisdictionData = Object.entries(
    Object.assign({}, summary.pending.jurisdictions, summary.filed.jurisdictions, summary.paid.jurisdictions)
  ).map(([jurisdiction, amount]) => ({
    name: jurisdiction,
    value: amount as number,
  }));

  const COLORS = [
    '#3b82f6', // blue
    '#ef4444', // red
    '#10b981', // green
    '#f59e0b', // amber
    '#8b5cf6', // purple
    '#ec4899', // pink
  ];

  return (
    <div className="space-y-4">
      {/* Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Tax Status Distribution</CardTitle>
          <CardDescription>Breakdown of tax liabilities by status</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip
                formatter={(value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
              />
              <Bar dataKey="value" fill="#3b82f6" name="Amount" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Jurisdiction Distribution */}
      {jurisdictionData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tax by Jurisdiction</CardTitle>
            <CardDescription>Tax liability distribution across jurisdictions</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={jurisdictionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: $${value.toFixed(0)}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {jurisdictionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) =>
                    `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Compliance Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance Score Trend</CardTitle>
          <CardDescription>Tax compliance performance over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Current Compliance Score</span>
              <span
                className={`text-2xl font-bold ${
                  summary.complianceScore > 90
                    ? 'text-green-600'
                    : summary.complianceScore > 75
                      ? 'text-yellow-600'
                      : 'text-red-600'
                }`}
              >
                {summary.complianceScore}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  summary.complianceScore > 90
                    ? 'bg-green-600'
                    : summary.complianceScore > 75
                      ? 'bg-yellow-600'
                      : 'bg-red-600'
                }`}
                style={{ width: `${summary.complianceScore}%` }}
              />
            </div>
            <p className="text-xs text-gray-600 mt-2">
              {summary.overdue > 0
                ? `⚠️ ${summary.overdue} overdue item${summary.overdue !== 1 ? 's' : ''}`
                : '✓ All filings on schedule'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
