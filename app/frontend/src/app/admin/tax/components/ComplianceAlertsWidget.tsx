'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ComplianceAlert } from '@/hooks/useTaxApi';
import { AlertCircle, AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';

interface ComplianceAlertsWidgetProps {
  alerts: ComplianceAlert[];
  showAll?: boolean;
}

/**
 * Compliance Alerts Widget Component
 * Displays tax compliance alerts with severity levels
 */
export default function ComplianceAlertsWidget({ alerts, showAll = false }: ComplianceAlertsWidgetProps) {
  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'overdue':
        return AlertTriangle;
      case 'filing_required':
        return AlertCircle;
      case 'payment_failed':
        return XCircle;
      case 'rate_change':
        return Info;
      default:
        return AlertCircle;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-200 text-blue-800';
      default:
        return 'bg-gray-200 text-gray-800';
    }
  };

  const displayAlerts = showAll ? alerts : alerts.slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Compliance Alerts</CardTitle>
        <CardDescription>
          {alerts.length} active alert{alerts.length !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {displayAlerts.length === 0 ? (
            <div className="flex items-center justify-center py-6 text-gray-500">
              <CheckCircle className="h-5 w-5 mr-2" />
              <span>No active alerts</span>
            </div>
          ) : (
            displayAlerts.map((alert) => {
              const Icon = getAlertIcon(alert.alertType);
              return (
                <div
                  key={alert.id}
                  className={`p-3 border rounded-lg ${getSeverityColor(alert.severity)}`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm">{alert.message}</p>
                        <Badge className={getSeverityBadgeColor(alert.severity)}>
                          {alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1)}
                        </Badge>
                      </div>
                      {alert.jurisdiction && (
                        <p className="text-xs opacity-75">
                          Jurisdiction: {alert.jurisdiction}
                        </p>
                      )}
                      <p className="text-xs opacity-75 mt-1">
                        {new Date(alert.created).toLocaleDateString()} at{' '}
                        {new Date(alert.created).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {alerts.length > 3 && !showAll && (
          <Button variant="ghost" className="w-full mt-4" size="sm">
            View all {alerts.length} alerts
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
