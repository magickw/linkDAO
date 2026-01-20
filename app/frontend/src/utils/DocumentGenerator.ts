import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DocumentData, DocumentOptions } from '../types/DocumentTypes';

export class DocumentGenerator {
    private doc: jsPDF;
    private data: DocumentData;
    private options: DocumentOptions;
    private isGenerated: boolean = false;

    // Colors
    private readonly colors = {
        primary: [44, 62, 80], // Dark Blue/Grey
        secondary: [149, 165, 166], // Grey
        accent: [41, 128, 185], // LinkDAO Blue
        text: [52, 73, 94],
        lightText: [127, 140, 141],
        white: [255, 255, 255]
    };

    constructor(data: DocumentData, options: DocumentOptions = {}) {
        this.doc = new jsPDF();
        this.data = data;
        this.options = {
            color: options.color || '#2980b9',
            template: options.template || 'modern',
            ...options
        };
    }

    public generate(): jsPDF {
        if (this.isGenerated) {
            return this.doc;
        }

        this.addHeader();
        this.addCompanyInfo();
        this.addItemsTable();
        this.addTotals();
        this.addPaymentInfo();
        this.addFooter();

        this.isGenerated = true;
        return this.doc;
    }

    public save(filename?: string): void {
        if (!this.isGenerated) {
            this.generate();
        }
        const name = filename || `${this.data.type.toLowerCase()}-${this.data.documentNumber}.pdf`;
        this.doc.save(name);
    }

    private addHeader(): void {
        const doc = this.doc;
        const pageWidth = doc.internal.pageSize.getWidth();

        // Document Type Banner
        doc.setFillColor(this.colors.primary[0], this.colors.primary[1], this.colors.primary[2]);
        doc.rect(0, 0, pageWidth, 40, 'F');

        // Title (Top Left)
        doc.setFontSize(24);
        doc.setTextColor(255, 255, 255);
        doc.text(this.data.type.replace('_', ' '), 15, 20);

        // Order # (Below Title)
        doc.setFontSize(12);
        doc.setTextColor(220, 220, 220); // Slightly dimmed white
        doc.text(`${this.data.type === 'INVOICE' ? 'Invoice' : 'Order'} #: ${this.data.documentNumber}`, 15, 30);

        // Status Badge (Right)
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.text(this.data.status, pageWidth - 15, 25, { align: 'right' });

        // Date (Top Right, below status)
        doc.text(`Date: ${this.data.date.toLocaleDateString()}`, pageWidth - 15, 30, { align: 'right' });
    }

    private addCompanyInfo(): void {
        const doc = this.doc;
        const pageWidth = doc.internal.pageSize.getWidth();
        let y = 60; // Increased spacing from header

        // Helper to formatting address
        const formatAddress = (addr: any) => {
            const lines: string[] = [];
            // Only show street if it's not "N/A" and not empty
            if (addr.street && addr.street !== 'N/A') lines.push(addr.street);

            const cityStateZip = [
                addr.city !== 'N/A' ? addr.city : '',
                addr.state !== 'N/A' ? addr.state : '',
                addr.postalCode
            ].filter(Boolean).join(', ');

            if (cityStateZip.replace(/, /g, '').length > 0) lines.push(cityStateZip);

            if (addr.country !== 'N/A') lines.push(addr.country);
            return lines;
        };

        // Sender (Left)
        doc.setFontSize(10);
        doc.setTextColor(this.colors.lightText[0], this.colors.lightText[1], this.colors.lightText[2]);
        doc.text('FROM:', 15, y);

        y += 6;
        doc.setFontSize(11);
        doc.setTextColor(this.colors.text[0], this.colors.text[1], this.colors.text[2]);
        doc.setFont('helvetica', 'bold');
        doc.text(this.data.sender.name, 15, y);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);

        const senderAddrLines = formatAddress(this.data.sender.address);
        senderAddrLines.forEach(line => {
            y += 5;
            doc.text(line, 15, y);
        });

        // Wallet Address (Prominent)
        if (this.data.sender.walletAddress) {
            y += 6;
            doc.setTextColor(this.colors.accent[0], this.colors.accent[1], this.colors.accent[2]);
            doc.setFontSize(9);
            // Shorten: 0x1234...5678
            const wallet = this.data.sender.walletAddress;
            const shortWallet = wallet.length > 12 ? `${wallet.substring(0, 6)}...${wallet.substring(wallet.length - 4)}` : wallet;
            doc.text(`Wallet: ${shortWallet}`, 15, y);
            doc.setTextColor(this.colors.text[0], this.colors.text[1], this.colors.text[2]); // Reset color
        }

        if (this.data.sender.registrationNumber) {
            y += 5;
            doc.setTextColor(this.colors.lightText[0], this.colors.lightText[1], this.colors.lightText[2]);
            doc.setFontSize(8);
            doc.text(`Reg: ${this.data.sender.registrationNumber}`, 15, y);
        }

        // Recipient (Right Side)
        y = 60; // Reset Y
        const rightColX = pageWidth / 2 + 10;

        doc.setFontSize(10);
        doc.setTextColor(this.colors.lightText[0], this.colors.lightText[1], this.colors.lightText[2]);
        doc.text('TO:', rightColX, y);

