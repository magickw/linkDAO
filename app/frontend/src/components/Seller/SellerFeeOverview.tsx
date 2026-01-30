import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { sellerFeeService, SellerFeeCharge, SellerBalance } from '@/services/sellerFeeService';
import { useToast } from '@/context/ToastContext';

interface SellerFeeOverviewProps {
  className?: string;
}

export const SellerFeeOverview: React.FC<SellerFeeOverviewProps> = ({ className = '' }) => {
  const [balance, setBalance] = useState<SellerBalance | null>(null);
  const [charges, setCharges] = useState<SellerFeeCharge[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [balanceData, chargesData] = await Promise.all([
        sellerFeeService.getSellerBalance(),
        sellerFeeService.getFeeCharges(10, 0)
      ]);
      
      setBalance(balanceData);
      setCharges(chargesData);
    } catch (error) {
      addToast('Failed to load fee information', 'error');
      console.error('Error fetching fee data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'charged':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'waived':
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'charged':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'pending':
        return 'secondary';
      case 'waived':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Balance Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Account Balance
            </span>
            <Button variant="ghost" size="sm" onClick={fetchData}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {balance ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-700 font-medium">Available Revenue</p>
                <p className="text-2xl font-bold text-green-900">
                  {sellerFeeService.formatCurrency(balance.availableRevenue)}
                </p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-yellow-700 font-medium">Pending Revenue</p>
                <p className="text-2xl font-bold text-yellow-900">
                  {sellerFeeService.formatCurrency(balance.pendingRevenue)}
                </p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-700 font-medium">Total Revenue</p>
                <p className="text-2xl font-bold text-blue-900">
                  {sellerFeeService.formatCurrency(balance.totalRevenue)}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Unable to load balance information</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Charges */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Recent Fee Charges
          </CardTitle>
        </CardHeader>
        <CardContent>
          {charges.length > 0 ? (
            <div className="space-y-3">
              {charges.map((charge) => (
                <div key={charge.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(charge.status)}
                    <div>
                      <p className="font-medium">{sellerFeeService.getReasonDescription(charge.reason)}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(charge.createdAt).toLocaleDateString()} • {charge.id}
                      </p>
                      {charge.failureReason && (
                        <p className="text-sm text-red-600 mt-1">{charge.failureReason}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={getStatusVariant(charge.status)}>
                      {charge.status.charAt(0).toUpperCase() + charge.status.slice(1)}
                    </Badge>
                    <span className="font-semibold">
                      {sellerFeeService.formatCurrency(charge.amount, charge.currency)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No fee charges found</p>
          )}
        </CardContent>
      </Card>

      {/* Payment Method Info */}
      {balance?.stripeCustomerId && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              <span>Credit card on file for automatic fee payments</span>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              When your available revenue is insufficient to cover fees, we'll automatically charge your saved payment method.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};