import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { useAccount } from 'wagmi';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { Button } from '@/design-system/components/Button';
import { Download, Search, Filter, Calendar, FileText, Package } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

interface Receipt {
  id: string;
  orderId: string;
  receiptNumber: string;
  purchaseType: 'marketplace' | 'ldao_tokens';
  status: 'completed' | 'failed' | 'processing';
  amount: string;
  currency: string;
  createdAt: string;
  items?: any[];
  buyerInfo?: any;
}

const ReceiptsPage: React.FC = () => {
  const router = useRouter();
  const { address: walletAddress } = useAccount();
  const { addToast } = useToast();

  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'marketplace' | 'ldao_tokens'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'failed' | 'processing'>('all');

  useEffect(() => {
    if (walletAddress) {
      fetchReceipts();
    }
  }, [walletAddress]);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'https://api.linkdao.io'}/api/receipts?userAddress=${walletAddress}&limit=100&offset=0`
      );
      const data = await response.json();
      
      if (response.ok && data.receipts) {
        setReceipts(data.receipts);
      } else {
        addToast('Failed to load receipts', 'error');
      }
    } catch (error) {
      console.error('Error fetching receipts:', error);
      addToast('Unable to load receipts', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (receiptId: string) => {
    try {
      addToast('Generating PDF...', 'info');
      
      const pdfResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'https://api.linkdao.io'}/api/receipts/${receiptId}/pdf`
      );
      
      if (!pdfResponse.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await pdfResponse.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `linkdao-receipt-${receiptId}-${new Date().toISOString().split('T')[0]}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);

      addToast('Receipt downloaded successfully!', 'success');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      addToast('Unable to download receipt', 'error');
    }
  };

  const filteredReceipts = receipts.filter(receipt => {
    const matchesSearch = 
      receipt.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      receipt.orderId.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'all' || receipt.purchaseType === filterType;
    const matchesStatus = filterStatus === 'all' || receipt.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-300 border border-green-400/30';
      case 'failed':
        return 'bg-red-500/20 text-red-300 border border-red-400/30';
      case 'processing':
        return 'bg-yellow-500/20 text-yellow-300 border border-yellow-400/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border border-gray-400/30';
    }
  };

  const getPurchaseTypeIcon = (type: string) => {
    return type === 'marketplace' ? <Package size={16} /> : <FileText size={16} />;
  };

  if (!walletAddress) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <GlassPanel variant="secondary" className="p-8 text-center">
            <h2 className="text-xl font-semibold text-white mb-2">Connect Your Wallet</h2>
            <p className="text-white/70">Please connect your wallet to view your receipts.</p>
          </GlassPanel>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Receipts</h1>
          <p className="text-white/70">View and download all your purchase receipts</p>
        </div>

        {/* Filters */}
        <GlassPanel variant="secondary" className="p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" size={20} />
              <input
                type="text"
                placeholder="Search receipts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Type Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" size={20} />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
              >
                <option value="all">All Types</option>
                <option value="marketplace">Marketplace</option>
                <option value="ldao_tokens">LDAO Tokens</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" size={20} />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="processing">Processing</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
        </GlassPanel>

        {/* Receipts List */}
        {loading ? (
          <GlassPanel variant="secondary" className="p-8 text-center">
            <div className="text-white/70">Loading receipts...</div>
          </GlassPanel>
        ) : filteredReceipts.length === 0 ? (
          <GlassPanel variant="secondary" className="p-8 text-center">
            <FileText className="w-16 h-16 text-white/30 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No Receipts Found</h2>
            <p className="text-white/70 mb-4">
              {searchQuery || filterType !== 'all' || filterStatus !== 'all'
                ? 'Try adjusting your filters'
                : 'You haven\'t made any purchases yet'}
            </p>
            {(!searchQuery && filterType === 'all' && filterStatus === 'all') && (
              <Button variant="primary" onClick={() => router.push('/marketplace')}>
                Browse Marketplace
              </Button>
            )}
          </GlassPanel>
        ) : (
          <div className="space-y-4">
            {filteredReceipts.map((receipt) => (
              <GlassPanel key={receipt.id} variant="secondary" className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  {/* Receipt Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        {getPurchaseTypeIcon(receipt.purchaseType)}
                        <span className="text-sm text-white/60 capitalize">
                          {receipt.purchaseType.replace('_', ' ')}
                        </span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(receipt.status)}`}>
                        {receipt.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-xs text-white/50">Receipt Number</p>
                        <p className="text-sm font-semibold text-white">{receipt.receiptNumber}</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/50">Order ID</p>
                        <p className="text-sm font-mono text-white/80">{receipt.orderId}</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/50">Date</p>
                        <p className="text-sm text-white/80">
                          {new Date(receipt.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Amount & Actions */}
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-white">
                        {parseFloat(receipt.amount).toFixed(2)} {receipt.currency}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadPDF(receipt.id)}
                      disabled={receipt.status !== 'completed'}
                    >
                      <Download size={16} className="mr-2" />
                      Download PDF
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/marketplace/orders/${receipt.orderId}`)}
                    >
                      View Order
                    </Button>
                  </div>
                </div>
              </GlassPanel>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ReceiptsPage;