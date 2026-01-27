import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/tax/remittances
 * Get tax remittance batches with status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');

    // Mock data
    const remittances = [
      {
        id: 'batch-001',
        batchNumber: 'TB-US-CA-202401-789012',
        period: {
          start: '2024-01-01',
          end: '2024-03-31',
        },
        jurisdiction: 'US-CA',
        totalTaxAmount: 5200.00,
        totalLiabilities: 24,
        jurisdictionBreakdown: {
          'US-CA': 5200.00,
        },
        status: 'pending',
        createdAt: '2024-01-15',
      },
      {
        id: 'batch-002',
        batchNumber: 'TB-US-NY-202310-654321',
        period: {
          start: '2024-10-01',
          end: '2024-12-31',
        },
        jurisdiction: 'US-NY',
        totalTaxAmount: 3200.00,
        totalLiabilities: 18,
        jurisdictionBreakdown: {
          'US-NY': 3200.00,
        },
        status: 'filed',
        filedAt: '2024-01-10',
        createdAt: '2023-10-15',
      },
      {
        id: 'batch-003',
        batchNumber: 'TB-GB-202310-123456',
        period: {
          start: '2024-10-01',
          end: '2024-12-31',
        },
        jurisdiction: 'GB',
        totalTaxAmount: 2500.00,
        totalLiabilities: 12,
        jurisdictionBreakdown: {
          'GB': 2500.00,
        },
        status: 'paid',
        paidAt: '2024-01-08',
        remittanceReference: 'HMRC-2024-Q4-GB',
        createdAt: '2023-10-15',
      },
    ];

    return NextResponse.json({
      data: remittances,
      pagination: {
        page,
        limit,
        total: 3,
        totalPages: 1,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch remittance batches' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/tax/remittances
 * Create a new tax remittance batch
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jurisdiction, periodStart, periodEnd } = body;

    // Mock batch creation
    const newBatch = {
      id: `batch-${Date.now()}`,
      batchNumber: `TB-${jurisdiction}-${new Date().toISOString().slice(0, 7).replace('-', '')}-${Math.random().toString(36).slice(2, 8)}`,
      period: {
        start: periodStart,
        end: periodEnd,
      },
      jurisdiction,
      totalTaxAmount: 0,
      totalLiabilities: 0,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json(newBatch, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create remittance batch' },
      { status: 500 }
    );
  }
}
