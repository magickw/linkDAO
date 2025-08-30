import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Clock, 
  Check, 
  AlertTriangle, 
  RefreshCw,
  CreditCard,
  Shield,
  Calendar
} from 'lucide-react';
import { ServiceMilestone, MilestonePayment, CreateMilestonePaymentRequest } from '../../types/service';
import { projectManagementService } from '../../services/projectManagementService';

interface MilestonePaymentsProps {
  bookingId: string;
  milestones: ServiceMilestone[];
  userRole: 'client' | 'provider';
  onUpdate?: () => void;
}

const MilestonePayments: React.FC<MilestonePaymentsProps> = ({ 
  bookingId, 
  milestones, 
  userRole, 
  onUpdate 
}) => {
  const [payments, setPayments] = useState<MilestonePayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);

  useEffect(() => {
    loadPayments();
  }, [bookingId, milestones]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      // In a real implementation, we would fetch milestone payments
      // For now, we'll create mock data based on milestones
      const mockPayments: MilestonePayment[] = milestones.map((milestone) => ({
        id: `payment-${milestone.id}`,
        bookingId,
        milestoneId: milestone.id,
        amount: milestone.amount,
        currency: 'ETH',
        status: milestone.status === 'completed' ? 'released' : 
               milestone.status === 'approved' ? 'escrowed' : 'pending',
        dueDate: milestone.dueDate,
        createdAt: milestone.createdAt,
        updatedAt: new Date(),
        milestone
      }));
      setPayments(mockPayments);
    } catch (error) {
      console.error('Failed to load payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePayment = async (milestoneId: string) => {
    const milestone = milestones.find(m => m.id === milestoneId);
    if (!milestone) return;

    try {
      setProcessingPayment(milestoneId);
      await projectManagementService.createMilestonePayment({
        bookingId,
        milestoneId,
        amount: milestone.amount,
        currency: 'ETH',
        dueDate: milestone.dueDate
      });
      await loadPayments();
      onUpdate?.();
    } catch (error) {
      console.error('Failed to create payment:', error);
    } finally {
      setProcessingPayment(null);
    }
  };

  const handleProcessPayment = async (paymentId: string, status: string) => {
    try {
      setProcessingPayment(paymentId);
      await projectManagementService.processMilestonePayment(paymentId, status);
      await loadPayments();
      onUpdate?.();
    } catch (error) {
      console.error('Failed to process payment:', error);
    } finally {
      setProcessingPayment(null);
    }
  };

  const getStatusColor = (status: MilestonePayment['status']) => {
    switch (status) {
      case 'released':
        return 'bg-green-100 text-green-800';
      case 'escrowed':
        return 'bg-blue-100 text-blue-800';
      case 'disputed':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: MilestonePayment['status']) => {
    switch (status) {
      case 'released':
        return <Check className="h-5 w-5 text-green-600" />;
      case 'escrowed':
        return <Shield className="h-5 w-5 text-blue-600" />;
      case 'disputed':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'refunded':
        return <RefreshCw className="h-5 w-5 text-yellow-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const calculateTotalAmount = () => {
    return payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0).toFixed(8);
  };

  const getReleasedAmount = () => {
    return payments
      .filter(p => p.status === 'released')
      .reduce((sum, payment) => sum + parseFloat(payment.amount), 0)
      .toFixed(8);
  };

  if (loading && payments.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Project Value</p>
              <p className="text-2xl font-bold text-gray-900">{calculateTotalAmount()} ETH</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Check className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Released</p>
              <p className="text-2xl font-bold text-gray-900">{getReleasedAmount()} ETH</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Shield className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">In Escrow</p>
              <p className="text-2xl font-bold text-gray-900">
                {payments
                  .filter(p => p.status === 'escrowed')
                  .reduce((sum, payment) => sum + parseFloat(payment.amount), 0)
                  .toFixed(8)} ETH
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payments List */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Milestone Payments</h3>
        
        {payments.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No milestone payments yet</p>
            <p className="text-gray-400 text-sm">Payments will appear as milestones are created</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payments.map((payment) => (
              <div key={payment.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {getStatusIcon(payment.status)}
                      <div>
                        <h4 className="text-lg font-medium text-gray-900">
                          {payment.milestone?.title || `Milestone ${payment.milestone?.milestoneNumber}`}
                        </h4>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(payment.status)}`}>
                          {payment.status}
                        </span>
                      </div>
                    </div>

                    {payment.milestone?.description && (
                      <p className="text-gray-600 mb-3">{payment.milestone.description}</p>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 block">Amount</span>
                        <span className="font-medium">{payment.amount} {payment.currency}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Due Date</span>
                        <span className="font-medium">
                          {payment.dueDate ? new Date(payment.dueDate).toLocaleDateString() : 'Not set'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Created</span>
                        <span className="font-medium">
                          {new Date(payment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Status</span>
                        <span className="font-medium capitalize">
                          {payment.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    {payment.transactionHash && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-600">Transaction: </span>
                        <code className="text-sm font-mono text-blue-600 break-all">
                          {payment.transactionHash}
                        </code>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col space-y-2 ml-4">
                    {userRole === 'client' && payment.status === 'pending' && (
                      <button
                        onClick={() => handleProcessPayment(payment.id, 'escrowed')}
                        disabled={processingPayment === payment.id}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center"
                      >
                        {processingPayment === payment.id ? (
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <CreditCard className="h-4 w-4 mr-2" />
                        )}
                        Fund Escrow
                      </button>
                    )}

                    {userRole === 'client' && payment.status === 'escrowed' && payment.milestone?.status === 'approved' && (
                      <button
                        onClick={() => handleProcessPayment(payment.id, 'released')}
                        disabled={processingPayment === payment.id}
                        className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:bg-green-400 transition-colors flex items-center"
                      >
                        {processingPayment === payment.id ? (
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Check className="h-4 w-4 mr-2" />
                        )}
                        Release Payment
                      </button>
                    )}

                    {payment.status === 'escrowed' && (
                      <button
                        onClick={() => handleProcessPayment(payment.id, 'disputed')}
                        disabled={processingPayment === payment.id}
                        className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:bg-red-400 transition-colors flex items-center"
                      >
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Dispute
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment Instructions */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h4 className="text-lg font-medium text-blue-900 mb-2">Payment Process</h4>
        <div className="text-sm text-blue-700 space-y-2">
          <p>• <strong>Pending:</strong> Milestone created, waiting for client to fund escrow</p>
          <p>• <strong>Escrowed:</strong> Funds locked in smart contract, waiting for milestone completion</p>
          <p>• <strong>Released:</strong> Payment sent to provider after milestone approval</p>
          <p>• <strong>Disputed:</strong> Payment disputed, requires resolution</p>
        </div>
      </div>
    </div>
  );
};

export default MilestonePayments;