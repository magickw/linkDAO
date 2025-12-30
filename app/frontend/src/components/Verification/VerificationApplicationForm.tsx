/**
 * VerificationApplicationForm Component
 * Industry-standard verification application form with notability proof requirements
 * Inspired by Twitter/X, Facebook, Instagram verification systems
 */

import React, { useState } from 'react';
import { useToast } from '@/context/ToastContext';
import { Button, GlassPanel } from '@/design-system';
import { UserVerificationBadge, VerificationBadgeType } from './UserVerificationBadge';

export type EntityType = 'individual' | 'organization';

interface VerificationApplicationFormProps {
  onSubmit: (data: VerificationApplicationData) => Promise<void>;
  onCancel?: () => void;
  initialData?: Partial<VerificationApplicationData>;
}

export interface VerificationApplicationData {
  entityType: EntityType;
  category: string;
  description: string;
  website: string;
  socialProof: {
    twitter?: string;
    github?: string;
    linkedin?: string;
    youtube?: string;
    instagram?: string;
  };
  notabilitySources: string[];
  notabilityDescription: string;
  externalLinks: string[];
  // Organization-specific fields
  orgName?: string;
  orgType?: string;
  orgEmail?: string;
  registrationNumber?: string;
  // Documents
  governmentIdProvided: boolean;
}

const INDIVIDUAL_CATEGORIES = [
  'influencer',
  'creator',
  'journalist',
  'developer',
  'artist',
  'musician',
  'founder',
  'thought_leader',
  'athlete',
  'other'
];

const ORGANIZATION_CATEGORIES = [
  'company',
  'dao',
  'protocol',
  'nft_project',
  'media_outlet',
  'non_profit',
  'educational',
  'other'
];

const NOTABILITY_SOURCES = [
  { id: 'wikipedia', label: 'Wikipedia / Wikidata', description: 'Has a Wikipedia page' },
  { id: 'news', label: 'News Coverage', description: 'Featured in major news publications' },
  { id: 'verified_social', label: 'Verified on Other Platforms', description: 'Verified on Twitter, Instagram, etc.' },
  { id: 'ens', label: 'ENS Name', description: 'Owns an ENS domain' },
  { id: 'github', label: 'GitHub', description: 'Active open-source contributor' },
  { id: 'dao_role', label: 'DAO Role', description: 'Core contributor to a DAO' },
  { id: 'youtube', label: 'YouTube', description: '100k+ subscribers' },
  { id: 'podcast', label: 'Podcast Host', description: 'Hosts a popular podcast' }
];

