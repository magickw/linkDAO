/**
 * OrderTrackingDashboard - Comprehensive order tracking system for buyers and sellers
 * Features: Real-time status updates, delivery confirmation, escrow management
 */

import React from 'react';
import OrderHistoryInterface from './OrderHistoryInterface';

interface OrderTrackingDashboardProps {
  userType: 'buyer' | 'seller';
  className?: string;
}

export const OrderTrackingDashboard: React.FC<OrderTrackingDashboardProps> = ({
  userType,
  className = ''
}) => {
  return (
    <OrderHistoryInterface 
      userType={userType} 
      className={className}
    />
  );
};



export default OrderTrackingDashboard;