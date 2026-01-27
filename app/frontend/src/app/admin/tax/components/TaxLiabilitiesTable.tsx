'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTaxLiabilities } from '@/hooks/useTaxApi';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

interface TaxLiabilitiesTableProps {
  jurisdiction?: string;
}

/**
 * Tax Liabilities Table Component
 * Displays all tax liabilities with status and details
 */
export default function TaxLiabilitiesTable({ jurisdiction }: TaxLiabilitiesTableProps) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { data, isLoading, error } = useTaxLiabilities(page, limit, undefined, jurisdiction);
  const liabilities = data?.data || [];
  const pagination = data?.pagination;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'calculated':
        return 'bg-blue-100 text-blue-800';
      case 'filed':
        return 'bg-purple-100 text-purple-800';
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTaxTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      sales_tax: 'Sales Tax',
      vat: 'VAT',
      gst: 'GST',
      hst: 'HST',
      pst: 'PST',
    };
    return labels[type] || type;
  };

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="pt-6 text-red-600">
          Error loading tax liabilities. Please try again.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tax Liabilities</CardTitle>
        <CardDescription>
          All collected taxes and their remittance status
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Jurisdiction</TableHead>
                    <TableHead>Tax Type</TableHead>
                    <TableHead>Tax Amount</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {liabilities.map((liability) => (
                    <TableRow key={liability.id} className="hover:bg-gray-50">
                      <TableCell className="font-mono text-sm">{liability.orderId}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{liability.taxJurisdiction}</Badge>
                      </TableCell>
                      <TableCell>{getTaxTypeLabel(liability.taxType)}</TableCell>
                      <TableCell className="font-medium">
                        ${liability.taxAmount.toFixed(2)}
                      </TableCell>
                      <TableCell>{(liability.taxRate * 100).toFixed(2)}%</TableCell>
                      <TableCell>
                        {new Date(liability.dueDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(liability.status)}>
                          {liability.status.charAt(0).toUpperCase() + liability.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm text-gray-500">
                        {liability.remittanceReference || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <p className="text-sm text-gray-600">
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
                    disabled={page === pagination.totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
