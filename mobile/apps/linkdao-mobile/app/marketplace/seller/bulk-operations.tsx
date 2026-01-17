/**
 * Bulk Operations Screen
 * Enables sellers to perform bulk actions on multiple listings
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, TextInput, Modal, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface Listing {
  id: string;
  title: string;
  price: string;
  status: 'active' | 'inactive' | 'sold';
  inventory: number;
  image: string;
}

type BulkAction = 'activate' | 'deactivate' | 'delete' | 'update_price' | 'update_inventory';

export default function BulkOperationsScreen() {
  const [listings, setListings] = useState<Listing[]>([
    { id: '1', title: 'Premium Wireless Headphones', price: '149.99', status: 'active', inventory: 25, image: 'https://via.placeholder.com/80' },
    { id: '2', title: 'Smart Watch Pro', price: '299.99', status: 'active', inventory: 15, image: 'https://via.placeholder.com/80' },
    { id: '3', title: 'Portable Speaker', price: '59.99', status: 'inactive', inventory: 0, image: 'https://via.placeholder.com/80' },
    { id: '4', title: 'USB-C Cable', price: '12.99', status: 'active', inventory: 100, image: 'https://via.placeholder.com/80' },
    { id: '5', title: 'Phone Case', price: '19.99', status: 'sold', inventory: 0, image: 'https://via.placeholder.com/80' },
  ]);
  const [selectedListings, setSelectedListings] = useState<Set<string>>(new Set());
  const [showActionModal, setShowActionModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [priceChange, setPriceChange] = useState('');
  const [priceChangeType, setPriceChangeType] = useState<'absolute' | 'percentage'>('absolute');
  const [inventoryChange, setInventoryChange] = useState('');
  const [inventoryAction, setInventoryAction] = useState<'set' | 'add' | 'subtract'>('set');

  const toggleSelect = (listingId: string) => {
    setSelectedListings(prev => {
      const newSet = new Set(prev);
      if (newSet.has(listingId)) {
        newSet.delete(listingId);
      } else {
        newSet.add(listingId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedListings.size === listings.length) {
      setSelectedListings(new Set());
    } else {
      setSelectedListings(new Set(listings.map(l => l.id)));
    }
  };

  const handleBulkAction = (action: BulkAction) => {
    if (selectedListings.size === 0) {
      Alert.alert('No Selection', 'Please select at least one listing');
      return;
    }

    switch (action) {
      case 'activate':
        setListings(prev => prev.map(l => 
          selectedListings.has(l.id) ? { ...l, status: 'active' } : l
        ));
        Alert.alert('Success', `${selectedListings.size} listing(s) activated`);
        break;
      case 'deactivate':
        setListings(prev => prev.map(l => 
          selectedListings.has(l.id) ? { ...l, status: 'inactive' } : l
        ));
        Alert.alert('Success', `${selectedListings.size} listing(s) deactivated`);
        break;
      case 'delete':
        Alert.alert(
          'Confirm Deletion',
          `Are you sure you want to delete ${selectedListings.size} listing(s)? This action cannot be undone.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Delete', 
              style: 'destructive',
              onPress: () => {
                setListings(prev => prev.filter(l => !selectedListings.has(l.id)));
                setSelectedListings(new Set());
                Alert.alert('Success', 'Listings deleted successfully');
              },
            },
          ]
        );
        break;
      case 'update_price':
        setShowActionModal(false);
        setShowPriceModal(true);
        break;
      case 'update_inventory':
        setShowActionModal(false);
        setShowInventoryModal(true);
        break;
    }
  };

  const handlePriceUpdate = () => {
    if (!priceChange) {
      Alert.alert('Error', 'Please enter a price change');
      return;
    }

    const changeValue = parseFloat(priceChange);
    setListings(prev => prev.map(l => {
      if (!selectedListings.has(l.id)) return l;
      const currentPrice = parseFloat(l.price);
      let newPrice: number;
      
      if (priceChangeType === 'absolute') {
        newPrice = currentPrice + changeValue;
      } else {
        newPrice = currentPrice * (1 + changeValue / 100);
      }
      
      return { ...l, price: Math.max(0, newPrice).toFixed(2) };
    }));

    setShowPriceModal(false);
    setPriceChange('');
    Alert.alert('Success', 'Prices updated successfully');
  };

  const handleInventoryUpdate = () => {
    if (!inventoryChange) {
      Alert.alert('Error', 'Please enter an inventory change');
      return;
    }

    const changeValue = parseInt(inventoryChange);
    setListings(prev => prev.map(l => {
      if (!selectedListings.has(l.id)) return l;
      let newInventory: number;
      
      if (inventoryAction === 'set') {
        newInventory = changeValue;
      } else if (inventoryAction === 'add') {
        newInventory = l.inventory + changeValue;
      } else {
        newInventory = Math.max(0, l.inventory - changeValue);
      }
      
      return { ...l, inventory: Math.max(0, newInventory) };
    }));

    setShowInventoryModal(false);
    setInventoryChange('');
    Alert.alert('Success', 'Inventory updated successfully');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10b981';
      case 'inactive': return '#f59e0b';
      case 'sold': return '#6b7280';
      default: return '#6b7280';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bulk Operations</Text>
        <TouchableOpacity onPress={toggleSelectAll}>
          <Text style={styles.selectAllText}>
            {selectedListings.size === listings.length ? 'Deselect All' : 'Select All'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Selection Bar */}
      {selectedListings.size > 0 && (
        <View style={styles.selectionBar}>
          <Text style={styles.selectionText}>{selectedListings.size} selected</Text>
          <TouchableOpacity
            style={styles.bulkActionButton}
            onPress={() => setShowActionModal(true)}
          >
            <Ionicons name="options-outline" size={20} color="#ffffff" />
            <Text style={styles.bulkActionButtonText}>Bulk Actions</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.content}>
        {listings.map((listing) => (
          <TouchableOpacity
            key={listing.id}
            style={styles.listingCard}
            onPress={() => toggleSelect(listing.id)}
            activeOpacity={0.7}
          >
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => toggleSelect(listing.id)}
            >
              <View style={[styles.checkboxInner, selectedListings.has(listing.id) && styles.checkboxChecked]}>
                {selectedListings.has(listing.id) && <Ionicons name="checkmark" size={16} color="#ffffff" />}
              </View>
            </TouchableOpacity>

            <Image source={{ uri: listing.image }} style={styles.listingImage} />

            <View style={styles.listingInfo}>
              <Text style={styles.listingTitle} numberOfLines={1}>{listing.title}</Text>
              <Text style={styles.listingPrice}>${listing.price}</Text>
              <View style={styles.listingMeta}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(listing.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(listing.status) }]}>
                    {listing.status}
                  </Text>
                </View>
                <Text style={styles.inventoryText}>Stock: {listing.inventory}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Bulk Actions Modal */}
      <Modal visible={showActionModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bulk Actions</Text>
              <TouchableOpacity onPress={() => setShowActionModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <TouchableOpacity
                style={styles.actionOption}
                onPress={() => handleBulkAction('activate')}
              >
                <Ionicons name="checkmark-circle-outline" size={24} color="#10b981" />
                <View style={styles.actionOptionInfo}>
                  <Text style={styles.actionOptionTitle}>Activate</Text>
                  <Text style={styles.actionOptionDesc}>Make selected listings active</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionOption}
                onPress={() => handleBulkAction('deactivate')}
              >
                <Ionicons name="pause-circle-outline" size={24} color="#f59e0b" />
                <View style={styles.actionOptionInfo}>
                  <Text style={styles.actionOptionTitle}>Deactivate</Text>
                  <Text style={styles.actionOptionDesc}>Pause selected listings</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionOption}
                onPress={() => handleBulkAction('update_price')}
              >
                <Ionicons name="pricetag-outline" size={24} color="#3b82f6" />
                <View style={styles.actionOptionInfo}>
                  <Text style={styles.actionOptionTitle}>Update Price</Text>
                  <Text style={styles.actionOptionDesc}>Change prices in bulk</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionOption}
                onPress={() => handleBulkAction('update_inventory')}
              >
                <Ionicons name="cube-outline" size={24} color="#8b5cf6" />
                <View style={styles.actionOptionInfo}>
                  <Text style={styles.actionOptionTitle}>Update Inventory</Text>
                  <Text style={styles.actionOptionDesc}>Adjust stock levels</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionOption}
                onPress={() => handleBulkAction('delete')}
              >
                <Ionicons name="trash-outline" size={24} color="#ef4444" />
                <View style={styles.actionOptionInfo}>
                  <Text style={[styles.actionOptionTitle, { color: '#ef4444' }]}>Delete</Text>
                  <Text style={styles.actionOptionDesc}>Permanently remove listings</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Price Update Modal */}
      <Modal visible={showPriceModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Prices</Text>
              <TouchableOpacity onPress={() => setShowPriceModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.toggleGroup}>
                <TouchableOpacity
                  style={[styles.toggleButton, priceChangeType === 'absolute' && styles.toggleButtonActive]}
                  onPress={() => setPriceChangeType('absolute')}
                >
                  <Text style={[styles.toggleButtonText, priceChangeType === 'absolute' && styles.toggleButtonTextActive]}>
                    Absolute ($)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleButton, priceChangeType === 'percentage' && styles.toggleButtonActive]}
                  onPress={() => setPriceChangeType('percentage')}
                >
                  <Text style={[styles.toggleButtonText, priceChangeType === 'percentage' && styles.toggleButtonTextActive]}>
                    Percentage (%)
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.modalLabel}>
                {priceChangeType === 'absolute' ? 'Price Change ($)' : 'Percentage Change (%)'}
              </Text>
              <TextInput
                style={styles.modalInput}
                value={priceChange}
                onChangeText={setPriceChange}
                placeholder={priceChangeType === 'absolute' ? '10.00' : '10'}
                keyboardType="decimal-pad"
              />

              <TouchableOpacity style={styles.confirmButton} onPress={handlePriceUpdate}>
                <Text style={styles.confirmButtonText}>Update Prices</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Inventory Update Modal */}
      <Modal visible={showInventoryModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Inventory</Text>
              <TouchableOpacity onPress={() => setShowInventoryModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.toggleGroup}>
                <TouchableOpacity
                  style={[styles.toggleButton, inventoryAction === 'set' && styles.toggleButtonActive]}
                  onPress={() => setInventoryAction('set')}
                >
                  <Text style={[styles.toggleButtonText, inventoryAction === 'set' && styles.toggleButtonTextActive]}>
                    Set
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleButton, inventoryAction === 'add' && styles.toggleButtonActive]}
                  onPress={() => setInventoryAction('add')}
                >
                  <Text style={[styles.toggleButtonText, inventoryAction === 'add' && styles.toggleButtonTextActive]}>
                    Add
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleButton, inventoryAction === 'subtract' && styles.toggleButtonActive]}
                  onPress={() => setInventoryAction('subtract')}
                >
                  <Text style={[styles.toggleButtonText, inventoryAction === 'subtract' && styles.toggleButtonTextActive]}>
                    Subtract
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.modalLabel}>Quantity</Text>
              <TextInput
                style={styles.modalInput}
                value={inventoryChange}
                onChangeText={setInventoryChange}
                placeholder="10"
                keyboardType="number-pad"
              />

              <TouchableOpacity style={styles.confirmButton} onPress={handleInventoryUpdate}>
                <Text style={styles.confirmButtonText}>Update Inventory</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3b82f6',
  },
  selectionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#eff6ff',
    borderBottomWidth: 1,
    borderBottomColor: '#dbeafe',
  },
  selectionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3b82f6',
  },
  bulkActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  bulkActionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  listingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  checkbox: {
    marginRight: 12,
  },
  checkboxInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  listingImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
    marginRight: 12,
  },
  listingInfo: {
    flex: 1,
  },
  listingTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 4,
  },
  listingPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 6,
  },
  listingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  inventoryText: {
    fontSize: 12,
    color: '#6b7280',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modalBody: {
    gap: 12,
  },
  actionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  actionOptionInfo: {
    marginLeft: 12,
    flex: 1,
  },
  actionOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  actionOptionDesc: {
    fontSize: 13,
    color: '#6b7280',
  },
  toggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 4,
    marginBottom: 12,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
  },
  toggleButtonTextActive: {
    color: '#1f2937',
    fontWeight: '600',
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 16,
  },
  confirmButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});