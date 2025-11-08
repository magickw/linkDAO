import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, CheckIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useContacts } from '@/contexts/ContactContext';
import { CONTACT_TAGS } from '@/types/contacts';

interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContactAdded?: () => void;
}

const AddContactModal: React.FC<AddContactModalProps> = ({ isOpen, onClose, onContactAdded }) => {
  const { groups, addContact, createGroup } = useContacts();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupIcon, setNewGroupIcon] = useState('👥');

  const [formData, setFormData] = useState({
    walletAddress: '',
    ensName: '',
    nickname: '',
    groups: [] as string[],
    tags: [] as string[],
    notes: ''
  });

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

  const handleGroupToggle = (groupId: string) => {
    setFormData(prev => {
      const newGroups = prev.groups.includes(groupId)
        ? prev.groups.filter(id => id !== groupId)
        : [...prev.groups, groupId];
      return { ...prev, groups: newGroups };
    });
  };

  const handleTagToggle = (tag: string) => {
    const newSelected = new Set(selectedTags);
    if (newSelected.has(tag)) {
      newSelected.delete(tag);
    } else {
      newSelected.add(tag);
    }
    setSelectedTags(newSelected);
    
    setFormData(prev => {
      const newTags = newSelected.has(tag)
        ? [...prev.tags, tag]
        : prev.tags.filter(t => t !== tag);
      return { ...prev, tags: newTags };
    });
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    
    try {
      // Create a simple group with default color
      await createGroup({
        name: newGroupName.trim(),
        type: 'custom',
        icon: newGroupIcon,
        color: '#4CAF50', // Default green color
        description: ''
      });
      
      setNewGroupName('');
      setShowCreateGroup(false);
    } catch (err) {
      setError('Failed to create group');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (!formData.walletAddress.trim()) {
        throw new Error('Wallet address is required');
      }

      if (!formData.nickname.trim()) {
        throw new Error('Nickname is required');
      }

      await addContact({
        walletAddress: formData.walletAddress.trim(),
        ensName: formData.ensName.trim() || undefined,
        nickname: formData.nickname.trim(),
        groups: formData.groups,
        tags: formData.tags,
        notes: formData.notes.trim() || undefined
      });

      onContactAdded?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add contact');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md bg-gray-800 rounded-xl shadow-2xl border border-gray-700"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white">Add New Contact</h3>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-white transition-colors"
              aria-label="Close"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {error && (
              <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg">
                <p className="text-sm text-red-300">{error}</p>
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
                placeholder="0x... or ENS name"
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
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-300">
                  Groups
                </label>
                <button
                  type="button"
                  onClick={() => setShowCreateGroup(true)}
                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                >
                  <PlusIcon className="w-3 h-3" />
                  Create Group
                </button>
              </div>
              
              {showCreateGroup ? (
                <div className="mb-3 p-3 bg-gray-700 rounded-lg">
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="Group name"
                      className="flex-1 px-2 py-1 text-sm bg-gray-600 border border-gray-500 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      autoFocus
                    />
                    <select
                      value={newGroupIcon}
                      onChange={(e) => setNewGroupIcon(e.target.value)}
                      className="px-2 py-1 text-sm bg-gray-600 border border-gray-500 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="👥">👥</option>
                      <option value="⭐">⭐</option>
                      <option value="💼">💼</option>
                      <option value="🏛️">🏛️</option>
                      <option value="🎮">🎮</option>
                      <option value="🎨">🎨</option>
                      <option value="🎵">🎵</option>
                      <option value="📚">📚</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCreateGroup}
                      className="flex-1 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                    >
                      Create
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateGroup(false)}
                      className="flex-1 px-2 py-1 text-xs bg-gray-600 hover:bg-gray-500 text-white rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="space-y-2 max-h-32 overflow-y-auto">
                {groups.length > 0 ? (
                  groups.map(group => (
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
                  ))
                ) : (
                  <p className="text-sm text-gray-400 italic">No groups yet. Create one above!</p>
                )}
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