        y += 6;
        doc.setFontSize(11);
        doc.setTextColor(this.colors.text[0], this.colors.text[1], this.colors.text[2]);
        doc.setFont('helvetica', 'bold');
        doc.text(this.data.recipient.name, rightColX, y);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);

        const recipientAddrLines = formatAddress(this.data.recipient.address);
        recipientAddrLines.forEach(line => {
            y += 5;
            doc.text(line, rightColX, y);
        });

        // Buyer Wallet Address
        if (this.data.recipient.walletAddress) {
            y += 6;
            doc.setTextColor(this.colors.accent[0], this.colors.accent[1], this.colors.accent[2]);
            doc.setFontSize(9);
            const wallet = this.data.recipient.walletAddress;
            const shortWallet = wallet.length > 12 ? `${wallet.substring(0, 6)}...${wallet.substring(wallet.length - 4)}` : wallet;
            doc.text(`Wallet: ${shortWallet}`, rightColX, y);
            doc.setTextColor(this.colors.text[0], this.colors.text[1], this.colors.text[2]);
        }
    }

    private addItemsTable(): void {
        const doc = this.doc;

        const tableHeaders = [['Description', 'Quantity', 'Unit Price', 'Total']];
        const tableBody = this.data.items.map(item => [
            item.description,
            item.quantity.toString(),
            this.formatCurrency(item.unitPrice),
            this.formatCurrency(item.total)
        ]);

        autoTable(doc, {
            startY: 100,
            head: tableHeaders,
            body: tableBody,
            theme: 'striped',
            headStyles: {
                fillColor: this.colors.accent as any, // Cast because jspdf types can be finicky
                textColor: 255,
                fontStyle: 'bold'
            },
            columnStyles: {
                0: { cellWidth: 'auto' },
                1: { cellWidth: 20, halign: 'center' },
                2: { cellWidth: 30, halign: 'right' },
                3: { cellWidth: 30, halign: 'right' }
            },
            styles: {
                fontSize: 10,
                cellPadding: 3
            }
        });
    }

    private addTotals(): void {
        const doc = this.doc;
        const finalY = (doc as any).lastAutoTable.finalY + 10;
        const pageWidth = doc.internal.pageSize.getWidth();
        const rightMargin = 15;
        let currentY = finalY;

        // Helper for right aligned text
        const addRow = (label: string, value: string, isBold = false) => {
            doc.setFont('helvetica', isBold ? 'bold' : 'normal');
            doc.text(label, pageWidth - 70, currentY, { align: 'right' });
            doc.text(value, pageWidth - rightMargin, currentY, { align: 'right' });
            currentY += 6;
        };

        doc.setFontSize(10);

        addRow('Subtotal:', this.formatCurrency(this.data.subtotal));

        if (this.data.discountTotal && this.data.discountTotal > 0) {
            addRow('Discount:', `-${this.formatCurrency(this.data.discountTotal)}`);
        }

        if (this.data.shippingTotal && this.data.shippingTotal > 0) {
            addRow('Shipping:', this.formatCurrency(this.data.shippingTotal));
        }

        if (this.data.taxTotal > 0) {
            addRow('Tax:', this.formatCurrency(this.data.taxTotal));
        }

        // Divider
        doc.setLineWidth(0.5);
        doc.line(pageWidth - 80, currentY - 2, pageWidth - rightMargin, currentY - 2);
        currentY += 2;

        doc.setFontSize(12);
        addRow('TOTAL:', this.formatCurrency(this.data.total), true);
    }

    private addPaymentInfo(): void {
        const doc = this.doc;
        // We place this at the bottom left usually, below table
        let y = (doc as any).lastAutoTable.finalY + 10;

        // Do not overlap with totals
        if (y < 200) y = 200; // Push to bottom part if table is short

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Payment Information', 15, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);

        if (this.data.paymentDetails?.method) {
            doc.text(`Method: ${this.data.paymentDetails.method}`, 15, y);
            y += 5;
        }

        if (this.data.paymentDetails?.creditCard) {
            const cc = this.data.paymentDetails.creditCard;
            doc.text(`Card: ${cc.brand} ending in ${cc.last4}`, 15, y); y += 5;
        }

        if (this.data.paymentDetails?.bank) {
            const bank = this.data.paymentDetails.bank;
            doc.text(`Bank: ${bank.bankName}`, 15, y); y += 4;
            doc.text(`Account Name: ${bank.accountName}`, 15, y); y += 4;
            doc.text(`Account No: ${bank.accountNumber}`, 15, y); y += 4;
            if (bank.routingNumber) { doc.text(`Routing: ${bank.routingNumber}`, 15, y); y += 4; }
            if (bank.swiftCode) { doc.text(`SWIFT: ${bank.swiftCode}`, 15, y); y += 4; }
            y += 5;
        }

        if (this.data.paymentDetails?.crypto) {
            const crypto = this.data.paymentDetails.crypto;
            doc.text(`Network: ${crypto.network}`, 15, y); y += 4;
            doc.text(`Currency: ${crypto.currency}`, 15, y); y += 4;
            doc.text(`Address: ${crypto.address}`, 15, y); y += 4;
        }

        if (this.data.terms) {
            y += 5;
            doc.setFont('helvetica', 'bold');
            doc.text('Terms & Conditions', 15, y);
            y += 5;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            const splitText = doc.splitTextToSize(this.data.terms, 100);
            doc.text(splitText, 15, y);
        }
    }

    private addFooter(): void {
        const doc = this.doc;
        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();

        // Line
        doc.setDrawColor(200, 200, 200);
        doc.line(15, pageHeight - 20, pageWidth - 15, pageHeight - 20);

        // Text
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('Thank you for your business.', 15, pageHeight - 15);
        doc.text(`Use ${this.data.sender.name} infrastructure for your crypto needs.`, pageWidth - 15, pageHeight - 15, { align: 'right' });
    }

    private formatCurrency(amount: number): string {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: this.data.currency || 'USD'
        }).format(amount);
    }
}
