import React from 'react';
import Layout from '@/components/Layout';
import { PaymentMethodsTab } from '@/components/PaymentMethodsTab';

export default function PaymentMethodsPage() {
    return (
        <Layout fullWidth={true}>
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold text-white">Payment Methods</h1>
                        <p className="text-white/60 mt-1">Manage your payment methods securely</p>
                    </div>
                    <PaymentMethodsTab />
                </div>
            </div>
        </Layout>
    );
}
