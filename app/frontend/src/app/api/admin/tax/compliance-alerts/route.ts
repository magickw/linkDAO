import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/tax/compliance-alerts
 * Get tax compliance alerts
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const resolved = searchParams.get('resolved') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Mock data
    const alerts = [
      {
        id: 'alert-001',
        alertType: 'filing_required',
        severity: 'warning',
        jurisdiction: 'US-CA',
        message: 'Q1 2024 tax filing due on April 15th',
        created: '2024-04-01',
        resolved: false,
      },
      {
        id: 'alert-002',
        alertType: 'overdue',
        severity: 'critical',
        jurisdiction: 'US-NY',
        message: 'Q4 2023 tax payment overdue by 2 days',
        created: '2024-01-17',
        resolved: false,
      },
      {
        id: 'alert-003',
        alertType: 'rate_change',
        severity: 'info',
        jurisdiction: 'TX',
        message: 'Sales tax rate changed from 8.25% to 8.50%',
        created: '2024-01-10',
        resolved: true,
        resolvedAt: '2024-01-12',
      },
    ];

    const filtered = alerts.filter(a => a.resolved === resolved);

    return NextResponse.json({
      data: filtered.slice((page - 1) * limit, page * limit),
      pagination: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch compliance alerts' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/tax/compliance-alerts/:id
 * Resolve a compliance alert
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { alertId, resolved } = body;

    // Mock update
    const updated = {
      id: alertId,
      resolved,
      resolvedAt: resolved ? new Date().toISOString() : null,
    };

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update alert' },
      { status: 500 }
    );
  }
}
