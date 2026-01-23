/**
 * Orders List Screen
 * View all user orders with status tracking
 */

import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { marketplaceService, Order } from '../../../src/services';

export default function OrdersScreen() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = async () => {
        setLoading(true);
        try {
            const ordersData = await marketplaceService.getOrders();
            setOrders(ordersData);
        } catch (error) {
            console.error('Failed to load orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadOrders();
        setRefreshing(false);
    };

    const getStatusColor = (status: Order['status']) => {
        switch (status) {
            case 'pending':
                return '#f59e0b';
            case 'processing':
                return '#3b82f6';
            case 'shipped':
                return '#8b5cf6';
            case 'delivered':
                return '#10b981';
            case 'cancelled':
                return '#ef4444';
            default:
                return '#6b7280';
        }
    };

    const getStatusIcon = (status: Order['status']) => {
        switch (status) {
            case 'pending':
                return 'time-outline';
            case 'processing':
                return 'hourglass-outline';
            case 'shipped':
                return 'airplane-outline';
            case 'delivered':
                return 'checkmark-circle-outline';
            case 'cancelled':
                return 'close-circle-outline';
            default:
                return 'help-circle-outline';
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                    <Text style={styles.loadingText}>Loading orders...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Orders</Text>
                <View style={{ width: 24 }} />
            </View>

            {orders.length > 0 ? (
                <ScrollView
                    style={styles.content}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
                    }
                >
                    {orders.map((order) => (
                        <TouchableOpacity
                            key={order.id}
                            style={styles.orderCard}
                            onPress={() => router.push(`/marketplace/orders/${order.id}`)}
                        >
                            <View style={styles.orderHeader}>
                                <View>
                                    <Text style={styles.orderId}>Order #{order.id.slice(0, 8)}</Text>
                                    <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
                                </View>
                                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
                                    <Ionicons
                                        name={getStatusIcon(order.status) as any}
                                        size={16}
                                        color={getStatusColor(order.status)}
                                    />
                                    <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.orderItems}>
                                <Text style={styles.itemsCount}>
                                    {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                                </Text>
                                <Text style={styles.orderTotal}>${order.total.toFixed(2)}</Text>
                            </View>

                            {order.trackingNumber && (
                                <View style={styles.trackingInfo}>
                                    <Ionicons name="location-outline" size={16} color="#6b7280" />
                                    <Text style={styles.trackingText}>
                                        {order.trackingCarrier ? `${order.trackingCarrier}: ` : 'Tracking: '}
                                        {order.trackingNumber}
                                    </Text>
                                </View>
                            )}

                            <View style={styles.orderFooter}>
                                <Text style={styles.paymentMethod}>
                                    {order.paymentMethod === 'crypto' ? '₿ Crypto' : '💳 Card'}
                                </Text>
                                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            ) : (
                <View style={styles.emptyContainer}>
                    <Ionicons name="receipt-outline" size={64} color="#9ca3af" />
                    <Text style={styles.emptyText}>No orders yet</Text>
                    <Text style={styles.emptySubtext}>Your order history will appear here</Text>
                    <TouchableOpacity
                        style={styles.shopButton}
                        onPress={() => router.push('/marketplace')}
                    >
                        <Text style={styles.shopButtonText}>Start Shopping</Text>
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
    },
    orderCard: {
        backgroundColor: '#ffffff',
        marginHorizontal: 16,
        marginTop: 16,
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3.84,
        elevation: 5,
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    orderId: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 4,
    },
    orderDate: {
        fontSize: 14,
        color: '#6b7280',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 4,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    orderItems: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    itemsCount: {
        fontSize: 14,
        color: '#6b7280',
    },
    orderTotal: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#3b82f6',
    },
    trackingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        gap: 6,
    },
    trackingText: {
        fontSize: 13,
        color: '#6b7280',
    },
    orderFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
    },
    paymentMethod: {
        fontSize: 14,
        color: '#6b7280',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#6b7280',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 20,
        fontWeight: '600',
        color: '#6b7280',
    },
    emptySubtext: {
        marginTop: 8,
        fontSize: 14,
        color: '#9ca3af',
    },
    shopButton: {
        marginTop: 24,
        backgroundColor: '#3b82f6',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    shopButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
    },
});
