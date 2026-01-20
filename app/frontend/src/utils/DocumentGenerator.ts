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

        // Title
        doc.setFontSize(24);
        doc.setTextColor(255, 255, 255);
        doc.text(this.data.type.replace('_', ' '), 15, 25);

        // Status Badge (if needed)
        doc.setFontSize(10);
        doc.text(this.data.status, pageWidth - 15, 25, { align: 'right' });
    }

    private addCompanyInfo(): void {
        const doc = this.doc;
        const pageWidth = doc.internal.pageSize.getWidth();
        let y = 50;

        // Sender (Left)
        doc.setFontSize(10);
        doc.setTextColor(this.colors.lightText[0], this.colors.lightText[1], this.colors.lightText[2]);
        doc.text('FROM:', 15, y);

        y += 5;
        doc.setFontSize(11);
        doc.setTextColor(this.colors.text[0], this.colors.text[1], this.colors.text[2]);
        doc.setFont('helvetica', 'bold');
        doc.text(this.data.sender.name, 15, y);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        y += 5;
        doc.text(this.data.sender.address.street, 15, y);
        y += 5;
        doc.text(`${this.data.sender.address.city}, ${this.data.sender.address.state} ${this.data.sender.address.postalCode}`, 15, y);
        y += 5;
        doc.text(this.data.sender.address.country, 15, y);

        if (this.data.sender.registrationNumber) {
            y += 5;
            doc.text(`Reg #: ${this.data.sender.registrationNumber}`, 15, y);
        }
        if (this.data.sender.taxId) {
            y += 5;
            doc.text(`Tax ID: ${this.data.sender.taxId}`, 15, y);
        }


        // Recipient (Right Side, aligned similarly)
        y = 50;
        const rightColX = pageWidth / 2 + 10;

        doc.setFontSize(10);
        doc.setTextColor(this.colors.lightText[0], this.colors.lightText[1], this.colors.lightText[2]);
        doc.text('TO:', rightColX, y);

        y += 5;
        doc.setFontSize(11);
        doc.setTextColor(this.colors.text[0], this.colors.text[1], this.colors.text[2]);
        doc.setFont('helvetica', 'bold');
        doc.text(this.data.recipient.name, rightColX, y);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        y += 5;
        doc.text(this.data.recipient.address.street, rightColX, y);
        y += 5;
        doc.text(`${this.data.recipient.address.city}, ${this.data.recipient.address.state} ${this.data.recipient.address.postalCode}`, rightColX, y);
        y += 5;
        doc.text(this.data.recipient.address.country, rightColX, y);

        // Document Meta Data (Top Right below header)
        const metaY = 50;
        const metaX = pageWidth - 15;

        doc.setFontSize(10);
        doc.text(`${this.data.type === 'INVOICE' ? 'Invoice' : 'Order'} #: ${this.data.documentNumber}`, metaX, metaY, { align: 'right' });
        doc.text(`Date: ${this.data.date.toLocaleDateString()}`, metaX, metaY + 5, { align: 'right' });
        if (this.data.dueDate) {
            doc.text(`Due Date: ${this.data.dueDate.toLocaleDateString()}`, metaX, metaY + 10, { align: 'right' });
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
