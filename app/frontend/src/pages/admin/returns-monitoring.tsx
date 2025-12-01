import React from 'react';
import { ReturnMonitoringDashboard } from '../../components/Admin/returns/ReturnMonitoringDashboard';

/**
 * Admin Returns Monitoring Page
 * 
 * This page provides comprehensive real-time monitoring and analytics
 * for all return and refund operations across the platform.
 * 
 * Features:
 * - Real-time metrics updating every 30 seconds
 * - Status distribution visualization
 * - Return trends analysis
 * - Advanced filtering capabilities
 * - Recent returns table
 */
const AdminReturnsMonitoringPage: React.FC = () => {
  return (
    <div className="min-h-screen">
      <ReturnMonitoringDashboard />
    </div>
  );
};

export default AdminReturnsMonitoringPage;
