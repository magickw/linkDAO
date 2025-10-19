import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import OfflineContent from '../components/offline/OfflineContent';
import OfflineService from '../services/offlineService';

interface OfflineStats {
  totalActions: number;
  pendingActions: number;
  completedActions: number;
  failedActions: number;
  cachedContentCount: number;
  totalSize: number;
  communityCount: number;
}

export default function OfflineContentScreen() {
  const [stats, setStats] = useState<OfflineStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      // In a real app, this would fetch from the backend
      // const response = await fetch('/api/mobile/offline/stats');
      // const data = await response.json();
      // setStats(data.stats);
      
      // For now, simulate with local data
      const usage = await OfflineService.getStorageUsage();
      setStats({
        ...usage,
        communityCount: 5, // Simulated data
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      Alert.alert('Error', 'Failed to load offline statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const handlePrepareContent = async () => {
    try {
      // In a real app, this would call the backend
      // const response = await fetch('/api/mobile/offline/prepare', { method: 'POST' });
      // const data = await response.json();
      
      Alert.alert('Success', 'Offline content preparation started');
    } catch (error) {
      console.error('Error preparing content:', error);
      Alert.alert('Error', 'Failed to prepare offline content');
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading offline statistics...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Offline Content</Text>
        <TouchableOpacity 
          style={styles.prepareButton}
          onPress={handlePrepareContent}
        >
          <Text style={styles.prepareButtonText}>Prepare Content</Text>
        </TouchableOpacity>
      </View>

      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.cachedContentCount}</Text>
              <Text style={styles.statLabel}>Cached Items</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{formatSize(stats.totalSize)}</Text>
              <Text style={styles.statLabel}>Storage Used</Text>
            </View>
          </View>
          
          <View style={styles.statRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.pendingActions}</Text>
              <Text style={styles.statLabel}>Pending Actions</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.communityCount}</Text>
              <Text style={styles.statLabel}>Communities</Text>
            </View>
          </View>
        </View>
      )}

      <OfflineContent onRefresh={handleRefresh} />

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Content is automatically cached when you browse online
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  prepareButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  prepareButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 10,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  footer: {
    backgroundColor: 'white',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});