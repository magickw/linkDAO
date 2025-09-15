/**
 * DAOShippingPartners - DAO-approved shipping partners integration
 * Features: Partner verification, governance voting, shipping analytics, insurance coverage
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Truck, Shield, Star, CheckCircle, AlertTriangle, Clock, MapPin,
  DollarSign, Package, Vote, TrendingUp, Award, Globe, Zap, Info
} from 'lucide-react';
import { GlassPanel } from '../../../design-system/components/GlassPanel';
import { Button } from '../../../design-system/components/Button';

interface ShippingPartner {
  id: string;
  name: string;
  logo: string;
  description: string;
  daoApproved: boolean;
  approvalDate?: Date;
  votingPower: number; // DAO votes received
  rating: number;
  reviewCount: number;
  coverage: {
    domestic: boolean;
    international: boolean;
    regions: string[];
  };
  services: {
    standard: {
      available: boolean;
      minDays: number;
      maxDays: number;
      baseCost: string;
    };
    express: {
      available: boolean;
      minDays: number;
      maxDays: number;
      baseCost: string;
    };
    overnight: {
      available: boolean;
      minDays: number;
      maxDays: number;
      baseCost: string;
    };
  };
  features: {
    tracking: boolean;
    insurance: boolean;
    signature: boolean;
    packaging: boolean;
    eco_friendly: boolean;
  };
  metrics: {
    onTimeDelivery: number;
    damageRate: number;
    customerSatisfaction: number;
    avgProcessingTime: number;
  };
  daoVoting: {
    proposalId?: string;
    votesFor: number;
    votesAgainst: number;
    totalVotingPower: number;
    status: 'pending' | 'approved' | 'rejected' | 'under_review';
  };
}

interface DAOShippingPartnersProps {
  userLocation?: {
    country: string;
    region: string;
    postalCode: string;
  };
  orderValue?: number;
  orderWeight?: number;
  onPartnerSelect?: (partner: ShippingPartner, service: string) => void;
  showOnlyApproved?: boolean;
}

export const DAOShippingPartners: React.FC<DAOShippingPartnersProps> = ({
  userLocation,
  orderValue = 0,
  orderWeight = 1,
  onPartnerSelect,
  showOnlyApproved = false
}) => {
  const [partners, setPartners] = useState<ShippingPartner[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<ShippingPartner | null>(null);
  const [selectedService, setSelectedService] = useState<string>('standard');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'dao_approved' | 'pending_approval'>('all');
  const [sortBy, setSortBy] = useState<'rating' | 'cost' | 'speed' | 'dao_votes'>('rating');

  // Mock data for shipping partners
  useEffect(() => {
    const mockPartners: ShippingPartner[] = [
      {
        id: 'global_express',
        name: 'GlobalExpress Pro',
        logo: '/images/shipping/global-express.png',
        description: 'Premium international shipping with full insurance coverage',
        daoApproved: true,
        approvalDate: new Date('2024-01-15'),
        votingPower: 850,
        rating: 4.8,
        reviewCount: 2341,
        coverage: {
          domestic: true,
          international: true,
          regions: ['North America', 'Europe', 'Asia', 'Australia']
        },
        services: {
          standard: { available: true, minDays: 5, maxDays: 7, baseCost: '0.012' },
          express: { available: true, minDays: 2, maxDays: 3, baseCost: '0.024' },
          overnight: { available: true, minDays: 1, maxDays: 1, baseCost: '0.045' }
        },
        features: {
          tracking: true,
          insurance: true,
          signature: true,
          packaging: true,
          eco_friendly: true
        },
        metrics: {
          onTimeDelivery: 96.5,
          damageRate: 0.2,
          customerSatisfaction: 4.8,
          avgProcessingTime: 1.2
        },
        daoVoting: {
          proposalId: 'prop_001',
          votesFor: 850,
          votesAgainst: 45,
          totalVotingPower: 1000,
          status: 'approved'
        }
      },
      {
        id: 'eco_logistics',
        name: 'EcoLogistics Chain',
        logo: '/images/shipping/eco-logistics.png',
        description: 'Sustainable shipping solutions with carbon-neutral delivery',
        daoApproved: true,
        approvalDate: new Date('2024-02-20'),
        votingPower: 720,
        rating: 4.6,
        reviewCount: 1876,
        coverage: {
          domestic: true,
          international: false,
          regions: ['North America']
        },
        services: {
          standard: { available: true, minDays: 3, maxDays: 5, baseCost: '0.008' },
          express: { available: true, minDays: 1, maxDays: 2, baseCost: '0.018' },
          overnight: { available: false, minDays: 0, maxDays: 0, baseCost: '0' }
        },
        features: {
          tracking: true,
          insurance: true,
          signature: false,
          packaging: true,
          eco_friendly: true
        },
        metrics: {
          onTimeDelivery: 94.2,
          damageRate: 0.3,
          customerSatisfaction: 4.6,
          avgProcessingTime: 0.8
        },
        daoVoting: {
          proposalId: 'prop_002',
          votesFor: 720,
          votesAgainst: 120,
          totalVotingPower: 1000,
          status: 'approved'
        }
      },
      {
        id: 'rapid_delivery',
        name: 'RapidShip Network',
        logo: '/images/shipping/rapid-delivery.png',
        description: 'High-speed delivery network specializing in same-day and next-day shipping',
        daoApproved: false,
        votingPower: 420,
        rating: 4.3,
        reviewCount: 956,
        coverage: {
          domestic: true,
          international: true,
          regions: ['North America', 'Europe']
        },
        services: {
          standard: { available: true, minDays: 2, maxDays: 4, baseCost: '0.015' },
          express: { available: true, minDays: 1, maxDays: 1, baseCost: '0.028' },
          overnight: { available: true, minDays: 0, maxDays: 1, baseCost: '0.055' }
        },
        features: {
          tracking: true,
          insurance: false,
          signature: true,
          packaging: false,
          eco_friendly: false
        },
        metrics: {
          onTimeDelivery: 91.8,
          damageRate: 0.8,
          customerSatisfaction: 4.3,
          avgProcessingTime: 0.5
        },
        daoVoting: {
          proposalId: 'prop_003',
          votesFor: 420,
          votesAgainst: 380,
          totalVotingPower: 1000,
          status: 'under_review'
        }
      }
    ];

    setPartners(mockPartners);
    setLoading(false);
  }, []);

  // Filter and sort partners
  const filteredPartners = partners
    .filter(partner => {
      if (showOnlyApproved || filter === 'dao_approved') return partner.daoApproved;
      if (filter === 'pending_approval') return !partner.daoApproved;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'rating': return b.rating - a.rating;
        case 'cost': return parseFloat(a.services.standard.baseCost) - parseFloat(b.services.standard.baseCost);
        case 'speed': return a.services.express.maxDays - b.services.express.maxDays;
        case 'dao_votes': return b.votingPower - a.votingPower;
        default: return b.rating - a.rating;
      }
    });

  const handlePartnerSelect = (partner: ShippingPartner, service: string) => {
    setSelectedPartner(partner);
    setSelectedService(service);
    if (onPartnerSelect) {
      onPartnerSelect(partner, service);
    }
  };

  const getServiceCost = (partner: ShippingPartner, service: string) => {
    const baseCost = parseFloat(partner.services[service as keyof typeof partner.services].baseCost);
    const weightMultiplier = Math.max(1, orderWeight / 2); // Every 2kg increases cost
    const valueMultiplier = orderValue > 100 ? 1.1 : 1; // 10% extra for high-value items
    return (baseCost * weightMultiplier * valueMultiplier).toFixed(4);
  };

  const renderPartnerCard = (partner: ShippingPartner) => (
    <motion.div
      key={partner.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative ${selectedPartner?.id === partner.id ? 'ring-2 ring-blue-500' : ''}`}
    >
      <GlassPanel 
        variant=\"primary\" 
        className=\"p-6 cursor-pointer transition-all hover:shadow-lg\"
        onClick={() => setSelectedPartner(partner)}
      >
        {/* Header */}
        <div className=\"flex items-center justify-between mb-4\">
          <div className=\"flex items-center space-x-3\">
            <img 
              src={partner.logo} 
              alt={partner.name}
              className=\"w-12 h-12 rounded-lg object-cover bg-white/10\"
              onError={(e) => {
                e.currentTarget.src = 'data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"48\" height=\"48\" viewBox=\"0 0 48 48\"><rect width=\"48\" height=\"48\" fill=\"%23374151\"/><text x=\"24\" y=\"30\" text-anchor=\"middle\" fill=\"%23ffffff\" font-size=\"12\">SHIP</text></svg>';
              }}
            />
            <div>
              <h3 className=\"text-lg font-semibold text-gray-900 dark:text-white\">
                {partner.name}
              </h3>
              <div className=\"flex items-center space-x-2\">
                <div className=\"flex items-center\">
                  <Star size={14} className=\"text-yellow-400 fill-current\" />
                  <span className=\"text-sm text-gray-600 dark:text-gray-400 ml-1\">
                    {partner.rating} ({partner.reviewCount} reviews)
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className=\"flex flex-col items-end space-y-2\">
            {partner.daoApproved ? (
              <div className=\"flex items-center space-x-1 bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-xs\">
                <CheckCircle size={12} />
                <span>DAO Approved</span>
              </div>
            ) : (
              <div className=\"flex items-center space-x-1 bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full text-xs\">
                <Clock size={12} />
                <span>Pending Review</span>
              </div>
            )}
            
            <div className=\"flex items-center space-x-1 text-xs text-gray-500\">
              <Vote size={12} />
              <span>{partner.votingPower} votes</span>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className=\"text-sm text-gray-600 dark:text-gray-400 mb-4\">
          {partner.description}
        </p>

        {/* Features */}
        <div className=\"grid grid-cols-2 md:grid-cols-5 gap-2 mb-4\">
          {Object.entries(partner.features).map(([feature, available]) => (
            <div 
              key={feature}
              className={`flex items-center space-x-1 text-xs ${
                available ? 'text-green-400' : 'text-gray-500'
              }`}
            >
              {available ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
              <span className=\"capitalize\">{feature.replace('_', ' ')}</span>
            </div>
          ))}
        </div>

        {/* Metrics */}
        <div className=\"grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm\">
          <div>
            <span className=\"text-gray-600 dark:text-gray-400\">On Time:</span>
            <p className=\"font-semibold text-gray-900 dark:text-white\">
              {partner.metrics.onTimeDelivery}%
            </p>
          </div>
          <div>
            <span className=\"text-gray-600 dark:text-gray-400\">Damage Rate:</span>
            <p className=\"font-semibold text-gray-900 dark:text-white\">
              {partner.metrics.damageRate}%
            </p>
          </div>
          <div>
            <span className=\"text-gray-600 dark:text-gray-400\">Satisfaction:</span>
            <p className=\"font-semibold text-gray-900 dark:text-white\">
              {partner.metrics.customerSatisfaction}/5
            </p>
          </div>
          <div>
            <span className=\"text-gray-600 dark:text-gray-400\">Processing:</span>
            <p className=\"font-semibold text-gray-900 dark:text-white\">
              {partner.metrics.avgProcessingTime}d
            </p>
          </div>
        </div>

        {/* Services */}
        <div className=\"space-y-2\">
          {Object.entries(partner.services)
            .filter(([_, service]) => service.available)
            .map(([serviceType, service]) => (
              <div 
                key={serviceType}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedPartner?.id === partner.id && selectedService === serviceType
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePartnerSelect(partner, serviceType);
                }}
              >
                <div>
                  <h4 className=\"font-medium text-gray-900 dark:text-white capitalize\">
                    {serviceType.replace('_', ' ')}
                  </h4>
                  <p className=\"text-sm text-gray-600 dark:text-gray-400\">
                    {service.minDays === service.maxDays 
                      ? `${service.minDays} day${service.minDays !== 1 ? 's' : ''}` 
                      : `${service.minDays}-${service.maxDays} days`}
                  </p>
                </div>
                <div className=\"text-right\">
                  <p className=\"font-bold text-gray-900 dark:text-white\">
                    {getServiceCost(partner, serviceType)} ETH
                  </p>
                  <p className=\"text-xs text-gray-500\">
                    Base: {service.baseCost} ETH
                  </p>
                </div>
              </div>
            ))
          }
        </div>
      </GlassPanel>
    </motion.div>
  );

  if (loading) {
    return (
      <GlassPanel variant=\"primary\" className=\"p-8 text-center\">
        <div className=\"animate-spin rounded-full h-12 w-12 border-4 border-blue-500/30 border-t-blue-500 mx-auto mb-4\" />
        <p className=\"text-gray-600 dark:text-gray-400\">Loading shipping partners...</p>
      </GlassPanel>
    );
  }

  return (
    <div className=\"space-y-6\">
      {/* Header */}
      <div className=\"flex items-center justify-between\">
        <div>
          <h2 className=\"text-2xl font-bold text-gray-900 dark:text-white flex items-center\">
            <Truck size={28} className=\"mr-3 text-blue-500\" />
            DAO-Approved Shipping Partners
          </h2>
          <p className=\"text-gray-600 dark:text-gray-400 mt-1\">
            Community-verified shipping partners with transparent governance
          </p>
        </div>
        
        <div className=\"flex items-center space-x-4\">
          {/* Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className=\"px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white\"
          >
            <option value=\"all\">All Partners</option>
            <option value=\"dao_approved\">DAO Approved</option>
            <option value=\"pending_approval\">Pending Approval</option>
          </select>
          
          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className=\"px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white\"
          >
            <option value=\"rating\">Sort by Rating</option>
            <option value=\"cost\">Sort by Cost</option>
            <option value=\"speed\">Sort by Speed</option>
            <option value=\"dao_votes\">Sort by DAO Votes</option>
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className=\"grid grid-cols-1 md:grid-cols-4 gap-4\">
        <GlassPanel variant=\"secondary\" className=\"p-4 text-center\">
          <div className=\"text-2xl font-bold text-blue-500 mb-1\">
            {partners.filter(p => p.daoApproved).length}
          </div>
          <div className=\"text-sm text-gray-600 dark:text-gray-400\">
            DAO Approved
          </div>
        </GlassPanel>
        
        <GlassPanel variant=\"secondary\" className=\"p-4 text-center\">
          <div className=\"text-2xl font-bold text-green-500 mb-1\">
            {(partners.reduce((sum, p) => sum + p.rating, 0) / partners.length).toFixed(1)}
          </div>
          <div className=\"text-sm text-gray-600 dark:text-gray-400\">
            Avg Rating
          </div>
        </GlassPanel>
        
        <GlassPanel variant=\"secondary\" className=\"p-4 text-center\">
          <div className=\"text-2xl font-bold text-purple-500 mb-1\">
            {partners.reduce((sum, p) => sum + p.reviewCount, 0).toLocaleString()}
          </div>
          <div className=\"text-sm text-gray-600 dark:text-gray-400\">
            Total Reviews
          </div>
        </GlassPanel>
        
        <GlassPanel variant=\"secondary\" className=\"p-4 text-center\">
          <div className=\"text-2xl font-bold text-orange-500 mb-1\">
            {(partners.reduce((sum, p) => sum + p.metrics.onTimeDelivery, 0) / partners.length).toFixed(1)}%
          </div>
          <div className=\"text-sm text-gray-600 dark:text-gray-400\">
            Avg On-Time
          </div>
        </GlassPanel>
      </div>

      {/* Partners List */}
      <div className=\"grid grid-cols-1 lg:grid-cols-2 gap-6\">
        {filteredPartners.map(renderPartnerCard)}
      </div>

      {/* No partners found */}
      {filteredPartners.length === 0 && (
        <GlassPanel variant=\"primary\" className=\"p-8 text-center\">
          <Truck size={48} className=\"mx-auto text-gray-400 mb-4\" />
          <h3 className=\"text-lg font-semibold text-gray-900 dark:text-white mb-2\">
            No Partners Found
          </h3>
          <p className=\"text-gray-600 dark:text-gray-400\">
            No shipping partners match your current filter criteria.
          </p>
        </GlassPanel>
      )}
    </div>
  );
};

