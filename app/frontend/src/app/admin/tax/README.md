# Tax Management Frontend Integration

Complete Next.js admin dashboard for managing tax compliance, remittances, and reporting.

## Overview

This tax management system provides a comprehensive frontend interface for:
- **Tax Dashboard**: View tax summary, metrics, and compliance status
- **Liability Management**: Track all tax liabilities with jurisdiction and status
- **Remittance Batches**: Create and manage tax remittance batches for filing
- **Compliance Alerts**: Monitor overdue taxes and filing requirements
- **Tax Analytics**: Visualize tax data with charts and reports

## File Structure

```
app/admin/tax/
├── page.tsx                          # Main dashboard page
└── components/
    ├── TaxSummaryCards.tsx           # Summary metric cards
    ├── TaxLiabilitiesTable.tsx       # Tax liabilities table
    ├── RemittanceBatchesTable.tsx    # Remittance batches table
    ├── CreateRemittanceBatchDialog.tsx # Create batch form
    ├── ComplianceAlertsWidget.tsx    # Compliance alerts display
    └── TaxCharts.tsx                 # Tax data visualizations

app/api/admin/tax/
├── summary/route.ts                 # Tax summary endpoint
├── liabilities/route.ts             # Tax liabilities endpoint
├── remittances/route.ts             # Remittance batches endpoint
└── compliance-alerts/route.ts       # Compliance alerts endpoint

hooks/
└── useTaxApi.ts                     # React Query hooks for tax API

lib/
└── taxUtils.ts                      # Tax utility functions
```

## Components

### 1. TaxAdminDashboard (Main Page)
Central dashboard with:
- **Overview Tab**: Summary cards and charts
- **Liabilities Tab**: All tax liabilities with pagination
- **Remittances Tab**: Tax remittance batches
- **Compliance Tab**: Compliance alerts and monitoring

### 2. TaxSummaryCards
Four key metric cards:
- **Pending Liabilities**: Awaiting filing
- **Filed (Not Paid)**: In remittance queue
- **Paid This Year**: Fully remitted
- **Compliance Score**: Overall compliance percentage

### 3. TaxLiabilitiesTable
Displays:
- Order ID and jurisdiction
- Tax type and amount
- Tax rate and due date
- Current status and remittance reference
- Pagination support

### 4. RemittanceBatchesTable
Manages:
- Batch number and period
- Total tax amount
- Liability count
- Status tracking
- Create new batch functionality

### 5. ComplianceAlertsWidget
Shows:
- Critical alerts (overdue taxes)
- Warning alerts (filings due)
- Info alerts (rate changes)
- Severity indicators
- Alert resolution status

### 6. TaxCharts
Visualizations:
- **Status Distribution**: Bar chart of pending/filed/paid
- **Jurisdiction Breakdown**: Pie chart of tax by location
- **Compliance Score**: Progress indicator

## API Routes

### GET /api/admin/tax/summary
Returns tax summary with counts and amounts by status.

**Query Parameters:**
- `jurisdiction` (optional): Filter by specific jurisdiction

**Response:**
```json
{
  "pending": { "count": 12, "amount": 4250.00 },
  "filed": { "count": 8, "amount": 3200.00 },
  "paid": { "count": 24, "amount": 8500.00 },
  "total": { "count": 44, "amount": 15950.00 },
  "complianceScore": 98
}
```

### GET /api/admin/tax/liabilities
Get paginated list of tax liabilities.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 10)
- `status` (optional): Filter by status
- `jurisdiction` (optional): Filter by jurisdiction

### POST /api/admin/tax/remittances
Create a new tax remittance batch.

**Request Body:**
```json
{
  "jurisdiction": "US-CA",
  "periodStart": "2024-01-01",
  "periodEnd": "2024-03-31"
}
```

### GET /api/admin/tax/remittances
Get paginated list of remittance batches.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 10)
- `status` (optional): Filter by status

### GET /api/admin/tax/compliance-alerts
Get compliance alerts.

**Query Parameters:**
- `resolved` (default: false): Filter by resolution status
- `page` (default: 1)
- `limit` (default: 10)

