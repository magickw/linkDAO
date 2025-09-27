import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, UserPlusIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useContacts } from '@/contexts/ContactContext';
import { ContactFormData, CONTACT_TAGS } from '@/types/contacts';

interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddContactModal: React.FC<AddContactModalProps> = ({ isOpen, onClose }) => {
  const { groups, addContact } = useContacts();
  const [formData, setFormData] = useState<ContactFormData>({
    walletAddress: '',
    ensName: '',
    nickname: '',
    groups: [],
    tags: [],
    notes: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        walletAddress: '',
        ensName: '',
        nickname: '',
        groups: [],
        tags: [],
        notes: ''
      });
      setSelectedTags(new Set());
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.walletAddress.trim()) {
        throw new Error('Wallet address is required');
      }
      if (!formData.nickname.trim()) {
        throw new Error('Nickname is required');
      }

      // Validate wallet address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(formData.walletAddress)) {
        throw new Error('Invalid wallet address format');
      }

      await addContact({
        ...formData,
        tags: Array.from(selectedTags)
      });

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add contact');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTagToggle = (tag: string) => {
    const newTags = new Set(selectedTags);
    if (newTags.has(tag)) {
      newTags.delete(tag);
    } else {
      newTags.add(tag);
    }
    setSelectedTags(newTags);
  };

  const handleGroupToggle = (groupId: string) => {
    const newGroups = formData.groups.includes(groupId)
      ? formData.groups.filter(id => id !== groupId)
      : [...formData.groups, groupId];
    
    setFormData(prev => ({ ...prev, groups: newGroups }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md mx-4 bg-gray-800 rounded-xl shadow-xl border border-gray-700"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <UserPlusIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Add New Contact</h2>
                <p className="text-sm text-gray-400">Add a wallet address or ENS name</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* Wallet Address */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Wallet Address *
              </label>
              <input
                type="text"
                value={formData.walletAddress}
                onChange={(e) => setFormData(prev => ({ ...prev, walletAddress: e.target.value }))}
                placeholder="0x..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* ENS Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                ENS Name (Optional)
              </label>
              <input
                type="text"
                value={formData.ensName}
                onChange={(e) => setFormData(prev => ({ ...prev, ensName: e.target.value }))}
                placeholder="vitalik.eth"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Nickname */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nickname *
              </label>
              <input
                type="text"
                value={formData.nickname}
                onChange={(e) => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
                placeholder="Enter a friendly name"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Groups */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Groups
              </label>
              <div className="space-y-2">
                {groups.map(group => (
                  <label key={group.id} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.groups.includes(group.id)}
                      onChange={() => handleGroupToggle(group.id)}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-lg">{group.icon}</span>
                    <span className="text-sm text-gray-300">{group.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {CONTACT_TAGS.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagToggle(tag)}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                      selectedTags.has(tag)
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    {selectedTags.has(tag) && <CheckIcon className="w-3 h-3 inline mr-1" />}
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add personal notes about this contact..."
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Adding...' : 'Add Contact'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AddContactModal;