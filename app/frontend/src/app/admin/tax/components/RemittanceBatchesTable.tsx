'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRemittanceBatches, useCreateRemittanceBatch } from '@/hooks/useTaxApi';
import { ChevronLeft, ChevronRight, Loader2, Plus } from 'lucide-react';
import CreateRemittanceBatchDialog from './CreateRemittanceBatchDialog';

/**
 * Remittance Batches Table Component
 * Displays tax remittance batches and their status
 */
export default function RemittanceBatchesTable() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data, isLoading, error } = useRemittanceBatches(page, limit);
  const createBatch = useCreateRemittanceBatch();

  const batches = data?.data || [];
  const pagination = data?.pagination;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
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

  const handleCreateBatch = async (data: { jurisdiction: string; periodStart: string; periodEnd: string }) => {
    try {
      await createBatch.mutateAsync(data);
      setShowCreateDialog(false);
    } catch (error) {
      console.error('Error creating batch:', error);
    }
  };

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="pt-6 text-red-600">
          Error loading remittance batches. Please try again.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Tax Remittance Batches</CardTitle>
            <CardDescription>
              Grouped tax liabilities ready for filing and remittance
            </CardDescription>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            disabled={createBatch.isPending}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Batch
          </Button>
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
                      <TableHead>Batch Number</TableHead>
                      <TableHead>Jurisdiction</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Tax Amount</TableHead>
                      <TableHead className="text-right">Liabilities</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batches.map((batch) => (
                      <TableRow key={batch.id} className="hover:bg-gray-50">
                        <TableCell className="font-mono text-sm">
                          {batch.batchNumber}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{batch.jurisdiction}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(batch.period.start).toLocaleDateString()} -{' '}
                          {new Date(batch.period.end).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${batch.totalTaxAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right">
                          {batch.totalLiabilities} items
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(batch.status)}>
                            {batch.status.charAt(0).toUpperCase() + batch.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {new Date(batch.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
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

      {/* Create Batch Dialog */}
      <CreateRemittanceBatchDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreate={handleCreateBatch}
        isPending={createBatch.isPending}
      />
    </>
  );
}
