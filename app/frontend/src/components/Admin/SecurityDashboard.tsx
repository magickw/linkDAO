import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  FileText,
  Clock
} from 'lucide-react';

interface Vulnerability {
  id: number;
  name: string;
  severity: 'critical' | 'high' | 'moderate' | 'low';
  title: string;
  recommendation: string;
  affectedVersions: string;
  patchedVersions: string;
}

interface SecurityReport {
  timestamp: string;
  totalVulnerabilities: number;
  critical: number;
  high: number;
  moderate: number;
  low: number;
  vulnerablePackages: Vulnerability[];
}

const SecurityDashboard: React.FC = () => {
  const [securityReport, setSecurityReport] = useState<SecurityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<string>('Never');

  // Mock data for demonstration
  const mockSecurityReport: SecurityReport = {
    timestamp: new Date().toISOString(),
    totalVulnerabilities: 41,
    critical: 0,
    high: 8,
    moderate: 12,
    low: 21,
    vulnerablePackages: [
      {
        id: 1,
        name: '@uniswap/v3-periphery',
        severity: 'high',
        title: 'OpenZeppelin Contracts Vulnerabilities',
        recommendation: 'No fix available - monitoring for updates',
        affectedVersions: '<=1.4.4',
        patchedVersions: 'N/A'
      },
      {
        id: 2,
        name: '@uniswap/smart-order-router',
        severity: 'high',
        title: 'OpenZeppelin Contracts Vulnerabilities',
        recommendation: 'No fix available - monitoring for updates',
        affectedVersions: '<=4.22.24',
        patchedVersions: 'N/A'
      },
      {
        id: 3,
        name: '@walletconnect/sign-client',
        severity: 'moderate',
        title: 'Pino Vulnerabilities',
        recommendation: 'Update to latest version when available',
        affectedVersions: '<=2.22.2',
        patchedVersions: 'Pending'
      }
    ]
  };

  useEffect(() => {
    // In a real implementation, this would fetch from an API
    // For now, we'll use mock data
    setTimeout(() => {
      setSecurityReport(mockSecurityReport);
      setLastScan(new Date().toLocaleString());
      setLoading(false);
    }, 1000);
  }, []);

  const runSecurityScan = () => {
    setLoading(true);
    setError(null);
    
    // Simulate running a security scan
    setTimeout(() => {
      setSecurityReport(mockSecurityReport);
      setLastScan(new Date().toLocaleString());
      setLoading(false);
    }, 2000);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'moderate': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'critical': return 'Critical';
      case 'high': return 'High';
      case 'moderate': return 'Moderate';
      case 'low': return 'Low';
      default: return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading security data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Security Dashboard</h1>
        <Button onClick={runSecurityScan} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Run Security Scan
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vulnerabilities</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityReport?.totalVulnerabilities || 0}</div>
            <p className="text-xs text-muted-foreground">Last scan: {lastScan}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{securityReport?.critical || 0}</div>
            <p className="text-xs text-muted-foreground">Immediate action required</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{securityReport?.high || 0}</div>
            <p className="text-xs text-muted-foreground">Priority fixes needed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Moderate</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{securityReport?.moderate || 0}</div>
            <p className="text-xs text-muted-foreground">Monitor and plan fixes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{securityReport?.low || 0}</div>
            <p className="text-xs text-muted-foreground">Low priority issues</p>
          </CardContent>
        </Card>
      </div>

      {securityReport && securityReport.critical > 0 && (
        <Alert variant="destructive">
          <AlertTitle>Critical Security Vulnerabilities Detected</AlertTitle>
          <AlertDescription>
            Immediate action is required to address {securityReport.critical} critical vulnerabilities.
            Please review the vulnerable packages list below and take appropriate action.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Vulnerable Packages</CardTitle>
        </CardHeader>
        <CardContent>
          {securityReport?.vulnerablePackages && securityReport.vulnerablePackages.length > 0 ? (
            <div className="space-y-4">
              {securityReport.vulnerablePackages.map((pkg) => (
                <div key={pkg.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium">{pkg.name}</h3>
                      <Badge className={getSeverityColor(pkg.severity)}>
                        {getSeverityText(pkg.severity)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{pkg.title}</p>
                    <p className="text-sm mt-2">
                      <span className="font-medium">Recommendation:</span> {pkg.recommendation}
                    </p>
                    <div className="flex space-x-4 mt-2 text-sm">
                      <span>
                        <span className="font-medium">Affected:</span> {pkg.affectedVersions}
                      </span>
                      <span>
                        <span className="font-medium">Patched:</span> {pkg.patchedVersions}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
              <p className="text-lg font-medium">No vulnerable packages detected</p>
              <p className="text-muted-foreground">Your dependencies are up to date</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 space-y-2">
            <li>Run security scans daily using the automated script</li>
            <li>Monitor package updates for vulnerable dependencies</li>
            <li>Review and update the security policy annually</li>
            <li>Conduct quarterly penetration testing</li>
            <li>Maintain the approved package whitelist</li>
            <li>Train developers on secure coding practices</li>
          </ul>
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-2">
        <Button variant="outline">
          <FileText className="h-4 w-4 mr-2" />
          View Detailed Report
        </Button>
        <Button>
          <Shield className="h-4 w-4 mr-2" />
          Configure Alerts
        </Button>
      </div>
    </div>
  );
};

export default SecurityDashboard;