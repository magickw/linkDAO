/**
 * Search Modal for Messages
 * Advanced search with filters
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SearchFilters {
  query: string;
  sender?: string;
  dateFrom?: string;
  dateTo?: string;
  hasAttachments?: boolean;
}

interface MessageSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onSearch: (filters: SearchFilters) => void;
  conversationId?: string;
}

export default function MessageSearchModal({ visible, onClose, onSearch, conversationId }: MessageSearchModalProps) {
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({ query: '' });

  const handleApplySearch = () => {
    onSearch({ ...filters, query });
    onClose();
  };

  const handleClearFilters = () => {
    setQuery('');
    setFilters({ query: '' });
  };

  const quickSearches = [
    { label: 'Images', icon: 'image-outline', filter: 'images' },
    { label: 'Files', icon: 'document-outline', filter: 'files' },
    { label: 'Links', icon: 'link-outline', filter: 'links' },
    { label: 'Reactions', icon: 'heart-outline', filter: 'reactions' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {conversationId ? 'Search Conversation' : 'Search Messages'}
          </Text>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons
              name={showFilters ? 'funnel' : 'funnel-outline'}
              size={24}
              color={showFilters ? '#3b82f6' : '#6b7280'}
            />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Search Input */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search messages..."
              placeholderTextColor="#9ca3af"
              value={query}
              onChangeText={setQuery}
              autoFocus
              onSubmitEditing={handleApplySearch}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>

          {/* Advanced Filters */}
          {showFilters && (
            <View style={styles.filtersSection}>
              <Text style={styles.filtersTitle}>Filters</Text>
              
              <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>From Sender</Text>
                <TextInput
                  style={styles.filterInput}
                  placeholder="Enter wallet address"
                  value={filters.sender || ''}
                  onChangeText={(text) => setFilters({ ...filters, sender: text })}
                />
              </View>

              <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>Has Attachments</Text>
                <TouchableOpacity
                  style={[
                    styles.toggle,
                    filters.hasAttachments && styles.toggleActive
                  ]}
                  onPress={() => setFilters({ ...filters, hasAttachments: !filters.hasAttachments })}
                >
                  <View style={[styles.toggleThumb, filters.hasAttachments && styles.toggleThumbActive]} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Quick Search Options */}
          {!conversationId && (
            <View style={styles.quickSearchSection}>
              <Text style={styles.sectionTitle}>Quick Search</Text>
              <View style={styles.quickSearchGrid}>
                {quickSearches.map((item) => (
                  <TouchableOpacity
                    key={item.filter}
                    style={styles.quickSearchItem}
                    onPress={() => {
                      setQuery(item.filter === 'images' ? 'image' : 
                               item.filter === 'files' ? 'file' :
                               item.filter === 'links' ? 'http' :
                               'reacted');
                    }}
                  >
                    <Ionicons name={item.icon as any} size={24} color="#3b82f6" />
                    <Text style={styles.quickSearchLabel}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Search Tips */}
          <View style={styles.tipsSection}>
            <Text style={styles.sectionTitle}>Search Tips</Text>
            <View style={styles.tipItem}>
              <Ionicons name="information-circle" size={16} color="#3b82f6" />
              <Text style={styles.tipText}>Use quotes for exact phrases: "hello world"</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="information-circle" size={16} color="#3b82f6" />
              <Text style={styles.tipText}>Combine keywords with spaces: crypto payment</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="information-circle" size={16} color="#3b82f6" />
              <Text style={styles.tipText}>Exclude words with -:payment failed</Text>
            </View>
          </View>
        </ScrollView>

        {/* Search Button */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.clearButtonFooter} onPress={handleClearFilters}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.searchButton, !query.trim() && styles.searchButtonDisabled]}
            onPress={handleApplySearch}
            disabled={!query.trim()}
          >
            <Ionicons name="search" size={20} color="#ffffff" />
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  filterButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  clearButton: {
    padding: 4,
  },
  filtersSection: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filtersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  filterRow: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  filterInput: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    fontSize: 14,
    color: '#1f2937',
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e5e7eb',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: '#3b82f6',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
  quickSearchSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  quickSearchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickSearchItem: {
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    width: (375 - 64) / 4 - 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  quickSearchLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  tipsSection: {
    marginTop: 24,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  clearButtonFooter: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  searchButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
  },
  searchButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});