### PATCH /api/admin/tax/compliance-alerts
Resolve a compliance alert.

**Request Body:**
```json
{
  "alertId": "alert-001",
  "resolved": true
}
```

## React Query Hooks

### useTaxSummary(jurisdiction?)
Fetch tax summary data.

```typescript
const { data: summary, isLoading } = useTaxSummary('US-CA');
```

### useTaxLiabilities(page, limit, status?, jurisdiction?)
Fetch paginated tax liabilities.

```typescript
const { data, isLoading } = useTaxLiabilities(1, 10, 'pending', 'US-CA');
```

### useRemittanceBatches(page, limit, status?)
Fetch remittance batches.

```typescript
const { data, isLoading } = useRemittanceBatches(1, 10, 'filed');
```

### useCreateRemittanceBatch()
Mutation to create a new batch.

```typescript
const createBatch = useCreateRemittanceBatch();
await createBatch.mutateAsync({ jurisdiction, periodStart, periodEnd });
```

### useComplianceAlerts(resolved, page, limit)
Fetch compliance alerts.

```typescript
const { data, isLoading } = useComplianceAlerts(false, 1, 10);
```

### useResolveAlert()
Mutation to resolve an alert.

```typescript
const resolveAlert = useResolveAlert();
await resolveAlert.mutateAsync({ alertId, resolved: true });
```

## Utility Functions

### Tax Formatting
- `formatCurrency(amount, currency)`: Format currency amounts
- `formatDate(date)`: Format dates
- `formatPercentage(value, decimals)`: Format percentages
- `formatJurisdiction(code)`: Convert jurisdiction code to readable name

### Tax Calculations
- `calculateTaxDueDate(date, jurisdiction)`: Calculate when tax is due
- `isOverdue(dueDate)`: Check if tax is overdue
- `daysUntilDue(dueDate)`: Calculate days until due
- `getComplianceScore(total, paid, overdue)`: Calculate compliance score

### Data Generation
- `generateBatchNumber(jurisdiction, period)`: Generate batch number
- `getQuarterlyPeriods(year)`: Get quarterly period dates

## Usage Example

```typescript
// In an admin page
import TaxAdminDashboard from '@/app/admin/tax/page';

export default function AdminPage() {
  return <TaxAdminDashboard />;
}

// Using hooks in a component
import { useTaxSummary, useComplianceAlerts } from '@/hooks/useTaxApi';

export function TaxWidget() {
  const { data: summary } = useTaxSummary();
  const { data: alerts } = useComplianceAlerts(false);

  return (
    <div>
      <h2>Tax Status: ${summary?.total.amount}</h2>
      <p>Alerts: {alerts?.data.length}</p>
    </div>
  );
}
```

## Features

✅ **Real-time Monitoring**: Live tax data with auto-refresh
✅ **Status Tracking**: Track taxes from collection to remittance
✅ **Compliance Alerts**: Critical alerts for overdue taxes
✅ **Batch Management**: Create and manage tax batches
✅ **Multi-Jurisdiction**: Support for multiple tax jurisdictions
✅ **Analytics**: Tax distribution charts and trends
✅ **Pagination**: Handle large datasets efficiently
✅ **Responsive Design**: Works on desktop and mobile
✅ **Error Handling**: Proper error states and messages
✅ **Loading States**: Skeleton screens and spinners

## Dependencies

- `next`: 14+
- `react`: 18+
- `@tanstack/react-query`: 5+
- `recharts`: For data visualization
- UI components (from your component library)
- `lucide-react`: For icons

## Environment Variables

```env
# API endpoints are relative to the frontend
NEXT_PUBLIC_API_URL=/api
```

## Notes

- All API routes should be connected to the actual backend tax services
- Mock data is provided for development - replace with real data fetching
- Implement proper authentication/authorization checks
- Add email notifications for compliance alerts
- Set up real tax authority integrations

## Future Enhancements

- Export tax reports as PDF/CSV
- Email notifications for critical alerts
- Integration with tax authority APIs
- Webhook support for payment confirmations
- Advanced filtering and search
- Custom date range reporting
- Tax projection and forecasting
