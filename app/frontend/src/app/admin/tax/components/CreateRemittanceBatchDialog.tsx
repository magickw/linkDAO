'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface CreateRemittanceBatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: { jurisdiction: string; periodStart: string; periodEnd: string }) => Promise<void>;
  isPending: boolean;
}

const JURISDICTIONS = [
  { value: 'US-CA', label: 'California' },
  { value: 'US-NY', label: 'New York' },
  { value: 'US-TX', label: 'Texas' },
  { value: 'US-FL', label: 'Florida' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'IT', label: 'Italy' },
];

/**
 * Create Remittance Batch Dialog
 * Form to create a new tax remittance batch
 */
export default function CreateRemittanceBatchDialog({
  open,
  onOpenChange,
  onCreate,
  isPending,
}: CreateRemittanceBatchDialogProps) {
  const [jurisdiction, setJurisdiction] = useState('US-CA');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!jurisdiction || !periodStart || !periodEnd) {
      setError('All fields are required');
      return;
    }

    if (new Date(periodStart) >= new Date(periodEnd)) {
      setError('Period start must be before period end');
      return;
    }

    try {
      await onCreate({
        jurisdiction,
        periodStart,
        periodEnd,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to create batch');
    }
  };

  const handleReset = () => {
    setJurisdiction('US-CA');
    setPeriodStart('');
    setPeriodEnd('');
    setError('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Tax Remittance Batch</DialogTitle>
          <DialogDescription>
            Create a new tax remittance batch for filing and payment
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Jurisdiction */}
          <div className="space-y-2">
            <Label htmlFor="jurisdiction">Jurisdiction</Label>
            <Select value={jurisdiction} onValueChange={setJurisdiction}>
              <SelectTrigger id="jurisdiction">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {JURISDICTIONS.map((j) => (
                  <SelectItem key={j.value} value={j.value}>
                    {j.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Period Start */}
          <div className="space-y-2">
            <Label htmlFor="periodStart">Period Start</Label>
            <Input
              id="periodStart"
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              required
            />
          </div>

          {/* Period End */}
          <div className="space-y-2">
            <Label htmlFor="periodEnd">Period End</Label>
            <Input
              id="periodEnd"
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              required
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
              {error}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Batch
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
