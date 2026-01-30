import React, { useState, useEffect } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import { FileText, Download, Printer, ExternalLink, Filter } from 'lucide-react';
import GlassPanel from '../GlassPanel';
import { ENV_CONFIG } from '@/config/environment';
import { enhancedAuthService } from '@/services/enhancedAuthService';

interface Document {
  id: string;
  type: 'RECEIPT' | 'PURCHASE_ORDER' | 'TAX_INVOICE' | 'SELLER_INVOICE';
  number: string;
  date: string;
  total: string;
  pdfUrl?: string;
  orderId: string;
  status: string;
}

const DocumentHub: React.FC = () => {
  const { address } = useWeb3();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const headers = await enhancedAuthService.getAuthHeaders();
      const response = await fetch(`${ENV_CONFIG.BACKEND_URL}/api/documents`, {
        headers
      });

      if (!response.ok) throw new Error('Failed to fetch documents');

      const result = await response.json();
      if (result.success) {
        setDocuments(result.data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredDocs = filter === 'all' 
    ? documents 
    : documents.filter(doc => doc.type === filter);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <FileText className="text-primary-400" />
          My Documents
        </h2>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-white/40" />
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Documents</option>
            <option value="RECEIPT">Receipts</option>
            <option value="PURCHASE_ORDER">Purchase Orders</option>
            <option value="TAX_INVOICE">Tax Invoices</option>
            <option value="SELLER_INVOICE">Seller Invoices</option>
          </select>
        </div>
      </div>

      {filteredDocs.length === 0 ? (
        <div className="text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
          <p className="text-white/40">No documents found matching your filter.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredDocs.map((doc) => (
            <div 
              key={doc.id}
              className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary-500/20 text-primary-400">
                  <FileText size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary-400">
                      {doc.type.replace('_', ' ')}
                    </span>
                    <span className="text-white/20">•</span>
                    <span className="text-white font-medium">#{doc.number}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-white/60">
                    <span>{new Date(doc.date).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>${parseFloat(doc.total).toFixed(2)}</span>
                    <span>•</span>
                    <span className={`capitalize ${
                      doc.status === 'completed' || doc.status === 'paid' ? 'text-green-400' : 'text-yellow-400'
                    }`}>
                      {doc.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {doc.pdfUrl && (
                  <a 
                    href={doc.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors"
                    title="Download PDF"
                  >
                    <Download size={18} />
                  </a>
                )}
                <button 
                  onClick={() => window.open(`/receipts/${doc.id}`, '_blank')}
                  className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors"
                  title="View Details"
                >
                  <ExternalLink size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DocumentHub;
