/**
 * Order Detail Screen
 * Mobile-optimized order management for sellers
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { enhancedAuthService } from '../../../../../packages/shared/services/enhancedAuthService';

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface Order {
  id: string;
  orderNumber: string;
  buyerAddress: string;
  sellerAddress: string;
  totalAmount: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  createdAt: string;
  updatedAt: string;
  items: Array<{
    id: string;
    productId: string;
    title: string;
    quantity: number;
    price: string;
    image?: string;
  }>;
  shippingAddress?: {
    name: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  trackingNumber?: string;
  notes?: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  escrowStatus: 'pending' | 'released' | 'held';
}

export default function OrderDetailScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await getAuthToken();
      if (!token) {
        Alert.alert('Authentication Required', 'Please connect your wallet first');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/sellers/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (result.success && result.data) {
        setOrder(result.data);
        setTrackingNumber(result.data.trackingNumber || '');
      } else {
        setError(result.message || 'Failed to load order details');
      }
    } catch (err) {
      console.error('Failed to fetch order details:', err);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrderDetails();
    setRefreshing(false);
  };

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/sellers/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();

      if (result.success) {
        setOrder({ ...order!, status: newStatus as any });
        setShowStatusModal(false);
        Alert.alert('Success', 'Order status updated successfully');
      } else {
        Alert.alert('Error', result.message || 'Failed to update status');
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      Alert.alert('Error', 'Failed to connect to server');
    }
  };

  const handleUpdateTracking = async () => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/sellers/orders/${orderId}/tracking`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ trackingNumber }),
      });

      const result = await response.json();

      if (result.success) {
        setOrder({ ...order!, trackingNumber });
        setShowTrackingModal(false);
        Alert.alert('Success', 'Tracking number updated successfully');
      } else {
        Alert.alert('Error', result.message || 'Failed to update tracking number');
      }
    } catch (error) {
      console.error('Failed to update tracking:', error);
      Alert.alert('Error', 'Failed to connect to server');
    }
  };

  const getAuthToken = async (): Promise<string | null> => {
    // TODO: Implement proper token retrieval
    return null;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'processing': return '#3b82f6';
      case 'shipped': return '#8b5cf6';
      case 'delivered': return '#10b981';
      case 'cancelled': return '#ef4444';
      case 'refunded': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return 'time-outline';
      case 'processing': return 'cog-outline';
      case 'shipped': return 'cube-outline';
      case 'delivered': return 'checkmark-circle-outline';
      case 'cancelled': return 'close-circle-outline';
      case 'refunded': return 'refresh-outline';
      default: return 'help-outline';
    }
  };

  const getNextStatus = (currentStatus: string): string | null => {
    const statusFlow: Record<string, string> = {
      'pending': 'processing',
      'processing': 'shipped',
      'shipped': 'delivered',
    };
    return statusFlow[currentStatus] || null;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#ef4444" />
          <Text style={styles.errorText}>{error || 'Order not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchOrderDetails}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Order #{order.orderNumber}</Text>
        <TouchableOpacity onPress={() => router.push('/marketplace/seller/dashboard')}>
          <Ionicons name="grid-outline" size={24} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Order Status Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Order Status</Text>
              <Text style={styles.cardSubtitle}>Updated {new Date(order.updatedAt).toLocaleDateString()}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(order.status)}20` }]}>
              <Ionicons name={getStatusIcon(order.status) as any} size={20} color={getStatusColor(order.status)} />
              <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </Text>
            </View>
          </View>
        </View>

        {/* Order Items */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          {order.items.map((item, index) => (
            <View key={index} style={styles.orderItem}>
              <View style={styles.itemImage}>
                {item.image ? (
                  <Image source={{ uri: item.image }} style={styles.itemImage} />
                ) : (
                  <View style={[styles.itemImage, { backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center' }]}>
                    <Ionicons name="cube-outline" size={24} color="#ffffff" />
                  </View>
                )}
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemDetails}>Qty: {item.quantity} × ${item.price}</Text>
                <Text style={styles.itemTotal}>Total: ${item.quantity * parseFloat(item.price)}</Text>
              </View>
            </View>
          ))}
          <View style={styles.orderTotalSection}>
            <Text style={styles.orderTotalLabel}>Order Total</Text>
            <Text style={styles.orderTotalValue}>{order.totalAmount}</Text>
          </View>
        </View>

        {/* Shipping Information */}
        {order.shippingAddress && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Shipping Address</Text>
            <View style={styles.addressContainer}>
              <Text style={styles.addressName}>{order.shippingAddress.name}</Text>
              <Text style={styles.addressLine}>{order.shippingAddress.addressLine1}</Text>
              {order.shippingAddress.addressLine2 && (
                <Text style={styles.addressLine}>{order.shippingAddress.addressLine2}</Text>
              )}
              <Text style={styles.addressLine}>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}</Text>
              <Text style={styles.addressLine}>{order.shippingAddress.country}</Text>
            </View>
          </View>
        )}

        {/* Tracking Information */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>Tracking Information</Text>
            {order.status === 'shipped' && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setShowTrackingModal(true)}
              >
                <Ionicons name="create-outline" size={20} color="#3b82f6" />
              </TouchableOpacity>
            )}
          </View>
          {order.trackingNumber ? (
            <View style={styles.trackingInfo}>
              <Ionicons name="cube-outline" size={20} color="#3b82f6" />
              <Text style={styles.trackingNumber}>{order.trackingNumber}</Text>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={() => {
                  // TODO: Implement clipboard copy
                  Alert.alert('Tracking Number', order.trackingNumber);
                }}
              >
                <Ionicons name="copy-outline" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.noTracking}>No tracking number yet</Text>
          )}
        </View>

        {/* Payment & Escrow Status */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Payment & Security</Text>
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Payment Status</Text>
              <View style={[styles.statusBadge, { backgroundColor: `${order.paymentStatus === 'paid' ? '#10b981' : order.paymentStatus === 'failed' ? '#ef4444' : '#f59e0b'}20` }]}>
                <Text style={[styles.statusText, { color: order.paymentStatus === 'paid' ? '#10b981' : order.paymentStatus === 'failed' ? '#ef4444' : '#f59e0b' }]}>
                  {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                </Text>
              </View>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Escrow Status</Text>
              <View style={[styles.statusBadge, { backgroundColor: `${order.escrowStatus === 'released' ? '#10b981' : order.escrowStatus === 'held' ? '#f59e0b' : '#3b82f6'}20` }]}>
                <Text style={[styles.statusText, { color: order.escrowStatus === 'released' ? '#10b981' : order.escrowStatus === 'held' ? '#f59e0b' : '#3b82f6' }]}>
                  {order.escrowStatus.charAt(0).toUpperCase() + order.escrowStatus.slice(1)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <View style={styles.actionsContainer}>
            {getNextStatus(order.status) && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setShowStatusModal(true)}
              >
                <Ionicons name="swap-horizontal" size={20} color="#3b82f6" />
                <Text style={styles.actionButtonText}>Update Status</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push(`/marketplace/seller/messages/${orderId}`)}
            >
              <Ionicons name="chatbubble-outline" size={20} color="#3b82f6" />
              <Text style={styles.actionButtonText}>Contact Buyer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.dangerButton]}
              onPress={() => Alert.alert(
                'Cancel Order',
                'Are you sure you want to cancel this order? This action cannot be undone.',
                [
                  { text: 'No', style: 'cancel' },
                  {
                    text: 'Yes, Cancel',
                    style: 'destructive',
                    onPress: () => handleUpdateStatus('cancelled'),
                  },
                ]
              )}
            >
              <Ionicons name="close-circle-outline" size={20} color="#ef4444" />
              <Text style={[styles.actionButtonText, styles.dangerButtonText]}>Cancel Order</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Order Timeline */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Order Timeline</Text>
          <View style={styles.timeline}>
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, styles.timelineDotCompleted]} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>Order Placed</Text>
                <Text style={styles.timelineDate}>{new Date(order.createdAt).toLocaleString()}</Text>
              </View>
            </View>
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, order.paymentStatus === 'paid' ? styles.timelineDotCompleted : styles.timelineDotPending]} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>Payment {order.paymentStatus}</Text>
              </View>
            </View>
            {order.status !== 'pending' && (
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, order.status === 'delivered' ? styles.timelineDotCompleted : styles.timelineDotPending]} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>Order {order.status}</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Status Update Modal */}
      <Modal
        visible={showStatusModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowStatusModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Status</Text>
              <TouchableOpacity onPress={() => setShowStatusModal(false)}>
                <Ionicons name="close" size={24} color="#1f2937" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalDescription}>
                Current status: <Text style={styles.currentStatus}>{order.status}</Text>
              </Text>
              <Text style={styles.modalDescription}>Select new status:</Text>

              {['processing', 'shipped', 'delivered'].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={styles.statusOption}
                  onPress={() => handleUpdateStatus(status)}
                >
                  <Ionicons name={getStatusIcon(status) as any} size={20} color={getStatusColor(status)} />
                  <Text style={styles.statusOptionText}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Tracking Update Modal */}
      <Modal
        visible={showTrackingModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowTrackingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Tracking</Text>
              <TouchableOpacity onPress={() => setShowTrackingModal(false)}>
                <Ionicons name="close" size={24} color="#1f2937" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalDescription}>Enter tracking number:</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter tracking number"
                value={trackingNumber}
                onChangeText={setTrackingNumber}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleUpdateTracking}
              >
                <Text style={styles.modalButtonText}>Update Tracking</Text>
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
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
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
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  itemDetails: {
    fontSize: 12,
    color: '#6b7280',
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  orderTotalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
  },
  orderTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  orderTotalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  addressContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
  },
  addressName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  addressLine: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  editButton: {
    padding: 4,
  },
  trackingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  trackingNumber: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  copyButton: {
    padding: 4,
  },
  noTracking: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  statusRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statusItem: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  actionsContainer: {
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  dangerButton: {
    backgroundColor: '#fee2e2',
  },
  dangerButtonText: {
    color: '#ef4444',
  },
  timeline: {
    paddingHorizontal: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  timelineDotCompleted: {
    backgroundColor: '#10b981',
  },
  timelineDotPending: {
    backgroundColor: '#d1d5db',
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  timelineDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  currentStatus: {
    fontWeight: '600',
    color: '#f59e0b',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    marginTop: 12,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modalBody: {
    padding: 20,
  },
  modalDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
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
  modalButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: '#3b82f6',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  statusOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginLeft: 12,
  },
});