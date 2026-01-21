/**
 * Inventory Management Component
 * Allows sellers to manage their product inventory
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  category: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  lastUpdated: string;
}

interface InventoryManagementProps {
  sellerId: string;
}

export const InventoryManagement: React.FC<InventoryManagementProps> = ({ sellerId }) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editQuantity, setEditQuantity] = useState('');
  const [updating, setUpdating] = useState(false);

  const loadInventory = useCallback(async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API call
      const mockInventory: InventoryItem[] = [
        {
          id: '1',
          name: 'Premium Wireless Headphones',
          sku: 'WH-001',
          quantity: 45,
          price: 149.99,
          category: 'Electronics',
          status: 'in_stock',
          lastUpdated: new Date().toISOString(),
        },
        {
          id: '2',
          name: 'Smart Watch Pro',
          sku: 'SW-002',
          quantity: 8,
          price: 299.99,
          category: 'Electronics',
          status: 'low_stock',
          lastUpdated: new Date().toISOString(),
        },
        {
          id: '3',
          name: 'Portable Speaker',
          sku: 'PS-003',
          quantity: 0,
          price: 59.99,
          category: 'Electronics',
          status: 'out_of_stock',
          lastUpdated: new Date().toISOString(),
        },
        {
          id: '4',
          name: 'USB-C Cable',
          sku: 'UC-004',
          quantity: 120,
          price: 12.99,
          category: 'Accessories',
          status: 'in_stock',
          lastUpdated: new Date().toISOString(),
        },
      ];
      setInventory(mockInventory);
    } catch (error) {
      console.error('Error loading inventory:', error);
      Alert.alert('Error', 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const filteredInventory = inventory.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: InventoryItem['status']) => {
    switch (status) {
      case 'in_stock':
        return '#10b981';
      case 'low_stock':
        return '#f59e0b';
      case 'out_of_stock':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusText = (status: InventoryItem['status']) => {
    switch (status) {
      case 'in_stock':
        return 'In Stock';
      case 'low_stock':
        return 'Low Stock';
      case 'out_of_stock':
        return 'Out of Stock';
      default:
        return 'Unknown';
    }
  };

  const handleEditItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setEditQuantity(item.quantity.toString());
    setShowEditModal(true);
  };

  const handleUpdateQuantity = async () => {
    if (!selectedItem) return;

    const newQuantity = parseInt(editQuantity);
    if (isNaN(newQuantity) || newQuantity < 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    setUpdating(true);

    try {
      // TODO: Replace with actual API call
      // await apiClient.put(`/api/seller/inventory/${selectedItem.id}`, { quantity: newQuantity });

      // Update local state
      setInventory((prev) =>
        prev.map((item) =>
          item.id === selectedItem.id
            ? {
                ...item,
                quantity: newQuantity,
                status:
                  newQuantity === 0
                    ? 'out_of_stock'
                    : newQuantity < 10
                    ? 'low_stock'
                    : 'in_stock',
                lastUpdated: new Date().toISOString(),
              }
            : item
        )
      );

      setShowEditModal(false);
      setSelectedItem(null);
      Alert.alert('Success', 'Inventory updated successfully');
    } catch (error) {
      console.error('Error updating inventory:', error);
      Alert.alert('Error', 'Failed to update inventory');
    } finally {
      setUpdating(false);
    }
  };

  const handleBulkRestock = () => {
    Alert.alert(
      'Bulk Restock',
      'This feature allows you to restock multiple items at once. Would you like to continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: () => {
            // TODO: Implement bulk restock functionality
            Alert.alert('Info', 'Bulk restock feature coming soon!');
          },
        },
      ]
    );
  };

  const renderInventoryItem = useCallback(
    ({ item }: { item: InventoryItem }) => (
      <View style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemSku}>SKU: {item.sku}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          >
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
        </View>

        <View style={styles.itemDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Quantity:</Text>
            <Text style={styles.detailValue}>{item.quantity}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Price:</Text>
            <Text style={styles.detailValue}>${item.price.toFixed(2)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Category:</Text>
            <Text style={styles.detailValue}>{item.category}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.editButton}
          onPress={() => handleEditItem(item)}
        >
          <Ionicons name="create-outline" size={20} color="#4ecca3" />
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
      </View>
    ),
    []
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4ecca3" />
        <Text style={styles.loadingText}>Loading inventory...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Inventory Management</Text>
        <TouchableOpacity
          style={styles.bulkActionButton}
          onPress={handleBulkRestock}
        >
          <Ionicons name="layers-outline" size={20} color="#ffffff" />
          <Text style={styles.bulkActionText}>Bulk Restock</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#a0a0a0" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          placeholderTextColor="#a0a0a0"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Inventory Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Items</Text>
          <Text style={styles.statValue}>{inventory.length}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Low Stock</Text>
          <Text style={[styles.statValue, { color: '#f59e0b' }]}>
            {inventory.filter((i) => i.status === 'low_stock').length}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Out of Stock</Text>
          <Text style={[styles.statValue, { color: '#ef4444' }]}>
            {inventory.filter((i) => i.status === 'out_of_stock').length}
          </Text>
        </View>
      </View>

      {/* Inventory List */}
      {filteredInventory.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cube-outline" size={64} color="#a0a0a0" />
          <Text style={styles.emptyText}>No inventory items found</Text>
        </View>
      ) : (
        <FlatList
          data={filteredInventory}
          renderItem={renderInventoryItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Inventory</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {selectedItem && (
              <ScrollView style={styles.modalBody}>
                <Text style={styles.modalItemName}>{selectedItem.name}</Text>
                <Text style={styles.modalItemSku}>SKU: {selectedItem.sku}</Text>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Quantity</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editQuantity}
                    onChangeText={setEditQuantity}
                    keyboardType="number-pad"
                    placeholder="Enter quantity"
                    placeholderTextColor="#a0a0a0"
                  />
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonCancel]}
                    onPress={() => setShowEditModal(false)}
                  >
                    <Text style={styles.modalButtonTextCancel}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonConfirm]}
                    onPress={handleUpdateQuantity}
                    disabled={updating}
                  >
                    {updating ? (
                      <ActivityIndicator color="#0f0f23" />
                    ) : (
                      <Text style={styles.modalButtonTextConfirm}>Update</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#a0a0a0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1a1a2e',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  bulkActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4ecca3',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bulkActionText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#0f0f23',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#ffffff',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#a0a0a0',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4ecca3',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  itemCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  itemSku: {
    fontSize: 12,
    color: '#a0a0a0',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
  },
  itemDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 14,
    color: '#a0a0a0',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16213e',
    paddingVertical: 10,
    borderRadius: 8,
  },
  editButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#4ecca3',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#a0a0a0',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#16213e',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  modalBody: {
    padding: 16,
  },
  modalItemName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  modalItemSku: {
    fontSize: 14,
    color: '#a0a0a0',
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#16213e',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#ffffff',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#16213e',
  },
  modalButtonConfirm: {
    backgroundColor: '#4ecca3',
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  modalButtonTextConfirm: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f0f23',
  },
});

export default InventoryManagement;