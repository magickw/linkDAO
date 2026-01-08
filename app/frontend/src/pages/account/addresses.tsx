import React from 'react';
import Layout from '@/components/Layout';
import { AddressesTab } from '@/components/AddressesTab';

export default function AddressesPage() {
    return (
        <Layout fullWidth={true}>
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Header */}
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold text-white">Address Settings</h1>
                        <p className="text-white/60 mt-1">Manage your billing and shipping addresses</p>
                    </div>

                    <AddressesTab />
                </div>
            </div>
        </Layout>
    );
}
