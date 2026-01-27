'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTaxSummary, useComplianceAlerts } from '@/hooks/useTaxApi';
import TaxSummaryCards from './components/TaxSummaryCards';
import TaxLiabilitiesTable from './components/TaxLiabilitiesTable';
import RemittanceBatchesTable from './components/RemittanceBatchesTable';
import ComplianceAlertsWidget from './components/ComplianceAlertsWidget';
import TaxCharts from './components/TaxCharts';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';

/**
 * Tax Admin Dashboard
 * Main dashboard for tax management and compliance monitoring
 */
export default function TaxAdminDashboard() {
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch data
  const { data: summary, isLoading: summaryLoading, error: summaryError } = useTaxSummary(selectedJurisdiction);
  const { data: alertsData, isLoading: alertsLoading } = useComplianceAlerts(false, 1, 5);

  const alerts = alertsData?.data || [];
  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  const warningAlerts = alerts.filter(a => a.severity === 'warning');

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tax Management</h1>
          <p className="text-gray-600 mt-1">Monitor tax liabilities, remittances, and compliance</p>
        </div>
      </div>

      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {criticalAlerts.length} critical tax compliance alert{criticalAlerts.length !== 1 ? 's' : ''}. Immediate action required.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      {!summaryLoading && summary && (
        <TaxSummaryCards summary={summary} onJurisdictionSelect={setSelectedJurisdiction} />
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="liabilities">Liabilities</TabsTrigger>
          <TabsTrigger value="remittances">Remittances</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Charts */}
            <div className="lg:col-span-2">
              <TaxCharts summary={summary} />
            </div>

            {/* Recent Alerts */}
            <div>
              <ComplianceAlertsWidget alerts={alerts.slice(0, 3)} />
            </div>
          </div>
        </TabsContent>

        {/* Liabilities Tab */}
        <TabsContent value="liabilities" className="mt-6">
          <TaxLiabilitiesTable jurisdiction={selectedJurisdiction} />
        </TabsContent>

        {/* Remittances Tab */}
        <TabsContent value="remittances" className="mt-6">
          <RemittanceBatchesTable />
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="mt-6 space-y-6">
          <ComplianceAlertsWidget alerts={alerts} showAll={true} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
