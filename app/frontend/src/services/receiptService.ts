import { PaymentReceipt, ReceiptType } from '../types/receipt';

class ReceiptService {
  private apiBaseUrl: string;

  constructor() {
    this.apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  }

  /**
   * Get receipt by ID
   */
  async getReceiptById(receiptId: string): Promise<PaymentReceipt | null> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/receipts/${receiptId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error('Failed to fetch receipt');
      }

      const { receipt } = await response.json();
      return this.formatReceipt(receipt);
    } catch (error) {
      console.error('Error fetching receipt:', error);
      throw error;
    }
  }

  /**
   * Get receipts by user address
   */
  async getReceiptsByUser(userAddress: string, limit: number = 50, offset: number = 0): Promise<PaymentReceipt[]> {
    try {
      const params = new URLSearchParams({
        userAddress,
        limit: limit.toString(),
        offset: offset.toString()
      });

      const response = await fetch(`${this.apiBaseUrl}/api/receipts?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch receipts');
      }

      const { receipts } = await response.json();
      return receipts.map((receipt: any) => this.formatReceipt(receipt));
    } catch (error) {
      console.error('Error fetching receipts:', error);
      throw error;
    }
  }

  /**
   * Get receipts by order ID
   */
  async getReceiptsByOrderId(orderId: string): Promise<PaymentReceipt[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/receipts/order/${orderId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch receipts');
      }

      const { receipts } = await response.json();
      return receipts.map((receipt: any) => this.formatReceipt(receipt));
    } catch (error) {
      console.error('Error fetching receipts:', error);
      throw error;
    }
  }

  /**
   * Download receipt as PDF
   */
  async downloadReceiptPDF(receiptId: string): Promise<void> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/receipts/${receiptId}/pdf`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to download receipt');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${receiptId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading receipt:', error);
      throw error;
    }
  }

  /**
   * Print receipt
   */
  printReceipt(receipt: PaymentReceipt): void {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Unable to open print window');
      }

      const isMarketplaceReceipt = receipt.type === ReceiptType.MARKETPLACE;
      const isLDAOReceipt = receipt.type === ReceiptType.LDAO_TOKEN;

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Receipt - ${receipt.receiptNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
            .section { margin-bottom: 30px; }
            .section-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #333; }
            .row { display: flex; justify-content: space-between; margin-bottom: 10px; }
            .label { font-weight: bold; }
            .value { text-align: right; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .items-table th { background-color: #f5f5f5; }
            .total-row { font-weight: bold; }
            .status-completed { color: green; }
            .status-failed { color: red; }
            .status-processing { color: orange; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Payment Receipt</h1>
            <p>Receipt #${receipt.receiptNumber}</p>
            <p>Date: ${new Date(receipt.createdAt).toLocaleDateString()}</p>
          </div>

          <div class="section">
            <div class="section-title">Purchase Type</div>
            <p>${isMarketplaceReceipt ? 'Marketplace Purchase' : 'LDAO Token Purchase'}</p>
          </div>

          <div class="section">
            <div class="section-title">Buyer Information</div>
            <div class="row">
              <span class="label">Wallet Address:</span>
              <span class="value">${receipt.buyerAddress}</span>
            </div>
            <div class="row">
              <span class="label">Payment Method:</span>
              <span class="value">${receipt.paymentMethod}</span>
            </div>
            ${receipt.transactionHash ? `
            <div class="row">
              <span class="label">Transaction Hash:</span>
              <span class="value">${receipt.transactionHash}</span>
            </div>
            ` : ''}
          </div>

          ${isMarketplaceReceipt ? `
          <div class="section">
            <div class="section-title">Seller Information</div>
            <div class="row">
              <span class="label">Name:</span>
              <span class="value">${(receipt as any).sellerName || 'N/A'}</span>
            </div>
            <div class="row">
              <span class="label">Wallet Address:</span>
              <span class="value">${(receipt as any).sellerAddress || 'N/A'}</span>
            </div>
          </div>
          ` : ''}

          ${isMarketplaceReceipt ? `
          <div class="section">
            <div class="section-title">Order Items</div>
            <table class="items-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${(receipt as any).items.map((item: any) => `
                  <tr>
                    <td>${item.name}</td>
                    <td>${item.quantity}</td>
                    <td>${parseFloat(item.unitPrice).toFixed(2)}</td>
                    <td>${parseFloat(item.totalPrice).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}

          ${isLDAOReceipt ? `
          <div class="section">
            <div class="section-title">Token Purchase Details</div>
            <div class="row">
              <span class="label">Tokens Purchased:</span>
              <span class="value">${(receipt as any).tokensPurchased}</span>
            </div>
            <div class="row">
              <span class="label">Price Per Token:</span>
              <span class="value">$${parseFloat((receipt as any).pricePerToken).toFixed(2)}</span>
            </div>
          </div>
          ` : ''}

          <div class="section">
            <div class="section-title">Payment Summary</div>
            <div class="row">
              <span class="label">Subtotal:</span>
              <span class="value">$${parseFloat(receipt.amount).toFixed(2)}</span>
            </div>
            ${receipt.fees ? `
              ${receipt.fees.processing && parseFloat(receipt.fees.processing) > 0 ? `
              <div class="row">
                <span class="label">Processing Fee:</span>
                <span class="value">$${parseFloat(receipt.fees.processing).toFixed(2)}</span>
              </div>
              ` : ''}
              ${receipt.fees.platform && parseFloat(receipt.fees.platform) > 0 ? `
              <div class="row">
                <span class="label">Platform Fee:</span>
                <span class="value">$${parseFloat(receipt.fees.platform).toFixed(2)}</span>
              </div>
              ` : ''}
              ${receipt.fees.gas && parseFloat(receipt.fees.gas) > 0 ? `
              <div class="row">
                <span class="label">Gas Fee:</span>
                <span class="value">$${parseFloat(receipt.fees.gas).toFixed(2)}</span>
              </div>
              ` : ''}
              <div class="row total-row">
                <span class="label">Total Fees:</span>
                <span class="value">$${parseFloat(receipt.fees.total).toFixed(2)}</span>
              </div>
            ` : ''}
            <div class="row total-row">
              <span class="label">Total Paid:</span>
              <span class="value">$${(parseFloat(receipt.amount) + (receipt.fees ? parseFloat(receipt.fees.total) : 0)).toFixed(2)}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Transaction Status</div>
            <p class="status-${receipt.status}">
              ${receipt.status === 'completed' ? 'Payment Confirmed' : 
                receipt.status === 'failed' ? 'Payment Failed' : 'Processing'}
            </p>
          </div>

          <div class="no-print" style="text-align: center; margin-top: 30px;">
            <button onclick="window.print()">Print Receipt</button>
            <button onclick="window.close()">Close</button>
          </div>
        </body>
        </html>
      `);

      printWindow.document.close();
      printWindow.focus();
    } catch (error) {
      console.error('Error printing receipt:', error);
      throw error;
    }
  }

  // Private helper methods

  private formatReceipt(receipt: any): PaymentReceipt {
    const baseReceipt = {
      id: receipt.id,
      type: receipt.type,
      transactionId: receipt.transactionId,
      buyerAddress: receipt.buyerAddress,
      amount: receipt.amount,
      currency: receipt.currency,
      paymentMethod: receipt.paymentMethod,
      transactionHash: receipt.transactionHash,
      status: receipt.status,
      receiptNumber: receipt.receiptNumber,
      downloadUrl: receipt.downloadUrl,
      createdAt: new Date(receipt.createdAt),
      completedAt: receipt.completedAt ? new Date(receipt.completedAt) : undefined,
      metadata: receipt.metadata
    };

    if (receipt.type === ReceiptType.MARKETPLACE) {
      return {
        ...baseReceipt,
        type: ReceiptType.MARKETPLACE,
        orderId: receipt.orderId,
        items: receipt.items || [],
        fees: receipt.fees,
        sellerAddress: receipt.sellerAddress,
        sellerName: receipt.sellerName
      } as PaymentReceipt;
    } else {
      return {
        ...baseReceipt,
        type: ReceiptType.LDAO_TOKEN,
        fees: receipt.fees,
        tokensPurchased: receipt.tokensPurchased || '0',
        pricePerToken: receipt.pricePerToken || '0'
      } as PaymentReceipt;
    }
  }
}

export const receiptService = new ReceiptService();