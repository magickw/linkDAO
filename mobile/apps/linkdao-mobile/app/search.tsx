/**
 * Search Screen
 * Search for posts, communities, and users with filters
 */

import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { OptimizedFlatList } from '../../src/components';

export default function SearchScreen() {
  const router = useRouter();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'all' | 'posts' | 'communities' | 'users'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>(['Web3', 'DeFi', 'NFTs', 'Smart Contracts']);

  const [filters, setFilters] = useState({
    sortBy: 'relevance', // relevance, date, popularity
    timeRange: 'all', // all, today, week, month, year
    category: 'all', // all, technology, art, gaming, music, sports
    minMembers: 0,
    isVerified: false,
  });

  useEffect(() => {
    if (searchQuery.length > 2) {
      performSearch();
    } else {
      setResults([]);
    }
  }, [searchQuery, searchType, filters]);

  const performSearch = async () => {
    setLoading(true);
    try {
      // In production, call search API
      const mockResults = [
        {
          id: '1',
          type: 'post',
          content: 'Exploring the future of decentralized finance and its impact on traditional banking systems',
          author: 'Alice',
          likes: 156,
          timestamp: '2 hours ago',
        },
        {
          id: '2',
          type: 'community',
          name: 'Web3 Developers',
          handle: 'web3dev',
          description: 'A community for Web3 developers',
          members: 1234,
          image: '#3b82f6',
        },
        {
          id: '3',
          type: 'user',
          name: 'Bob Smith',
          handle: 'bobsmith',
          bio: 'Blockchain enthusiast and developer',
          avatar: '#10b981',
        },
        {
          id: '4',
          type: 'post',
          content: 'Latest NFT trends and market analysis for Q4 2024',
          author: 'Charlie',
          likes: 89,
          timestamp: '5 hours ago',
        },
        {
          id: '5',
          type: 'community',
          name: 'DeFi Explorers',
          handle: 'defiexplorers',
          description: 'Discover and discuss DeFi protocols',
          members: 5678,
          image: '#8b5cf6',
        },
      ];

      // Filter results based on search type
      let filteredResults = mockResults;
      if (searchType !== 'all') {
        filteredResults = mockResults.filter((result) => result.type === searchType);
      }

      setResults(filteredResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchPress = (query: string) => {
    setSearchQuery(query);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setResults([]);
  };

  const toggleFilter = (filterKey: string, value: any) => {
    setFilters({ ...filters, [filterKey]: value });
  };

  const renderResult = ({ item }: any) => {
    if (item.type === 'post') {
      return (
        <TouchableOpacity
          style={styles.resultCard}
          onPress={() => router.push(`/post/${item.id}`)}
        >
          <View style={styles.resultHeader}>
            <View style={[styles.resultIcon, { backgroundColor: '#f59e0b' }]}>
              <Ionicons name="document-text" size={20} color="#ffffff" />
            </View>
            <View style={styles.resultInfo}>
              <Text style={styles.resultTitle} numberOfLines={2}>
                {item.content}
              </Text>
              <Text style={styles.resultMeta}>
                by {item.author} • {item.timestamp} • {item.likes} likes
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    if (item.type === 'community') {
      return (
        <TouchableOpacity
          style={styles.resultCard}
          onPress={() => router.push(`/communities/${item.id}`)}
        >
          <View style={styles.resultHeader}>
            <View style={[styles.resultIcon, { backgroundColor: item.image }]}>
              <Ionicons name="people" size={20} color="#ffffff" />
            </View>
            <View style={styles.resultInfo}>
              <Text style={styles.resultTitle}>{item.name}</Text>
              <Text style={styles.resultMeta}>
                @{item.handle} • {item.members.toLocaleString()} members
              </Text>
              <Text style={styles.resultDescription} numberOfLines={1}>
                {item.description}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    if (item.type === 'user') {
      return (
        <TouchableOpacity
          style={styles.resultCard}
          onPress={() => router.push(`/profile/${item.handle}`)}
        >
          <View style={styles.resultHeader}>
            <View style={[styles.resultIcon, { backgroundColor: item.avatar }]}>
              <Ionicons name="person" size={20} color="#ffffff" />
            </View>
            <View style={styles.resultInfo}>
              <Text style={styles.resultTitle}>{item.name}</Text>
              <Text style={styles.resultMeta}>@{item.handle}</Text>
              <Text style={styles.resultDescription} numberOfLines={1}>
                {item.bio}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search posts, communities, users..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="options" size={20} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      {/* Search Type Tabs */}
      <View style={styles.tabsContainer}>
        {['all', 'posts', 'communities', 'users'].map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.tab, searchType === type && styles.tabActive]}
            onPress={() => setSearchType(type as any)}
          >
            <Text style={[styles.tabText, searchType === type && styles.tabTextActive]}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content}>
        {/* Loading State */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        )}

        {/* Search Results */}
        {!loading && results.length > 0 && (
          <View style={styles.resultsSection}>
            <Text style={styles.resultsTitle}>
              {results.length} result{results.length !== 1 ? 's' : ''} found
            </Text>
            <OptimizedFlatList
              data={results}
              renderItem={renderResult}
              keyExtractor={(item) => item.id}
              estimatedItemSize={100}
            />
          </View>
        )}

        {/* Empty State */}
        {!loading && results.length === 0 && searchQuery.length > 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="search" size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No results found</Text>
            <Text style={styles.emptyDescription}>
              Try different keywords or filters
            </Text>
          </View>
        )}

        {/* Recent Searches */}
        {!loading && results.length === 0 && searchQuery.length === 0 && (
          <View style={styles.recentSection}>
            <View style={styles.recentHeader}>
              <Text style={styles.recentTitle}>Recent Searches</Text>
              <TouchableOpacity onPress={() => setRecentSearches([])}>
                <Text style={styles.clearRecentText}>Clear</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.recentTags}>
              {recentSearches.map((search, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.recentTag}
                  onPress={() => handleSearchPress(search)}
                >
                  <Ionicons name="time" size={14} color="#6b7280" />
                  <Text style={styles.recentTagText}>{search}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.recentTitle}>Popular Topics</Text>
            <View style={styles.popularTags}>
              {['Web3', 'DeFi', 'NFTs', 'Smart Contracts', 'DAO', 'Metaverse'].map((topic, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.popularTag}
                  onPress={() => handleSearchPress(topic)}
                >
                  <Text style={styles.popularTagText}>{topic}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Filters Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilters(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filters</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={24} color="#1f2937" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Sort By */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Sort By</Text>
              {['relevance', 'date', 'popularity'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.filterOption,
                    filters.sortBy === option && styles.filterOptionActive,
                  ]}
                  onPress={() => toggleFilter('sortBy', option)}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      filters.sortBy === option && styles.filterOptionTextActive,
                    ]}
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </Text>
                  {filters.sortBy === option && (
                    <Ionicons name="checkmark" size={20} color="#3b82f6" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Time Range */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Time Range</Text>
              {['all', 'today', 'week', 'month', 'year'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.filterOption,
                    filters.timeRange === option && styles.filterOptionActive,
                  ]}
                  onPress={() => toggleFilter('timeRange', option)}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      filters.timeRange === option && styles.filterOptionTextActive,
                    ]}
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </Text>
                  {filters.timeRange === option && (
                    <Ionicons name="checkmark" size={20} color="#3b82f6" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Category */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Category</Text>
              {['all', 'technology', 'art', 'gaming', 'music', 'sports'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.filterOption,
                    filters.category === option && styles.filterOptionActive,
                  ]}
                  onPress={() => toggleFilter('category', option)}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      filters.category === option && styles.filterOptionTextActive,
                    ]}
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </Text>
                  {filters.category === option && (
                    <Ionicons name="checkmark" size={20} color="#3b82f6" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Verified Only */}
            <View style={styles.filterSection}>
              <View style={styles.filterRow}>
                <Text style={styles.filterSectionTitle}>Verified Only</Text>
                <TouchableOpacity
                  style={[
                    styles.toggle,
                    filters.isVerified && styles.toggleActive,
                  ]}
                  onPress={() => toggleFilter('isVerified', !filters.isVerified)}
                >
                  <View
                    style={[
                      styles.toggleDot,
                      filters.isVerified && styles.toggleDotActive,
                    ]}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => {
                setFilters({
                  sortBy: 'relevance',
                  timeRange: 'all',
                  category: 'all',
                  minMembers: 0,
                  isVerified: false,
                });
              }}
            >
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => setShowFilters(false)}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
  filterButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  resultsSection: {
    padding: 16,
  },
  resultsTitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  resultCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  resultIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resultInfo: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  resultMeta: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  resultDescription: {
    fontSize: 14,
    color: '#4b5563',
  },
  emptyState: {
    paddingVertical: 80,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  recentSection: {
    padding: 16,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  clearRecentText: {
    fontSize: 14,
    color: '#3b82f6',
  },
  recentTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  recentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  recentTagText: {
    fontSize: 14,
    color: '#1f2937',
    marginLeft: 6,
  },
  popularTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  popularTag: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  popularTagText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  filterOptionActive: {
    backgroundColor: '#eff6ff',
  },
  filterOptionText: {
    fontSize: 16,
    color: '#1f2937',
  },
  filterOptionTextActive: {
    color: '#3b82f6',
    fontWeight: '500',
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#d1d5db',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: '#3b82f6',
  },
  toggleDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  toggleDotActive: {
    transform: [{ translateX: 20 }],
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});