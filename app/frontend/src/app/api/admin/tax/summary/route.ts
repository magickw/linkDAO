import { NextRequest, NextResponse } from 'next/server';
import { taxRemittanceService } from '@/backend/services/tax';

/**
 * GET /api/admin/tax/summary
 * Get tax summary for dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jurisdiction = searchParams.get('jurisdiction');

    // Mock data structure - replace with actual service call
    const summary = {
      pending: {
        count: 12,
        amount: 4250.00,
        jurisdictions: {
          'US-CA': 2100.00,
          'US-NY': 1150.00,
          'GB': 1000.00,
        }
      },
      filed: {
        count: 8,
        amount: 3200.00,
        jurisdictions: {
          'US-CA': 2000.00,
          'US-TX': 1200.00,
        }
      },
      paid: {
        count: 24,
        amount: 8500.00,
        jurisdictions: {
          'US-CA': 5000.00,
          'US-NY': 2000.00,
          'GB': 1500.00,
        }
      },
      total: {
        count: 44,
        amount: 15950.00,
      },
      dueThisQuarter: 3500.00,
      overdue: 0,
      complianceScore: 98,
    };

    return NextResponse.json(summary);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tax summary' },
      { status: 500 }
    );
  }
}
