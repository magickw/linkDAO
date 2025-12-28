import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Search,
  Filter,
  Calendar,
  DollarSign,
  Mail,
  Eye,
  RefreshCw,
  ChevronDown,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  Coins
} from 'lucide-react';
import { GlassPanel, Button } from '@/design-system';

interface Receipt {
  id: string;
  receiptNumber: string;
  type: 'MARKETPLACE' | 'LDAO_TOKEN' | 'GOLD';
  orderId: string;
  transactionId: string;
  buyerAddress: string;
  amount: string;
  currency: string;
  paymentMethod: string;
  status: 'completed' | 'pending' | 'failed';
  createdAt: string;
  emailSent?: boolean;
  items?: any[];
  tokensPurchased?: string;
  goldAmount?: number;
}

interface ReceiptsManagementProps {
  onBack?: () => void;
}

export function ReceiptsManagement({ onBack }: ReceiptsManagementProps) {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    loadReceipts();
  }, []);

  const loadReceipts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/receipts');
      if (response.ok) {
        const data = await response.json();
        setReceipts(data.receipts || []);
      }
    } catch (error) {
      console.error('Failed to load receipts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async (receipt: Receipt) => {
    try {
      setSendingEmail(true);
      const response = await fetch('/api/admin/receipts/resend-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiptId: receipt.id }),
      });

      if (response.ok) {
        alert('Receipt email sent successfully!');
        loadReceipts();
      } else {
        alert('Failed to send receipt email');
      }
    } catch (error) {
      console.error('Failed to resend email:', error);
      alert('Error sending receipt email');
    } finally {
      setSendingEmail(false);
      setShowEmailModal(false);
    }
  };

  const getReceiptIcon = (type: string) => {
    switch (type) {
      case 'MARKETPLACE':
        return <Package className="w-5 h-5" />;
      case 'LDAO_TOKEN':
        return <Coins className="w-5 h-5" />;
      case 'GOLD':
        return <DollarSign className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getReceiptTypeLabel = (type: string) => {
    switch (type) {
      case 'MARKETPLACE':
        return 'Marketplace Purchase';
      case 'LDAO_TOKEN':
        return 'LDAO Token Purchase';
      case 'GOLD':
        return 'Gold Purchase';
      default:
        return type;
    }
  };

  const filteredReceipts = receipts.filter(receipt => {
    const matchesSearch = 
      receipt.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      receipt.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      receipt.buyerAddress.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'all' || receipt.type === filterType;
    const matchesStatus = filterStatus === 'all' || receipt.status === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  const stats = {
    total: receipts.length,
    marketplace: receipts.filter(r => r.type === 'MARKETPLACE').length,
    ldao: receipts.filter(r => r.type === 'LDAO_TOKEN').length,
    gold: receipts.filter(r => r.type === 'GOLD').length,
    completed: receipts.filter(r => r.status === 'completed').length,
    pending: receipts.filter(r => r.status === 'pending').length,
    failed: receipts.filter(r => r.status === 'failed').length,
    emailsSent: receipts.filter(r => r.emailSent).length,
    totalAmount: receipts.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0)
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Receipts Management</h1>
          <p className="text-gray-400 text-sm mt-1">View and manage all transaction receipts</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={loadReceipts}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {onBack && (
            <Button variant="secondary" onClick={onBack}>
              Back
            </Button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassPanel className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs">Total Receipts</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-400" />
          </div>
        </GlassPanel>

        <GlassPanel className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs">Total Revenue</p>
              <p className="text-2xl font-bold text-white">${stats.totalAmount.toFixed(2)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-400" />
          </div>
        </GlassPanel>

        <GlassPanel className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs">Emails Sent</p>
              <p className="text-2xl font-bold text-white">{stats.emailsSent}</p>
            </div>
            <Mail className="w-8 h-8 text-purple-400" />
          </div>
        </GlassPanel>

        <GlassPanel className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs">Completed</p>
              <p className="text-2xl font-bold text-white">{stats.completed}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </GlassPanel>
      </div>

      {/* Type Breakdown */}
      <div className="grid grid-cols-3 gap-4">
        <GlassPanel className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Package className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-gray-400 text-xs">Marketplace</p>
              <p className="text-lg font-bold text-white">{stats.marketplace}</p>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <Coins className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-gray-400 text-xs">LDAO Tokens</p>
              <p className="text-lg font-bold text-white">{stats.ldao}</p>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-gray-400 text-xs">Gold</p>
              <p className="text-lg font-bold text-white">{stats.gold}</p>
            </div>
          </div>
        </GlassPanel>
      </div>

      {/* Filters */}
      <GlassPanel className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search receipts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Types</option>
              <option value="MARKETPLACE">Marketplace</option>
              <option value="LDAO_TOKEN">LDAO Tokens</option>
              <option value="GOLD">Gold</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
      </GlassPanel>

      {/* Receipts List */}
      <GlassPanel className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p>Loading receipts...</p>
          </div>
        ) : filteredReceipts.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No receipts found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Receipt #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Buyer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredReceipts.map((receipt) => (
                  <tr key={receipt.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-purple-400" />
                        <span className="text-white font-medium">{receipt.receiptNumber}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getReceiptIcon(receipt.type)}
                        <span className="text-gray-300 text-sm">{getReceiptTypeLabel(receipt.type)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-xs text-gray-400 bg-black/30 px-2 py-1 rounded">
                        {receipt.buyerAddress.substring(0, 8)}...{receipt.buyerAddress.substring(receipt.buyerAddress.length - 6)}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-white font-medium">${parseFloat(receipt.amount).toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(receipt.status)}
                        <span className="text-gray-300 text-sm capitalize">{receipt.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-300 text-sm">
                        {new Date(receipt.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {receipt.emailSent ? (
                        <span className="flex items-center gap-1 text-green-400 text-sm">
                          <CheckCircle className="w-3 h-3" />
                          Sent
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-gray-400 text-sm">
                          <XCircle className="w-3 h-3" />
                          Not Sent
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSelectedReceipt(receipt)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {!receipt.emailSent && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setSelectedReceipt(receipt);
                              setShowEmailModal(true);
                            }}
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassPanel>

      {/* Email Confirmation Modal */}
      {showEmailModal && selectedReceipt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <GlassPanel className="max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">Resend Receipt Email</h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to resend the receipt email for receipt #{selectedReceipt.receiptNumber}?
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowEmailModal(false);
                  setSelectedReceipt(null);
                }}
                disabled={sendingEmail}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => handleResendEmail(selectedReceipt)}
                disabled={sendingEmail}
              >
                {sendingEmail ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Email
                  </>
                )}
              </Button>
            </div>
          </GlassPanel>
        </div>
      )}

      {/* Receipt Detail Modal */}
      {selectedReceipt && !showEmailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <GlassPanel className="max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Receipt Details</h3>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedReceipt(null)}
              >
                ✕
              </Button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-xs">Receipt Number</p>
                  <p className="text-white font-medium">{selectedReceipt.receiptNumber}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Type</p>
                  <p className="text-white font-medium">{getReceiptTypeLabel(selectedReceipt.type)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Order ID</p>
                  <p className="text-white font-medium">{selectedReceipt.orderId}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Transaction ID</p>
                  <p className="text-white font-medium">{selectedReceipt.transactionId}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Buyer Address</p>
                  <code className="text-xs text-gray-400 bg-black/30 px-2 py-1 rounded block">
                    {selectedReceipt.buyerAddress}
                  </code>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Payment Method</p>
                  <p className="text-white font-medium">{selectedReceipt.paymentMethod}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Status</p>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(selectedReceipt.status)}
                    <span className="text-white font-medium capitalize">{selectedReceipt.status}</span>
                  </div>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Amount</p>
                  <p className="text-white font-medium">${parseFloat(selectedReceipt.amount).toFixed(2)} {selectedReceipt.currency}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Created At</p>
                  <p className="text-white font-medium">
                    {new Date(selectedReceipt.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {selectedReceipt.type === 'MARKETPLACE' && selectedReceipt.items && (
                <div>
                  <p className="text-gray-400 text-xs mb-2">Items</p>
                  <div className="bg-black/30 rounded-lg p-4 space-y-2">
                    {selectedReceipt.items.map((item: any, index: number) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-white">{item.name} x{item.quantity}</span>
                        <span className="text-gray-300">${parseFloat(item.totalPrice).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedReceipt.type === 'LDAO_TOKEN' && selectedReceipt.tokensPurchased && (
                <div>
                  <p className="text-gray-400 text-xs mb-2">Tokens Purchased</p>
                  <p className="text-white font-medium">{selectedReceipt.tokensPurchased} LDAO</p>
                </div>
              )}

              {selectedReceipt.type === 'GOLD' && selectedReceipt.goldAmount && (
                <div>
                  <p className="text-gray-400 text-xs mb-2">Gold Amount</p>
                  <p className="text-white font-medium">{selectedReceipt.goldAmount} Gold</p>
                </div>
              )}

              <div className="pt-4 border-t border-white/10">
                <div className="flex justify-end gap-3">
                  {!selectedReceipt.emailSent && (
                    <Button
                      variant="primary"
                      onClick={() => {
                        setShowEmailModal(true);
                      }}
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Resend Email
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    onClick={() => setSelectedReceipt(null)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </GlassPanel>
        </div>
      )}
    </div>
  );
}