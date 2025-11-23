/**
 * Enhanced Shipping & Delivery Management System
 * Features: Multi-carrier support, real-time tracking, DAO-approved carriers, delivery confirmation
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Truck, 
  Package, 
  MapPin, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Star,
  Shield,
  Camera,
  QrCode,
  Download,
  Upload,
  Eye,
  ExternalLink
} from 'lucide-react';
import { GlassPanel } from '../../../design-system/components/GlassPanel';
import { Button } from '../../../design-system/components/Button';
import { designTokens } from '../../../design-system/tokens';

interface ShippingAddress {
  id: string;
  firstName: string;
  lastName: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone?: string;
  email: string;
  isDefault: boolean;
  verified: boolean;
  instructions?: string;
}

interface ShippingCarrier {
  id: string;
  name: string;
  logo: string;
  daoApproved: boolean;
  rating: number;
  services: ShippingService[];
  coverage: string[];
  trustScore: number;
  escrowIntegrated: boolean;
}

interface ShippingService {
  id: string;
  name: string;
  description: string;
  estimatedDays: string;
  price: {
    crypto: string;
    cryptoSymbol: string;
    fiat: string;
    fiatSymbol: string;
  };
  features: string[];
  tracking: boolean;
  insurance: boolean;
  signature: boolean;
}

interface TrackingEvent {
  id: string;
  timestamp: Date;
  status: string;
  location: string;
  description: string;
  verified: boolean;
  photoUrl?: string;
  signature?: string;
}

interface ShipmentStatus {
  id: string;
  orderId: string;
  trackingNumber: string;
  carrier: ShippingCarrier;
  service: ShippingService;
  status: 'pending' | 'shipped' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception';
  estimatedDelivery: Date;
  actualDelivery?: Date;
  events: TrackingEvent[];
  deliveryConfirmation?: {
    method: 'photo' | 'signature' | 'qr_scan' | 'biometric';
    data: string;
    timestamp: Date;
    verifiedBy: string;
  };
  escrowLinked: boolean;
  autoReleaseEnabled: boolean;
}

interface ShippingManagerProps {
  orderId?: string;
  products: Array<{
    id: string;
    title: string;
    image: string;
    isDigital: boolean;
    weight?: number;
    dimensions?: { length: number; width: number; height: number };
  }>;
  shippingAddress: ShippingAddress;
  onShippingMethodSelect?: (carrier: ShippingCarrier, service: ShippingService) => void;
  onDeliveryConfirm?: (confirmation: any) => void;
  mode: 'selection' | 'tracking' | 'confirmation';
}

export const ShippingManager: React.FC<ShippingManagerProps> = ({
  orderId,
  products,
  shippingAddress,
  onShippingMethodSelect,
  onDeliveryConfirm,
  mode = 'selection'
}) => {
  const [selectedCarrier, setSelectedCarrier] = useState<ShippingCarrier | null>(null);
  const [selectedService, setSelectedService] = useState<ShippingService | null>(null);
  const [shipmentStatus, setShipmentStatus] = useState<ShipmentStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmationMethod, setConfirmationMethod] = useState<'photo' | 'signature' | 'qr_scan'>('photo');

  // Mock shipping carriers data
  const carriers: ShippingCarrier[] = [
    {
      id: 'dao_express',
      name: 'DAO Express',
      logo: '/images/dao-express-logo.png',
      daoApproved: true,
      rating: 4.8,
      trustScore: 95,
      escrowIntegrated: true,
      coverage: ['US', 'CA', 'EU', 'UK'],
      services: [
        {
          id: 'dao_standard',
          name: 'DAO Standard',
          description: 'Reliable delivery with blockchain tracking',
          estimatedDays: '3-5',
          price: { crypto: '0.015', cryptoSymbol: 'ETH', fiat: '25.00', fiatSymbol: 'USD' },
          features: ['Blockchain tracking', 'Escrow integration', 'Photo confirmation'],
          tracking: true,
          insurance: true,
          signature: false
        },
        {
          id: 'dao_express_service',
          name: 'DAO Express',
          description: 'Fast delivery with premium protection',
          estimatedDays: '1-2',
          price: { crypto: '0.035', cryptoSymbol: 'ETH', fiat: '55.00', fiatSymbol: 'USD' },
          features: ['Blockchain tracking', 'Escrow integration', 'Signature confirmation', 'Insurance'],
          tracking: true,
          insurance: true,
          signature: true
        }
      ]
    },
    {
      id: 'web3_logistics',
      name: 'Web3 Logistics',
      logo: '/images/web3-logistics-logo.png',
      daoApproved: true,
      rating: 4.6,
      trustScore: 88,
      escrowIntegrated: true,
      coverage: ['US', 'CA', 'MX'],
      services: [
        {
          id: 'w3l_economy',
          name: 'Economy',
          description: 'Cost-effective shipping with basic tracking',
          estimatedDays: '5-7',
          price: { crypto: '0.008', cryptoSymbol: 'ETH', fiat: '12.00', fiatSymbol: 'USD' },
          features: ['Basic tracking', 'Package protection'],
          tracking: true,
          insurance: false,
          signature: false
        },
        {
          id: 'w3l_priority',
          name: 'Priority',
          description: 'Faster delivery with enhanced features',
          estimatedDays: '2-3',
          price: { crypto: '0.025', cryptoSymbol: 'ETH', fiat: '40.00', fiatSymbol: 'USD' },
          features: ['Real-time tracking', 'Insurance included', 'Delivery confirmation'],
          tracking: true,
          insurance: true,
          signature: false
        }
      ]
    },
    {
      id: 'traditional_carrier',
      name: 'Traditional Shipping',
      logo: '/images/traditional-logo.png',
      daoApproved: false,
      rating: 4.2,
      trustScore: 75,
      escrowIntegrated: false,
      coverage: ['US', 'CA', 'EU', 'UK', 'AU'],
      services: [
        {
          id: 'trad_ground',
          name: 'Ground Shipping',
          description: 'Standard delivery service',
          estimatedDays: '5-8',
          price: { crypto: '0.006', cryptoSymbol: 'ETH', fiat: '9.99', fiatSymbol: 'USD' },
          features: ['Basic tracking'],
          tracking: true,
          insurance: false,
          signature: false
        }
      ]
    }
  ];

  // Mock shipment tracking data
  const mockShipmentStatus: ShipmentStatus = {
    id: 'SHIP_123456',
    orderId: orderId || 'ORDER_789',
    trackingNumber: 'DAO1234567890',
    carrier: carriers[0],
    service: carriers[0].services[0],
    status: 'in_transit',
    estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    events: [
      {
        id: '1',
        timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000),
        status: 'picked_up',
        location: 'Seller Location',
        description: 'Package picked up from seller',
        verified: true
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
        status: 'in_transit',
        location: 'Sorting Facility - NYC',
        description: 'Package processed at sorting facility',
        verified: true
      },
      {
        id: '3',
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
        status: 'in_transit',
        location: 'Distribution Center - Chicago',
        description: 'Package arrived at distribution center',
        verified: true
      }
    ],
    escrowLinked: true,
    autoReleaseEnabled: true
  };

  useEffect(() => {
    if (mode === 'tracking' && orderId) {
      setShipmentStatus(mockShipmentStatus);
    }
  }, [mode, orderId]);

  const handleCarrierSelect = (carrier: ShippingCarrier, service: ShippingService) => {
    setSelectedCarrier(carrier);
    setSelectedService(service);
    onShippingMethodSelect?.(carrier, service);
  };

  const handleDeliveryConfirmation = async () => {
    setLoading(true);
    try {
      // Simulate confirmation process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const confirmation = {
        method: confirmationMethod,
        data: 'confirmation_data_here',
        timestamp: new Date(),
        verifiedBy: shippingAddress.email
      };
      
      onDeliveryConfirm?.(confirmation);
    } catch (error) {
      console.error('Delivery confirmation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Shipping Method Selection Component
  const ShippingSelection = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">Choose Shipping Method</h2>
        <p className="text-white/70">Select a carrier and service for your order</p>
      </div>

      <div className="space-y-4">
        {carriers.map((carrier) => (
          <GlassPanel key={carrier.id} variant="secondary" className="p-4">
            <div className="flex items-start gap-4 mb-4">
              <img 
                src={carrier.logo} 
                alt={carrier.name}
                className="w-12 h-12 object-contain rounded"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-white">{carrier.name}</h3>
                  {carrier.daoApproved && (
                    <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded flex items-center gap-1">
                      <Shield size={10} />
                      DAO Approved
                    </span>
                  )}
                  {carrier.escrowIntegrated && (
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">
                      Escrow Ready
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-white/70">
                  <div className="flex items-center gap-1">
                    <Star size={12} className="text-yellow-400 fill-current" />
                    <span>{carrier.rating}</span>
                  </div>
                  <span>Trust Score: {carrier.trustScore}%</span>
                  <span>Coverage: {carrier.coverage.join(', ')}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {carrier.services.map((service) => (
                <div
                  key={service.id}
                  className={`p-4 rounded-lg cursor-pointer border-2 transition-all ${
                    selectedCarrier?.id === carrier.id && selectedService?.id === service.id
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}
                  onClick={() => handleCarrierSelect(carrier, service)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium text-white">{service.name}</h4>
                      <p className="text-sm text-white/70">{service.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-white">
                        {service.price.crypto} {service.price.cryptoSymbol}
                      </div>
                      <div className="text-sm text-white/60">
                        ≈ ${service.price.fiat}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1 text-white/70">
                        <Clock size={12} />
                        {service.estimatedDays} days
                      </span>
                      {service.tracking && (
                        <span className="text-green-400">📍 Tracking</span>
                      )}
                      {service.insurance && (
                        <span className="text-blue-400">🛡️ Insured</span>
                      )}
                      {service.signature && (
                        <span className="text-purple-400">✍️ Signature</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1">
                    {service.features.map((feature, index) => (
                      <span 
                        key={index}
                        className="px-2 py-1 bg-white/10 text-white/80 text-xs rounded"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </GlassPanel>
        ))}
      </div>
    </div>
  );

  // Package Tracking Component
  const PackageTracking = () => (
    <div className="space-y-6">
      {shipmentStatus && (
        <>
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">Track Your Package</h2>
            <p className="text-white/70">Order #{shipmentStatus.orderId}</p>
          </div>

          {/* Tracking Header */}
          <GlassPanel variant="primary" className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <img 
                  src={shipmentStatus.carrier.logo} 
                  alt={shipmentStatus.carrier.name}
                  className="w-12 h-12 object-contain rounded"
                />
                <div>
                  <h3 className="font-semibold text-white">{shipmentStatus.carrier.name}</h3>
                  <p className="text-white/70">Tracking: {shipmentStatus.trackingNumber}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-white/70">Estimated Delivery</div>
                <div className="font-semibold text-white">
                  {shipmentStatus.estimatedDelivery.toLocaleDateString()}
                </div>
              </div>
            </div>

            <div className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              shipmentStatus.status === 'delivered' ? 'bg-green-500/20 text-green-400' :
              shipmentStatus.status === 'exception' ? 'bg-red-500/20 text-red-400' :
              'bg-blue-500/20 text-blue-400'
            }`}>
              <Package size={16} />
              <span className="font-medium capitalize">
                {shipmentStatus.status.replace('_', ' ')}
              </span>
            </div>
          </GlassPanel>

          {/* Tracking Timeline */}
          <GlassPanel variant="secondary" className="p-6">
            <h3 className="font-semibold text-white mb-4">Tracking History</h3>
            <div className="space-y-4">
              {shipmentStatus.events.map((event, index) => (
                <div key={event.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full ${
                      event.verified ? 'bg-green-400' : 'bg-white/40'
                    }`} />
                    {index < shipmentStatus.events.length - 1 && (
                      <div className="w-0.5 h-8 bg-white/20 mt-2" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-white capitalize">
                        {event.status.replace('_', ' ')}
                      </h4>
                      <span className="text-sm text-white/60">
                        {event.timestamp.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-white/70 text-sm">{event.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <MapPin size={12} className="text-white/50" />
                      <span className="text-xs text-white/60">{event.location}</span>
                      {event.verified && (
                        <CheckCircle size={12} className="text-green-400" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassPanel>

          {/* Escrow Integration */}
          {shipmentStatus.escrowLinked && (
            <GlassPanel variant="secondary" className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Shield className="text-blue-400" size={20} />
                <h3 className="font-medium text-white">Escrow Protection Active</h3>
              </div>
              <p className="text-white/70 text-sm mb-3">
                Your payment is held securely in escrow until delivery is confirmed.
              </p>
              {shipmentStatus.autoReleaseEnabled && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded">
                  <p className="text-green-400 text-sm">
                    ✨ Auto-release enabled: Funds will be released automatically upon delivery confirmation
                  </p>
                </div>
              )}
            </GlassPanel>
          )}
        </>
      )}
    </div>
  );

  // Delivery Confirmation Component
  const DeliveryConfirmation = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibant text-white mb-2">Confirm Delivery</h2>
        <p className="text-white/70">Verify that you received your package</p>
      </div>

      <GlassPanel variant="primary" className="p-6">
        <h3 className="font-semibold text-white mb-4">Choose Confirmation Method</h3>
        
        <div className="space-y-3 mb-6">
          <label className="flex items-center gap-3 p-4 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
            <input
              type="radio"
              name="confirmationMethod"
              value="photo"
              checked={confirmationMethod === 'photo'}
              onChange={(e) => setConfirmationMethod(e.target.value as any)}
              className="text-blue-500"
            />
            <Camera className="text-white/70" size={20} />
            <div>
              <p className="font-medium text-white">Photo Confirmation</p>
              <p className="text-white/60 text-sm">Take a photo of the delivered package</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-4 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
            <input
              type="radio"
              name="confirmationMethod"
              value="signature"
              checked={confirmationMethod === 'signature'}
              onChange={(e) => setConfirmationMethod(e.target.value as any)}
              className="text-blue-500"
            />
            <div className="w-5 h-5 text-white/70">✍️</div>
            <div>
              <p className="font-medium text-white">Digital Signature</p>
              <p className="text-white/60 text-sm">Sign digitally to confirm receipt</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-4 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
            <input
              type="radio"
              name="confirmationMethod"
              value="qr_scan"
              checked={confirmationMethod === 'qr_scan'}
              onChange={(e) => setConfirmationMethod(e.target.value as any)}
              className="text-blue-500"
            />
            <QrCode className="text-white/70" size={20} />
            <div>
              <p className="font-medium text-white">QR Code Scan</p>
              <p className="text-white/60 text-sm">Scan the package QR code</p>
            </div>
          </label>
        </div>

        <Button
          variant="primary"
          size="lg"
          onClick={handleDeliveryConfirmation}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Confirming Delivery...
            </>
          ) : (
            <>
              <CheckCircle size={20} />
              Confirm Delivery & Release Escrow
            </>
          )}
        </Button>

        <p className="text-white/60 text-xs text-center mt-4">
          By confirming delivery, you authorize the release of escrowed funds to the seller.
        </p>
      </GlassPanel>
    </div>
  );

  const componentMap = {
    selection: <ShippingSelection />,
    tracking: <PackageTracking />,
    confirmation: <DeliveryConfirmation />
  };

  return (
    <div className="max-w-4xl mx-auto">
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {componentMap[mode]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default ShippingManager;