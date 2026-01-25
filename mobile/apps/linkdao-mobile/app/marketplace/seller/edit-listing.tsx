/**
 * Edit Listing Screen
 * Mobile-optimized form for editing existing marketplace listings
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { enhancedAuthService } from '../../../../packages/shared/services/enhancedAuthService';

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface FormData {
  title: string;
  description: string;
  priceAmount: string;
  priceCurrency: string;
  categoryId: string;
  inventory: string;
  itemType: 'PHYSICAL' | 'DIGITAL' | 'NFT' | 'SERVICE';
  condition: string;
  brand: string;
  images: string[];
  tags: string;
  listingType: 'FIXED_PRICE' | 'AUCTION';
  duration: number;
  royalty: number;
  unlimitedInventory: boolean;
  escrowEnabled: boolean;
}

export default function EditListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    priceAmount: '',
    priceCurrency: 'USD',
    categoryId: '',
    inventory: '1',
    itemType: 'PHYSICAL',
    condition: 'New',
    brand: '',
    images: [],
    tags: '',
    listingType: 'FIXED_PRICE',
    duration: 7,
    royalty: 0,
    unlimitedInventory: false,
    escrowEnabled: true,
  });

  useEffect(() => {
    loadListing();
  }, [id]);

  const loadListing = async () => {
    try {
      const token = await enhancedAuthService.getAuthToken();
      if (!token) {
        Alert.alert('Authentication Required', 'Please connect your wallet first');
        router.back();
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/sellers/listings/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (result.success && result.data) {
        const listing = result.data;
        setFormData({
          title: listing.title || '',
          description: listing.description || '',
          priceAmount: listing.priceAmount?.toString() || '',
          priceCurrency: listing.priceCurrency || 'USD',
          categoryId: listing.categoryId || '',
          inventory: listing.inventory?.toString() || '1',
          itemType: listing.itemType || 'PHYSICAL',
          condition: listing.metadata?.condition || 'New',
          brand: listing.metadata?.brand || '',
          images: listing.images || [],
          tags: listing.tags?.join(', ') || '',
          listingType: listing.listingType || 'FIXED_PRICE',
          duration: listing.duration || 7,
          royalty: listing.royalty || 0,
          unlimitedInventory: listing.inventory === -1,
          escrowEnabled: listing.escrowEnabled !== false,
        });
      } else {
        Alert.alert('Error', 'Failed to load listing');
        router.back();
      }
    } catch (error) {
      console.error('Failed to load listing:', error);
      Alert.alert('Error', 'Failed to connect to server');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const token = await enhancedAuthService.getAuthToken();
      if (!token) {
        Alert.alert('Authentication Required', 'Please connect your wallet first');
        return;
      }

      const payload = {
        title: formData.title,
        description: formData.description,
        priceAmount: parseFloat(formData.priceAmount),
        priceCurrency: formData.priceCurrency,
        categoryId: formData.categoryId,
        inventory: formData.unlimitedInventory ? -1 : parseInt(formData.inventory),
        itemType: formData.itemType,
        listingType: formData.listingType,
        duration: formData.duration,
        royalty: formData.royalty,
        escrowEnabled: formData.escrowEnabled,
        metadata: {
          condition: formData.condition,
          brand: formData.brand,
        },
        tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
        images: formData.images,
      };

      const response = await fetch(`${API_BASE_URL}/api/sellers/listings/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        Alert.alert(
          'Success!',
          'Your listing has been updated successfully.',
          [
            { text: 'OK', onPress: () => router.back() },
          ]
        );
      } else {
        Alert.alert('Error', result.message || 'Failed to update listing');
      }
    } catch (error) {
      console.error('Failed to update listing:', error);
      Alert.alert('Error', 'Failed to connect to server');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading listing...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Listing</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="Product name"
              placeholderTextColor="#9ca3af"
              value={formData.title}
              onChangeText={(value) => setFormData({ ...formData, title: value })}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your product"
              placeholderTextColor="#9ca3af"
              value={formData.description}
              onChangeText={(value) => setFormData({ ...formData, description: value })}
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Price *</Text>
            <View style={styles.priceInputContainer}>
              <TextInput
                style={styles.priceInput}
                placeholder="0.00"
                placeholderTextColor="#9ca3af"
                value={formData.priceAmount}
                onChangeText={(value) => setFormData({ ...formData, priceAmount: value })}
                keyboardType="decimal-pad"
              />
              <Text style={styles.currencySymbol}>{formData.priceCurrency}</Text>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Inventory *</Text>
            <TextInput
              style={styles.input}
              placeholder="1"
              placeholderTextColor="#9ca3af"
              value={formData.inventory}
              onChangeText={(value) => setFormData({ ...formData, inventory: value })}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Item Details</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Item Type</Text>
            <View style={styles.itemTypeContainer}>
              {(['PHYSICAL', 'DIGITAL', 'NFT', 'SERVICE'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.itemTypeButton, formData.itemType === type && styles.itemTypeButtonActive]}
                  onPress={() => setFormData({ ...formData, itemType: type })}
                >
                  <Text style={[styles.itemTypeText, formData.itemType === type && styles.itemTypeTextActive]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Condition</Text>
            <View style={styles.itemTypeContainer}>
              {(['New', 'Like New', 'Good', 'Fair', 'Poor'] as const).map((cond) => (
                <TouchableOpacity
                  key={cond}
                  style={[styles.itemTypeButton, formData.condition === cond && styles.itemTypeButtonActive]}
                  onPress={() => setFormData({ ...formData, condition: cond })}
                >
                  <Text style={[styles.itemTypeText, formData.condition === cond && styles.itemTypeTextActive]}>
                    {cond}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Brand (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Brand name"
              placeholderTextColor="#9ca3af"
              value={formData.brand}
              onChangeText={(value) => setFormData({ ...formData, brand: value })}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Advanced Settings</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Tags</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="tag1, tag2, tag3"
              placeholderTextColor="#9ca3af"
              value={formData.tags}
              onChangeText={(value) => setFormData({ ...formData, tags: value })}
            />
            <Text style={styles.hintText}>Separate tags with commas</Text>
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.switchContainer}>
              <View style={styles.switchInfo}>
                <Text style={styles.label}>Unlimited Inventory</Text>
                <Text style={styles.hintText}>For digital products or unlimited stock</Text>
              </View>
              <TouchableOpacity
                style={[styles.switch, formData.unlimitedInventory && styles.switchActive]}
                onPress={() => setFormData({ ...formData, unlimitedInventory: !formData.unlimitedInventory })}
              >
                <View style={[styles.switchKnob, formData.unlimitedInventory && styles.switchKnobActive]} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.switchContainer}>
              <View style={styles.switchInfo}>
                <Text style={styles.label}>Enable Escrow</Text>
                <Text style={styles.hintText}>Protect buyer and seller with smart contract</Text>
              </View>
              <TouchableOpacity
                style={[styles.switch, formData.escrowEnabled && styles.switchActive]}
                onPress={() => setFormData({ ...formData, escrowEnabled: !formData.escrowEnabled })}
              >
                <View style={[styles.switchKnob, formData.escrowEnabled && styles.switchKnobActive]} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={() => router.back()}
          disabled={saving}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.saveButton, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
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
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  hintText: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    overflow: 'hidden',
  },
  priceInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  currencySymbol: {
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#6b7280',
    borderLeftWidth: 1,
    borderLeftColor: '#d1d5db',
  },
  itemTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  itemTypeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  itemTypeButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  itemTypeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  itemTypeTextActive: {
    color: '#ffffff',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchInfo: {
    flex: 1,
  },
  switch: {
    width: 51,
    height: 31,
    borderRadius: 15.5,
    backgroundColor: '#d1d5db',
    padding: 2,
  },
  switchActive: {
    backgroundColor: '#3b82f6',
  },
  switchKnob: {
    width: 27,
    height: 27,
    borderRadius: 13.5,
    backgroundColor: '#ffffff',
  },
  switchKnobActive: {
    transform: [{ translateX: 20 }],
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});