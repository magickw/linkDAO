import React from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Truck, CheckCircle, Clock, XCircle, Package, MapPin } from 'lucide-react';

interface TrackingEvent {
  timestamp: string;
  status: string;
  location: string;
  description: string;
}

interface ReturnTrackingProps {
  trackingNumber: string;
  carrier: string;
  status: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  events: TrackingEvent[];
}

export const MobileReturnTracking: React.FC<ReturnTrackingProps> = ({
  trackingNumber,
  carrier,
  status,
  estimatedDelivery,
  actualDelivery,
  events
}) => {
  const getStatusIcon = (status: string) => {
    if (status.toLowerCase().includes('delivered')) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else if (status.toLowerCase().includes('exception')) {
      return <XCircle className="w-5 h-5 text-red-500" />;
    } else if (status.toLowerCase().includes('in transit')) {
      return <Truck className="w-5 h-5 text-blue-500" />;
    } else {
      return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    if (status.toLowerCase().includes('delivered')) {
      return 'bg-green-100 text-green-800';
    } else if (status.toLowerCase().includes('exception')) {
      return 'bg-red-100 text-red-800';
    } else if (status.toLowerCase().includes('in transit')) {
      return 'bg-blue-100 text-blue-800';
    } else {
      return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full px-4">
      <Card className="p-4 md:p-6">
        <h2 className="text-xl md:text-2xl font-bold mb-6">Return Tracking</h2>
        
        {/* Tracking Summary */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {getStatusIcon(status)}
              <span className="font-medium">Tracking #{trackingNumber}</span>
            </div>
            <Badge className={getStatusColor(status)}>
              {status}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Carrier</div>
              <div className="font-medium">{carrier}</div>
            </div>
            <div>
              <div className="text-gray-500">Estimated Delivery</div>
              <div className="font-medium">
                {estimatedDelivery ? new Date(estimatedDelivery).toLocaleDateString() : 'N/A'}
              </div>
            </div>
            {actualDelivery && (
              <div>
                <div className="text-gray-500">Actual Delivery</div>
                <div className="font-medium">{new Date(actualDelivery).toLocaleDateString()}</div>
              </div>
            )}
          </div>
        </div>

        {/* Tracking Timeline */}
        <div className="space-y-4">
          <h3 className="font-medium text-lg">Tracking Timeline</h3>
          
          <div className="space-y-4">
            {events.map((event, index) => (
              <div key={index} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Package className="w-4 h-4 text-blue-600" />
                  </div>
                  {index < events.length - 1 && (
                    <div className="w-0.5 h-full bg-gray-200 mt-1"></div>
                  )}
                </div>
                
                <div className="flex-1 pb-4">
                  <div className="font-medium">{event.status}</div>
                  <div className="text-sm text-gray-600 mt-1">{event.description}</div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                    <MapPin className="w-3 h-3" />
                    <span>{event.location}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(event.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-4 border-t">
          <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
            Contact Carrier
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            Get Updates
          </button>
        </div>
      </Card>
    </div>
  );
};