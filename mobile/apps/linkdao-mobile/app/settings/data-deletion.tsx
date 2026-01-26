/**
 * Data Deletion Screen
 * GDPR-compliant data deletion request functionality
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { enhancedAuthService } from '@linkdao/shared/services/enhancedAuthService';

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3001';

type DataType = 'profile' | 'transactions' | 'listings' | 'reviews' | 'messages' | 'analytics';

interface DataCategory {
  id: DataType;
  name: string;
  description: string;
  icon: string;
  warning: string;
}

const DATA_CATEGORIES: DataCategory[] = [
  {
    id: 'profile',
    name: 'Profile Information',
    description: 'Personal details, avatar, bio, and preferences',
    icon: 'person-outline',
    warning: 'This will permanently delete your account profile and cannot be undone.',
  },
  {
    id: 'transactions',
    name: 'Transaction History',
    description: 'Purchase records, payment methods, and refunds',
    icon: 'receipt-outline',
    warning: 'All transaction records will be removed from your account.',
  },
  {
    id: 'listings',
    name: 'Product Listings',
    description: 'Your marketplace listings and inventory',
    icon: 'storefront-outline',
    warning: 'All your active and past listings will be deleted.',
  },
  {
    id: 'reviews',
    name: 'Reviews & Ratings',
    description: 'Reviews you\'ve written and received',
    icon: 'star-outline',
    warning: 'All your reviews will be permanently removed.',
  },
  {
    id: 'messages',
    name: 'Messages & Chats',
    description: 'Private messages and chat history',
    icon: 'chatbubbles-outline',
    warning: 'All message history will be deleted.',
  },
  {
    id: 'analytics',
    name: 'Analytics Data',
    description: 'Usage statistics and behavioral data',
    icon: 'bar-chart-outline',
    warning: 'All analytics data associated with your account will be removed.',
  },
];

export default function DataDeletionScreen() {
  const { user, logout } = useAuthStore();
  const [selectedCategories, setSelectedCategories] = useState<DataType[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const toggleCategory = (category: DataType) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleRequestDeletion = async () => {
    if (selectedCategories.length === 0) {
      Alert.alert('No Categories Selected', 'Please select at least one data category to delete.');
      return;
    }

    if (!confirmed) {
      Alert.alert('Confirmation Required', 'Please confirm that you understand this action cannot be undone.');
      return;
    }

    Alert.alert(
      'Confirm Data Deletion',
      'Are you sure you want to request deletion of the selected data? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: executeDeletionRequest,
        },
      ]
    );
  };

  const executeDeletionRequest = async () => {
    try {
      setLoading(true);
      const token = await enhancedAuthService.getAuthToken();
      
      const response = await fetch(`${API_BASE_URL}/api/user/data-deletion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          categories: selectedCategories,
          userId: user?.address,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        Alert.alert(
          'Deletion Request Submitted',
          'Your data deletion request has been submitted. You will receive a confirmation email shortly. The deletion process may take up to 30 days to complete.',
          [
            { text: 'OK', onPress: () => router.back() },
          ]
        );
      } else {
        Alert.alert('Error', result.message || 'Failed to submit deletion request');
      }
    } catch (error) {
      console.error('Failed to submit deletion request:', error);
      Alert.alert('Error', 'Failed to submit deletion request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFullAccountDeletion = () => {
    Alert.alert(
      'Delete Entire Account',
      'This will permanently delete your entire account including all data, listings, and transactions. This action cannot be undone.\n\nAre you absolutely sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete Account', 
          style: 'destructive',
          onPress: executeFullAccountDeletion,
        },
      ]
    );
  };

  const executeFullAccountDeletion = async () => {
    Alert.alert(
      'Final Confirmation',
      'This is your last chance to cancel. Account deletion is permanent and irreversible.\n\nType "DELETE" to confirm.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'DELETE', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const token = await enhancedAuthService.getAuthToken();
              
              const response = await fetch(`${API_BASE_URL}/api/user/account-deletion`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });

              const result = await response.json();
              
              if (result.success) {
                Alert.alert(
                  'Account Deleted',
                  'Your account has been successfully deleted. Thank you for using LinkDAO.',
                  [
                    { 
                      text: 'OK', 
                      onPress: () => {
                        logout();
                        router.replace('/auth');
                      },
                    },
                  ]
                );
              } else {
                Alert.alert('Error', result.message || 'Failed to delete account');
              }
            } catch (error) {
              console.error('Failed to delete account:', error);
              Alert.alert('Error', 'Failed to delete account. Please try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Data Deletion</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Warning Banner */}
        <View style={styles.warningBanner}>
          <Ionicons name="warning" size={32} color="#ef4444" />
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>Important Notice</Text>
            <Text style={styles.warningText}>
              Data deletion is permanent and cannot be undone. Please review your selections carefully before submitting.
            </Text>
          </View>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={24} color="#3b82f6" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>GDPR Compliance</Text>
            <Text style={styles.infoText}>
              Under GDPR, you have the right to request deletion of your personal data. Once deleted, this data cannot be recovered.
            </Text>
          </View>
        </View>

        {/* Data Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Data to Delete</Text>
          <Text style={styles.sectionSubtitle}>
            Choose the categories of data you want to delete
          </Text>

          {DATA_CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryCard,
                selectedCategories.includes(category.id) && styles.categoryCardSelected,
              ]}
              onPress={() => toggleCategory(category.id)}
              activeOpacity={0.7}
            >
              <View style={styles.categoryHeader}>
                <View style={[
                  styles.categoryIcon,
                  selectedCategories.includes(category.id) && styles.categoryIconSelected,
                ]}>
                  <Ionicons 
                    name={category.icon as any} 
                    size={24} 
                    color={selectedCategories.includes(category.id) ? '#ffffff' : '#6b7280'} 
                  />
                </View>
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryName}>{category.name}</Text>
                  <Text style={styles.categoryDescription}>{category.description}</Text>
                </View>
                <View style={[
                  styles.checkbox,
                  selectedCategories.includes(category.id) && styles.checkboxChecked,
                ]}>
                  {selectedCategories.includes(category.id) && (
                    <Ionicons name="checkmark" size={16} color="#ffffff" />
                  )}
                </View>
              </View>

              {selectedCategories.includes(category.id) && (
                <View style={styles.categoryWarning}>
                  <Ionicons name="warning-outline" size={16} color="#f59e0b" />
                  <Text style={styles.categoryWarningText}>{category.warning}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Confirmation Checkbox */}
        <TouchableOpacity
          style={styles.confirmationRow}
          onPress={() => setConfirmed(!confirmed)}
          activeOpacity={0.7}
        >
          <View style={[styles.confirmCheckbox, confirmed && styles.confirmCheckboxChecked]}>
            {confirmed && <Ionicons name="checkmark" size={18} color="#ffffff" />}
          </View>
          <Text style={styles.confirmText}>
            I understand that data deletion is permanent and cannot be undone
          </Text>
        </TouchableOpacity>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!confirmed || selectedCategories.length === 0) && styles.submitButtonDisabled,
          ]}
          onPress={handleRequestDeletion}
          disabled={!confirmed || selectedCategories.length === 0 || loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Ionicons name="trash-outline" size={20} color="#ffffff" />
              <Text style={styles.submitButtonText}>
                Request Deletion ({selectedCategories.length})
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Full Account Deletion */}
        <View style={styles.dangerZone}>
          <Text style={styles.dangerZoneTitle}>Danger Zone</Text>
          <Text style={styles.dangerZoneSubtitle}>
            Permanently delete your entire account and all associated data
          </Text>

          <TouchableOpacity
            style={styles.deleteAccountButton}
            onPress={handleFullAccountDeletion}
            disabled={loading}
          >
            <Ionicons name="person-remove-outline" size={20} color="#ef4444" />
            <Text style={styles.deleteAccountButtonText}>Delete Entire Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  content: {
    flex: 1,
  },
  warningBanner: {
    flexDirection: 'row',
    backgroundColor: '#fef2f2',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  warningContent: {
    flex: 1,
    marginLeft: 12,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    color: '#991b1b',
    lineHeight: 20,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#1e3a8a',
    lineHeight: 18,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  categoryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  categoryCardSelected: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryIconSelected: {
    backgroundColor: '#ef4444',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  categoryDescription: {
    fontSize: 13,
    color: '#6b7280',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  categoryWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#fecaca',
  },
  categoryWarningText: {
    fontSize: 12,
    color: '#92400e',
    marginLeft: 6,
    flex: 1,
  },
  confirmationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  confirmCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  confirmCheckboxChecked: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  confirmText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    marginHorizontal: 16,
    marginBottom: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  dangerZone: {
    margin: 16,
    padding: 20,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fecaca',
  },
  dangerZoneTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 4,
  },
  dangerZoneSubtitle: {
    fontSize: 13,
    color: '#991b1b',
    marginBottom: 16,
  },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ef4444',
    gap: 8,
  },
  deleteAccountButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
});