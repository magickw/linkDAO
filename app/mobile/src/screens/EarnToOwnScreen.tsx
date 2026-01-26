import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

// Types
interface RWAAsset {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  currentValue: number;
  rentalRate: number; // Monthly rental rate as percentage
  totalValue: number;
  availableShares: number;
  totalShares: number;
  location: string;
  propertyType: 'residential' | 'commercial' | 'industrial' | 'land';
  status: 'available' | 'rented' | 'maintenance';
}

interface RentalAgreement {
  id: string;
  assetId: string;
  assetName: string;
  startDate: string;
  endDate: string;
  monthlyPayment: number;
  sharesOwned: number;
  equityAccumulated: number;
  status: 'active' | 'completed' | 'terminated';
}

export default function EarnToOwnScreen() {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<'browse' | 'my-rentals' | 'portfolio'>('browse');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [assets, setAssets] = useState<RWAAsset[]>([]);
  const [myRentals, setMyRentals] = useState<RentalAgreement[]>([]);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [totalEquity, setTotalEquity] = useState(0);

  // Mock data - replace with actual API calls
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API calls
      // const assetsResponse = await fetch(`${API_BASE_URL}/api/rwa/assets`);
      // const rentalsResponse = await fetch(`${API_BASE_URL}/api/rwa/my-rentals`);
      
      // Mock data
      setAssets([
        {
          id: '1',
          name: 'Downtown Apartment',
          description: 'Modern 2-bedroom apartment in prime location',
          imageUrl: 'https://via.placeholder.com/400x300',
          currentValue: 250000,
          rentalRate: 0.5, // 0.5% monthly
          totalValue: 250000,
          availableShares: 75,
          totalShares: 100,
          location: 'San Francisco, CA',
          propertyType: 'residential',
          status: 'available',
        },
        {
          id: '2',
          name: 'Commercial Office Space',
          description: 'Class A office building in business district',
          imageUrl: 'https://via.placeholder.com/400x300',
          currentValue: 1500000,
          rentalRate: 0.75,
          totalValue: 1500000,
          availableShares: 50,
          totalShares: 100,
          location: 'New York, NY',
          propertyType: 'commercial',
          status: 'available',
        },
      ]);

      setMyRentals([
        {
          id: 'r1',
          assetId: '1',
          assetName: 'Downtown Apartment',
          startDate: '2024-01-01',
          endDate: '2025-01-01',
          monthlyPayment: 1041.67,
          sharesOwned: 25,
          equityAccumulated: 31250,
          status: 'active',
        },
      ]);

      setPortfolioValue(62500);
      setTotalEquity(31250);
    } catch (error) {
      Alert.alert('Error', 'Failed to load RWA data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleRentAsset = (asset: RWAAsset) => {
    Alert.alert(
      'Start Rental Agreement',
      `Rent ${asset.name} for $${(asset.totalValue * (asset.rentalRate / 100)).toFixed(2)}/month`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Proceed',
          onPress: () => {
            // TODO: Navigate to rental agreement creation screen
            Alert.alert('Success', 'Rental agreement created successfully!');
          },
        },
      ]
    );
  };

  const renderBrowseTab = () => (
    <ScrollView
      style={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Browse Real World Assets</Text>
        <Text style={styles.headerSubtitle}>
          Invest in tokenized real estate and earn equity
        </Text>
      </View>

      {assets.map((asset) => (
        <TouchableOpacity
          key={asset.id}
          style={styles.assetCard}
          onPress={() => handleRentAsset(asset)}
        >
          <Image source={{ uri: asset.imageUrl }} style={styles.assetImage} />
          <View style={styles.assetInfo}>
            <View style={styles.assetHeader}>
              <Text style={styles.assetName}>{asset.name}</Text>
              <View style={[
                styles.statusBadge,
                asset.status === 'available' && styles.availableBadge,
                asset.status === 'rented' && styles.rentedBadge,
              ]}>
                <Text style={styles.statusText}>{asset.status}</Text>
              </View>
            </View>
            <Text style={styles.assetDescription} numberOfLines={2}>
              {asset.description}
            </Text>
            <Text style={styles.assetLocation}>{asset.location}</Text>
            
            <View style={styles.assetMetrics}>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Total Value</Text>
                <Text style={styles.metricValue}>
                  ${asset.totalValue.toLocaleString()}
                </Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Monthly Rate</Text>
                <Text style={styles.metricValue}>{asset.rentalRate}%</Text>
              </View>
            </View>

            <View style={styles.sharesInfo}>
              <Text style={styles.sharesText}>
                {asset.availableShares} / {asset.totalShares} shares available
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${((asset.totalShares - asset.availableShares) / asset.totalShares) * 100}%` },
                  ]}
                />
              </View>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderMyRentalsTab = () => (
    <ScrollView
      style={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Rental Agreements</Text>
        <Text style={styles.headerSubtitle}>
          Track your active rentals and equity growth
        </Text>
      </View>

      {myRentals.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No active rental agreements</Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => setActiveTab('browse')}
          >
            <Text style={styles.browseButtonText}>Browse Assets</Text>
          </TouchableOpacity>
        </View>
      ) : (
        myRentals.map((rental) => (
          <View key={rental.id} style={styles.rentalCard}>
            <View style={styles.rentalHeader}>
              <Text style={styles.rentalTitle}>{rental.assetName}</Text>
              <View style={[
                styles.statusBadge,
                rental.status === 'active' && styles.activeBadge,
              ]}>
                <Text style={styles.statusText}>{rental.status}</Text>
              </View>
            </View>

            <View style={styles.rentalDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Monthly Payment</Text>
                <Text style={styles.detailValue}>
                  ${rental.monthlyPayment.toFixed(2)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Shares Owned</Text>
                <Text style={styles.detailValue}>{rental.sharesOwned}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Equity Accumulated</Text>
                <Text style={[styles.detailValue, styles.equityValue]}>
                  ${rental.equityAccumulated.toLocaleString()}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>End Date</Text>
                <Text style={styles.detailValue}>{rental.endDate}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.manageButton}>
              <Text style={styles.manageButtonText}>Manage Agreement</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );

  const renderPortfolioTab = () => (
    <ScrollView
      style={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Portfolio Overview</Text>
        <Text style={styles.headerSubtitle}>
          Track your RWA investment performance
        </Text>
      </View>

      <View style={styles.portfolioSummary}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Portfolio Value</Text>
          <Text style={styles.summaryValue}>
            ${portfolioValue.toLocaleString()}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Equity</Text>
          <Text style={[styles.summaryValue, styles.equityValue]}>
            ${totalEquity.toLocaleString()}
          </Text>
        </View>
      </View>

      <View style={styles.performanceCard}>
        <Text style={styles.performanceTitle}>Performance Metrics</Text>
        <View style={styles.performanceRow}>
          <Text style={styles.performanceLabel}>Equity Growth Rate</Text>
          <Text style={styles.performanceValue}>+12.5%</Text>
        </View>
        <View style={styles.performanceRow}>
          <Text style={styles.performanceLabel}>Monthly Returns</Text>
          <Text style={styles.performanceValue}>+$781.25</Text>
        </View>
        <View style={styles.performanceRow}>
          <Text style={styles.performanceLabel}>Active Rentals</Text>
          <Text style={styles.performanceValue}>{myRentals.length}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.investButton}>
        <Text style={styles.investButtonText}>Invest in More Assets</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading RWA assets...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'browse' && styles.activeTab]}
          onPress={() => setActiveTab('browse')}
        >
          <Text style={[styles.tabText, activeTab === 'browse' && styles.activeTabText]}>
            Browse
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'my-rentals' && styles.activeTab]}
          onPress={() => setActiveTab('my-rentals')}
        >
          <Text style={[styles.tabText, activeTab === 'my-rentals' && styles.activeTabText]}>
            My Rentals
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'portfolio' && styles.activeTab]}
          onPress={() => setActiveTab('portfolio')}
        >
          <Text style={[styles.tabText, activeTab === 'portfolio' && styles.activeTabText]}>
            Portfolio
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'browse' && renderBrowseTab()}
      {activeTab === 'my-rentals' && renderMyRentalsTab()}
      {activeTab === 'portfolio' && renderPortfolioTab()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#3b82f6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: 'white',
  },
  content: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  assetCard: {
    backgroundColor: 'white',
    margin: 12,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  assetImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  assetInfo: {
    padding: 16,
  },
  assetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  assetName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  availableBadge: {
    backgroundColor: '#d1fae5',
  },
  rentedBadge: {
    backgroundColor: '#fee2e2',
  },
  activeBadge: {
    backgroundColor: '#dbeafe',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  assetDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  assetLocation: {
    fontSize: 14,
    color: '#3b82f6',
    marginBottom: 12,
  },
  assetMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metric: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  sharesInfo: {
    marginTop: 8,
  },
  sharesText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  browseButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  rentalCard: {
    backgroundColor: 'white',
    margin: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rentalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  rentalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  rentalDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  equityValue: {
    color: '#10b981',
  },
  manageButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  manageButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  portfolioSummary: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  performanceCard: {
    backgroundColor: 'white',
    margin: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  performanceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  performanceLabel: {
    fontSize: 14,
    color: '#666',
  },
  performanceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  investButton: {
    backgroundColor: '#10b981',
    margin: 12,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  investButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});