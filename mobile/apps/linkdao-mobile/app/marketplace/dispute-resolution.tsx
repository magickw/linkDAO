/**
 * Dispute Resolution Screen
 * Handles dispute creation and management for marketplace transactions
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface Dispute {
  id: string;
  orderId: string;
  orderNumber: string;
  reason: string;
  description: string;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  createdAt: string;
  updatedAt: string;
  resolution?: string;
  evidence: string[];
}

interface Order {
  id: string;
  orderNumber: string;
  productName: string;
  sellerName: string;
  amount: string;
  status: string;
  createdAt: string;
}

const DISPUTE_REASONS = [
  'Item not received',
  'Item not as described',
  'Damaged or defective item',
  'Wrong item received',
  'Payment issue',
  'Refund not processed',
  'Other',
];

export default function DisputeResolutionScreen() {
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedReason, setSelectedReason] = useState('');
  const [description, setDescription] = useState('');
  const [evidence, setEvidence] = useState<string[]>([]);

  const handleCreateDispute = async () => {
    if (!selectedOrder || !selectedReason || !description.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      // TODO: Call API to create dispute
      const newDispute: Dispute = {
        id: Date.now().toString(),
        orderId: selectedOrder.id,
        orderNumber: selectedOrder.orderNumber,
        reason: selectedReason,
        description,
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        evidence,
      };

      setDisputes([newDispute, ...disputes]);
      setShowCreateModal(false);
      setSelectedOrder(null);
      setSelectedReason('');
      setDescription('');
      setEvidence([]);
      
      Alert.alert('Success', 'Dispute created successfully. Our team will review your case.');
    } catch (error) {
      Alert.alert('Error', 'Failed to create dispute');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvidence = () => {
    // TODO: Implement image/document picker
    Alert.alert('Add Evidence', 'Select images or documents to support your dispute');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#f59e0b';
      case 'investigating': return '#3b82f6';
      case 'resolved': return '#10b981';
      case 'closed': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const renderDisputeCard = (dispute: Dispute) => (
    <TouchableOpacity style={styles.disputeCard}>
      <View style={styles.disputeHeader}>
        <View style={styles.disputeInfo}>
          <Text style={styles.disputeOrder}>Order #{dispute.orderNumber}</Text>
          <Text style={styles.disputeReason}>{dispute.reason}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(dispute.status) }]}>
          <Text style={styles.statusText}>{dispute.status}</Text>
        </View>
      </View>

      <Text style={styles.disputeDescription} numberOfLines={2}>
        {dispute.description}
      </Text>

      <View style={styles.disputeFooter}>
        <Text style={styles.disputeDate}>
          {new Date(dispute.createdAt).toLocaleDateString()}
        </Text>
        <TouchableOpacity style={styles.viewButton}>
          <Text style={styles.viewButtonText}>View Details</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderCreateTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={24} color="#3b82f6" />
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>Dispute Resolution Process</Text>
          <Text style={styles.infoText}>
            Our team will review your dispute within 24-48 hours. You can track the status and add evidence anytime.
          </Text>
        </View>
      </View>

      {disputes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="shield-outline" size={64} color="#9ca3af" />
          <Text style={styles.emptyTitle}>No disputes</Text>
          <Text style={styles.emptySubtitle}>
            You don't have any active disputes. If you have an issue with an order, create a new dispute.
          </Text>
        </View>
      ) : (
        <View style={styles.disputesList}>
          {disputes.map(renderDisputeCard)}
        </View>
      )}
    </View>
  );

  const renderCreateForm = () => (
    <View style={styles.tabContent}>
      <Text style={styles.tabTitle}>Create New Dispute</Text>

      {/* Select Order */}
      <View style={styles.formSection}>
        <Text style={styles.formLabel}>Select Order *</Text>
        <TouchableOpacity
          style={styles.orderSelector}
          onPress={() => {
            // TODO: Show order picker
            Alert.alert('Select Order', 'Choose the order you want to dispute');
          }}
        >
          <Text style={selectedOrder ? styles.orderSelectorText : styles.orderSelectorPlaceholder}>
            {selectedOrder ? `Order #${selectedOrder.orderNumber} - ${selectedOrder.productName}` : 'Select an order'}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* Dispute Reason */}
      <View style={styles.formSection}>
        <Text style={styles.formLabel}>Dispute Reason *</Text>
        <View style={styles.reasonsGrid}>
          {DISPUTE_REASONS.map((reason) => (
            <TouchableOpacity
              key={reason}
              style={[
                styles.reasonChip,
                selectedReason === reason && styles.reasonChipSelected,
              ]}
              onPress={() => setSelectedReason(reason)}
            >
              <Text style={[
                styles.reasonChipText,
                selectedReason === reason && styles.reasonChipTextSelected,
              ]}>
                {reason}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Description */}
      <View style={styles.formSection}>
        <Text style={styles.formLabel}>Description *</Text>
        <TextInput
          style={styles.descriptionInput}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe your issue in detail..."
          placeholderTextColor="#9ca3af"
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />
      </View>

      {/* Evidence */}
      <View style={styles.formSection}>
        <Text style={styles.formLabel}>Evidence (Optional)</Text>
        <Text style={styles.formHint}>
          Add photos, screenshots, or documents to support your claim
        </Text>
        
        <TouchableOpacity style={styles.evidenceButton} onPress={handleAddEvidence}>
          <Ionicons name="add-circle-outline" size={24} color="#3b82f6" />
          <Text style={styles.evidenceButtonText}>Add Evidence</Text>
        </TouchableOpacity>

        {evidence.length > 0 && (
          <View style={styles.evidenceList}>
            {evidence.map((item, index) => (
              <View key={index} style={styles.evidenceItem}>
                <Ionicons name="document-outline" size={20} color="#3b82f6" />
                <Text style={styles.evidenceItemText}>Evidence {index + 1}</Text>
                <TouchableOpacity onPress={() => setEvidence(evidence.filter((_, i) => i !== index))}>
                  <Ionicons name="close-circle" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[
          styles.submitButton,
          (!selectedOrder || !selectedReason || !description.trim()) && styles.submitButtonDisabled,
        ]}
        onPress={handleCreateDispute}
        disabled={!selectedOrder || !selectedReason || !description.trim() || loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <>
            <Ionicons name="send-outline" size={20} color="#ffffff" />
            <Text style={styles.submitButtonText}>Submit Dispute</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dispute Resolution</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'list' && styles.tabActive]}
          onPress={() => setActiveTab('list')}
        >
          <Text style={[styles.tabText, activeTab === 'list' && styles.tabTextActive]}>
            My Disputes ({disputes.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'create' && styles.tabActive]}
          onPress={() => setActiveTab('create')}
        >
          <Text style={[styles.tabText, activeTab === 'create' && styles.tabTextActive]}>
            New Dispute
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'list' && renderCreateTab()}
        {activeTab === 'create' && renderCreateForm()}
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
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#3b82f6',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  tabTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 20,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  disputesList: {
    gap: 12,
  },
  disputeCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  disputeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  disputeInfo: {
    flex: 1,
  },
  disputeOrder: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  disputeReason: {
    fontSize: 13,
    color: '#6b7280',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
    textTransform: 'capitalize',
  },
  disputeDescription: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  disputeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  disputeDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  viewButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#eff6ff',
    borderRadius: 6,
  },
  viewButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#3b82f6',
  },
  formSection: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  formHint: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  orderSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  orderSelectorText: {
    fontSize: 14,
    color: '#1f2937',
  },
  orderSelectorPlaceholder: {
    fontSize: 14,
    color: '#9ca3af',
  },
  reasonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reasonChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  reasonChipSelected: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  reasonChipText: {
    fontSize: 13,
    color: '#6b7280',
  },
  reasonChipTextSelected: {
    color: '#1e40af',
    fontWeight: '500',
  },
  descriptionInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1f2937',
    minHeight: 120,
  },
  evidenceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 8,
    paddingVertical: 12,
    gap: 8,
  },
  evidenceButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3b82f6',
  },
  evidenceList: {
    marginTop: 12,
    gap: 8,
  },
  evidenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 12,
  },
  evidenceItemText: {
    flex: 1,
    fontSize: 13,
    color: '#1f2937',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
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
});