// DAO Shipping Partner Governance Component
export const DAOShippingGovernance: React.FC = () => {
  const [proposals, setProposals] = useState([
    {
      id: 'prop_004',
      partnerName: 'Lightning Fast Delivery',
      proposalType: 'approval',
      description: 'Proposal to approve Lightning Fast Delivery as a new DAO shipping partner',
      votingPeriod: {
        start: new Date('2024-03-01'),
        end: new Date('2024-03-08')
      },
      votes: {
        for: 420,
        against: 180,
        abstain: 50
      },
      totalVotingPower: 1000,
      status: 'active',
      requirements: [
        'Minimum 95% on-time delivery rate',
        'Maximum 0.5% damage rate',
        'Customer satisfaction score above 4.5',
        'Insurance coverage up to $10,000'
      ]
    }
  ]);

  return (
    <div className=\"space-y-6\">
      <GlassPanel variant=\"primary\" className=\"p-6\">
        <h2 className=\"text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center\">
          <Vote size={24} className=\"mr-3 text-purple-500\" />
          Shipping Partner Governance
        </h2>
        
        <div className=\"space-y-6\">
          {proposals.map((proposal) => (
            <GlassPanel key={proposal.id} variant=\"secondary\" className=\"p-6\">
              <div className=\"flex items-start justify-between mb-4\">
                <div>
                  <h3 className=\"text-lg font-semibold text-gray-900 dark:text-white\">
                    {proposal.partnerName}
                  </h3>
                  <p className=\"text-sm text-gray-600 dark:text-gray-400\">
                    Proposal ID: {proposal.id}
                  </p>
                </div>
                <div className=\"text-right\">
                  <div className=\"bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm\">
                    {proposal.status.toUpperCase()}
                  </div>
                  <p className=\"text-xs text-gray-500 mt-1\">
                    Ends {proposal.votingPeriod.end.toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <p className=\"text-gray-600 dark:text-gray-400 mb-4\">
                {proposal.description}
              </p>
              
              <div className=\"grid grid-cols-1 md:grid-cols-2 gap-6\">
                <div>
                  <h4 className=\"font-medium text-gray-900 dark:text-white mb-2\">
                    Requirements
                  </h4>
                  <ul className=\"space-y-1 text-sm text-gray-600 dark:text-gray-400\">
                    {proposal.requirements.map((req, index) => (
                      <li key={index} className=\"flex items-center space-x-2\">
                        <CheckCircle size={12} className=\"text-green-400\" />
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h4 className=\"font-medium text-gray-900 dark:text-white mb-2\">
                    Voting Results
                  </h4>
                  <div className=\"space-y-2\">
                    <div className=\"flex justify-between items-center\">
                      <span className=\"text-sm text-green-400\">For</span>
                      <span className=\"font-medium\">{proposal.votes.for} votes</span>
                    </div>
                    <div className=\"flex justify-between items-center\">
                      <span className=\"text-sm text-red-400\">Against</span>
                      <span className=\"font-medium\">{proposal.votes.against} votes</span>
                    </div>
                    <div className=\"flex justify-between items-center\">
                      <span className=\"text-sm text-gray-400\">Abstain</span>
                      <span className=\"font-medium\">{proposal.votes.abstain} votes</span>
                    </div>
                    
                    <div className=\"mt-4\">
                      <div className=\"flex justify-between text-xs text-gray-500 mb-1\">
                        <span>Progress</span>
                        <span>{((proposal.votes.for + proposal.votes.against + proposal.votes.abstain) / proposal.totalVotingPower * 100).toFixed(1)}%</span>
                      </div>
                      <div className=\"w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2\">
                        <div 
                          className=\"bg-blue-500 h-2 rounded-full transition-all\"
                          style={{ 
                            width: `${(proposal.votes.for + proposal.votes.against + proposal.votes.abstain) / proposal.totalVotingPower * 100}%` 
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className=\"mt-6 flex space-x-3\">
                <Button variant=\"primary\" className=\"flex-1\">
                  <Vote size={16} className=\"mr-2\" />
                  Vote For
                </Button>
                <Button variant=\"outline\" className=\"flex-1\">
                  Vote Against
                </Button>
                <Button variant=\"outline\">
                  View Details
                </Button>
              </div>
            </GlassPanel>
          ))}
        </div>
      </GlassPanel>
    </div>
  );
};", "original_text": "", "replace_all": false}]