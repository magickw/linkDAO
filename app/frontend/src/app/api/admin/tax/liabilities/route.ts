import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/tax/liabilities
 * Get tax liabilities with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const jurisdiction = searchParams.get('jurisdiction');

    // Mock data - replace with actual database query
    const liabilities = [
      {
        id: 'tl-001',
        orderId: 'order-1001',
        taxJurisdiction: 'US-CA',
        taxRate: 0.0825,
        taxAmount: 125.50,
        taxableAmount: 1500.00,
        taxType: 'sales_tax',
        collectionDate: '2024-01-15',
        dueDate: '2024-04-15',
        status: 'pending',
        remittanceProvider: 'stripe_tax',
      },
      {
        id: 'tl-002',
        orderId: 'order-1002',
        taxJurisdiction: 'US-NY',
        taxRate: 0.0425,
        taxAmount: 85.00,
        taxableAmount: 2000.00,
        taxType: 'sales_tax',
        collectionDate: '2024-01-16',
        dueDate: '2024-04-15',
        status: 'calculated',
        remittanceProvider: 'stripe_tax',
      },
      {
        id: 'tl-003',
        orderId: 'order-1003',
        taxJurisdiction: 'GB',
        taxRate: 0.20,
        taxAmount: 200.00,
        taxableAmount: 1000.00,
        taxType: 'vat',
        collectionDate: '2024-01-17',
        dueDate: '2024-02-28',
        status: 'filed',
        remittanceReference: 'GB-2024-Q1-001',
      },
      {
        id: 'tl-004',
        orderId: 'order-1004',
        taxJurisdiction: 'DE',
        taxRate: 0.19,
        taxAmount: 152.00,
        taxableAmount: 800.00,
        taxType: 'vat',
        collectionDate: '2024-01-18',
        dueDate: '2024-02-15',
        status: 'paid',
        remittanceDate: '2024-02-10',
        remittanceReference: 'DE-2024-01-001',
      },
    ];

    return NextResponse.json({
      data: liabilities,
      pagination: {
        page,
        limit,
        total: 44,
        totalPages: Math.ceil(44 / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tax liabilities' },
      { status: 500 }
    );
  }
}
