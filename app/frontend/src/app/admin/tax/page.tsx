'use client';

import React from 'react';

// Force dynamic rendering - avoid static generation
export const dynamic = 'force-dynamic';

/**
 * Tax Admin Dashboard
 * Main dashboard for tax management and compliance monitoring
 */
export default function TaxAdminDashboard() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tax Management</h1>
          <p className="text-gray-600 mt-1">Monitor tax liabilities, remittances, and compliance</p>
        </div>
      </div>
      <p className="text-gray-500">Tax dashboard content will be loaded here...</p>
    </div>
  );
}
