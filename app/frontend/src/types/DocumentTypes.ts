export type DocumentType = 'INVOICE' | 'PURCHASE_ORDER' | 'QUOTE';

export interface CompanyInfo {
    name: string;
    logo?: string; // URL or base64
    address: {
        street: string;
        city: string;
        state: string;
        postalCode: string;
        country: string;
    };
    registrationNumber?: string;
    taxId?: string; // VAT/GST/Tax ID
    email?: string;
    website?: string;
    phone?: string;
    walletAddress?: string; // e.g. 0x...
}

export interface BankDetails {
    bankName: string;
    accountName: string;
    accountNumber: string;
    sortCode?: string; // UK
    routingNumber?: string; // US
    swiftCode?: string; // International
    iban?: string; // International
}

export interface CryptoDetails {
    network: string; // e.g., 'Ethereum', 'Polygon'
    currency: string; // e.g., 'USDC', 'ETH'
    address: string;
}

export interface CreditCardDetails {
    brand: string; // e.g., 'Visa', 'Mastercard'
    last4: string;
}

export interface LineItem {
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate?: number; // percent
    total: number;
}

export interface TaxDetails {
    rate: number; // percent
    amount: number;
    name: string; // e.g., 'VAT', 'GST', 'Sales Tax'
}

export interface DocumentData {
    type: DocumentType;
    documentNumber: string; // e.g., INV-001, PO-2023-001
    date: Date;
    dueDate?: Date;
    status: 'DRAFT' | 'PENDING' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

    sender: CompanyInfo;
    recipient: CompanyInfo;

    items: LineItem[];

    currency: string;
    subtotal: number;
    taxTotal: number;
    shippingTotal?: number;
    discountTotal?: number;
    total: number;

    note?: string;
    terms?: string;

    paymentDetails?: {
        method: string;
        bank?: BankDetails;
        crypto?: CryptoDetails;
        creditCard?: CreditCardDetails;
    };
}

export interface DocumentOptions {
    color?: string; // Hex color for accents
    template?: 'modern' | 'classic' | 'minimal';
}