export const VerificationApplicationForm: React.FC<VerificationApplicationFormProps> = ({
  onSubmit,
  onCancel,
  initialData
}) => {
  const { addToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<VerificationApplicationData>({
    entityType: 'individual',
    category: '',
    description: '',
    website: '',
    socialProof: {},
    notabilitySources: [],
    notabilityDescription: '',
    externalLinks: [],
    governmentIdProvided: false,
    ...initialData
  });

  const [newExternalLink, setNewExternalLink] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!formData.category) {
        addToast('Please select a category', 'error');
        return;
      }

      if (!formData.description || formData.description.length < 50) {
        addToast('Please provide a description (at least 50 characters)', 'error');
        return;
      }

      if (formData.notabilitySources.length === 0) {
        addToast('Please select at least one notability source', 'error');
        return;
      }

      if (!formData.notabilityDescription || formData.notabilityDescription.length < 100) {
        addToast('Please describe your notability (at least 100 characters)', 'error');
        return;
      }

      if (formData.entityType === 'organization' && !formData.orgName) {
        addToast('Organization name is required', 'error');
        return;
      }

      await onSubmit(formData);
      addToast('Verification application submitted successfully!', 'success');
    } catch (error) {
      addToast('Failed to submit application. Please try again.', 'error');
      console.error('Verification application error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addExternalLink = () => {
    if (newExternalLink && !formData.externalLinks.includes(newExternalLink)) {
      setFormData({
        ...formData,
        externalLinks: [...formData.externalLinks, newExternalLink]
      });
      setNewExternalLink('');
    }
  };

  const removeExternalLink = (link: string) => {
    setFormData({
      ...formData,
      externalLinks: formData.externalLinks.filter(l => l !== link)
    });
  };

  const toggleNotabilitySource = (source: string) => {
    setFormData({
      ...formData,
      notabilitySources: formData.notabilitySources.includes(source)
        ? formData.notabilitySources.filter(s => s !== source)
        : [...formData.notabilitySources, source]
    });
  };

  const categories = formData.entityType === 'individual'
    ? INDIVIDUAL_CATEGORIES
    : ORGANIZATION_CATEGORIES;

  const expectedBadgeType: VerificationBadgeType =
    formData.entityType === 'organization' ? 'gold_check' : 'blue_check';

  return (
    <GlassPanel className="max-w-3xl mx-auto p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">
          Apply for Verification
        </h2>
        <p className="text-gray-300 mb-4">
          Get verified to protect your identity and prevent impersonation.
          Verification confirms authenticity and notability.
        </p>

        <div className="flex items-center gap-4 mb-4">
          <div className="text-sm text-gray-400">You will receive:</div>
          <UserVerificationBadge badgeType={expectedBadgeType} size="md" />
          <span className="text-sm text-gray-300">
            {expectedBadgeType === 'gold_check' ? 'Verified Organization' : 'Verified Individual'}
          </span>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-sm text-blue-300">
          <strong>Important:</strong> Verification does not imply endorsement by LinkDAO.
          It only confirms that the account represents a real, authentic entity.
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Entity Type Selection */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Entity Type *
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, entityType: 'individual' })}
              className={`
                p-4 rounded-lg border-2 transition-all
                ${formData.entityType === 'individual'
                  ? 'border-blue-500 bg-blue-500/20'
                  : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                }
              `}
            >
              <div className="flex items-center gap-3 mb-2">
                <UserVerificationBadge badgeType="blue_check" size="md" />
                <span className="text-white font-semibold">Individual</span>
              </div>
              <p className="text-xs text-gray-400 text-left">
                Public figures, influencers, creators, journalists, founders
              </p>
            </button>

            <button
              type="button"
              onClick={() => setFormData({ ...formData, entityType: 'organization' })}
              className={`
                p-4 rounded-lg border-2 transition-all
                ${formData.entityType === 'organization'
                  ? 'border-yellow-500 bg-yellow-500/20'
                  : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                }
              `}
            >
              <div className="flex items-center gap-3 mb-2">
                <UserVerificationBadge badgeType="gold_check" size="md" />
                <span className="text-white font-semibold">Organization</span>
              </div>
              <p className="text-xs text-gray-400 text-left">
                Companies, DAOs, protocols, NFT projects, media outlets
              </p>
            </button>
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Category *
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select a category...</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        {/* Organization Name (for organizations) */}
        {formData.entityType === 'organization' && (
          <>
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Organization Name *
              </label>
              <input
                type="text"
                value={formData.orgName || ''}
                onChange={(e) => setFormData({ ...formData, orgName: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Acme Corp, MyDAO"
                required={formData.entityType === 'organization'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Organization Type
              </label>
              <select
                value={formData.orgType || ''}
                onChange={(e) => setFormData({ ...formData, orgType: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select type...</option>
                {ORGANIZATION_CATEGORIES.map((type) => (
                  <option key={type} value={type}>
                    {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Organization Email
              </label>
              <input
                type="email"
                value={formData.orgEmail || ''}
                onChange={(e) => setFormData({ ...formData, orgEmail: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="admin@company.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Registration Number
              </label>
              <input
                type="text"
                value={formData.registrationNumber || ''}
                onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Business registration number (optional)"
              />
            </div>
          </>
        )}

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Description *
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
            placeholder="Describe who you are or what your organization does..."
            required
          />
          <p className="text-xs text-gray-500 mt-1">Minimum 50 characters</p>
        </div>

        {/* Website */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Website
          </label>
          <input
            type="url"
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://yourwebsite.com"
          />
        </div>

        {/* Social Proof */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Social Media Links
          </label>
          <div className="space-y-3">
            <input
              type="text"
              value={formData.socialProof.twitter || ''}
              onChange={(e) => setFormData({
                ...formData,
                socialProof: { ...formData.socialProof, twitter: e.target.value }
              })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://twitter.com/yourhandle"
            />
            <input
              type="text"
              value={formData.socialProof.github || ''}
              onChange={(e) => setFormData({
                ...formData,
                socialProof: { ...formData.socialProof, github: e.target.value }
              })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://github.com/yourusername"
            />
            <input
              type="text"
              value={formData.socialProof.linkedin || ''}
              onChange={(e) => setFormData({
                ...formData,
                socialProof: { ...formData.socialProof, linkedin: e.target.value }
              })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://linkedin.com/in/yourprofile"
            />
          </div>
        </div>

        {/* Notability Sources */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Notability Sources * (Select at least one)
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {NOTABILITY_SOURCES.map((source) => (
              <button
                key={source.id}
                type="button"
                onClick={() => toggleNotabilitySource(source.id)}
                className={`
                  p-3 rounded-lg border-2 text-left transition-all
                  ${formData.notabilitySources.includes(source.id)
                    ? 'border-purple-500 bg-purple-500/20'
                    : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }
                `}
              >
                <div className="flex items-start gap-2">
                  <div className={`
                    w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5
                    ${formData.notabilitySources.includes(source.id)
                      ? 'border-purple-500 bg-purple-500'
                      : 'border-gray-600'
                    }
                  `}>
                    {formData.notabilitySources.includes(source.id) && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <div className="text-white font-medium">{source.label}</div>
                    <div className="text-xs text-gray-400">{source.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Notability Description */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Describe Your Notability *
          </label>
          <textarea
            value={formData.notabilityDescription}
            onChange={(e) => setFormData({ ...formData, notabilityDescription: e.target.value })}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px]"
            placeholder="Explain why you are notable in your field. Include achievements, recognition, awards, media coverage, etc."
            required
          />
          <p className="text-xs text-gray-500 mt-1">Minimum 100 characters</p>
        </div>

        {/* External Links */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            External Links (News Articles, Wikipedia, etc.)
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="url"
              value={newExternalLink}
              onChange={(e) => setNewExternalLink(e.target.value)}
              className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com/news-article"
            />
            <button
              type="button"
              onClick={addExternalLink}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add
            </button>
          </div>
          {formData.externalLinks.length > 0 && (
            <div className="space-y-2">
              {formData.externalLinks.map((link, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-800/50 px-3 py-2 rounded-lg">
                  <a href={link} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:text-blue-300 truncate flex-1">
                    {link}
                  </a>
                  <button
                    type="button"
                    onClick={() => removeExternalLink(link)}
                    className="ml-2 text-red-400 hover:text-red-300"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Government ID (Optional) */}
        {formData.entityType === 'individual' && (
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="governmentId"
              checked={formData.governmentIdProvided}
              onChange={(e) => setFormData({ ...formData, governmentIdProvided: e.target.checked })}
              className="mt-1 w-4 h-4 rounded border-gray-600 bg-gray-800 text-purple-500 focus:ring-purple-500"
            />
            <div>
              <label htmlFor="governmentId" className="text-sm text-white cursor-pointer">
                I will provide government ID (optional)
              </label>
              <p className="text-xs text-gray-400">
                Providing government ID can strengthen your application. Your ID will be encrypted and stored securely.
              </p>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-sm text-yellow-300">
          <strong>Review Process:</strong> All verification applications are reviewed manually by our team.
          This process typically takes 3-7 business days. You will be notified of the decision via email.
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-4">
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Application'}
          </Button>
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
        </div>
      </form>
    </GlassPanel>
  );
};

export default VerificationApplicationForm;