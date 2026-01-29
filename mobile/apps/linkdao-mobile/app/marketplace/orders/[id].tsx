import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { marketplaceService, Order } from '../../../src/services';

export default function OrderDetailsScreen() {
    const { id } = useLocalSearchParams();
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            loadOrder(id as string);
        }
    }, [id]);

    const loadOrder = async (orderId: string) => {
        setLoading(true);
        try {
            const orderData = await marketplaceService.getOrder(orderId);
            setOrder(orderData);
        } catch (error) {
            console.error('Failed to load order details:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: Order['status']) => {
        switch (status) {
            case 'pending': return '#f59e0b';
            case 'processing': return '#3b82f6';
            case 'shipped': return '#8b5cf6';
            case 'delivered': return '#10b981';
            case 'cancelled': return '#ef4444';
            default: return '#6b7280';
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                </View>
            </SafeAreaView>
        );
    }

    if (!order) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color="#1f2937" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Order Details</Text>
                    <View style={{ width: 24 }} />
                </View>
                <View style={styles.centerContainer}>
                    <Text style={styles.errorText}>Order not found</Text>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Text style={styles.backButtonText}>Go Back</Text>
                    </TouchableOpacity>
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
                <Text style={styles.headerTitle}>Order #{order.id.slice(0, 8)}</Text>
                <TouchableOpacity onPress={() => loadOrder(order.id)}>
                    <Ionicons name="refresh" size={24} color="#1f2937" />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
                {/* Status Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Status</Text>
                    <View style={styles.statusRow}>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
                            <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </Text>
                        </View>
                        <Text style={styles.dateText}>{new Date(order.createdAt).toLocaleDateString()}</Text>
                    </View>
                </View>

                {/* Order Timeline */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Order Progress</Text>
                    <View style={styles.timeline}>
                        {getOrderTimeline(order).map((event, index) => (
                            <View key={index} style={styles.timelineItem}>
                                <View style={styles.timelineLine}>
                                    <View style={[
                                        styles.timelineDot,
                                        event.completed && styles.timelineDotCompleted,
                                        event.current && styles.timelineDotCurrent
                                    ]}>
                                        <Ionicons 
                                            name={event.icon} 
                                            size={16} 
                                            color={event.completed || event.current ? '#ffffff' : '#9ca3af'} 
                                        />
                                    </View>
                                    {index < getOrderTimeline(order).length - 1 && (
                                        <View style={[
                                            styles.timelineConnector,
                                            (event.completed || event.current) && styles.timelineConnectorCompleted
                                        ]} />
                                    )}
                                </View>
                                <View style={styles.timelineContent}>
                                    <Text style={[
                                        styles.timelineTitle,
                                        (event.completed || event.current) && styles.timelineTitleCompleted
                                    ]}>
                                        {event.title}
                                    </Text>
                                    <Text style={styles.timelineDescription}>{event.description}</Text>
                                    <Text style={styles.timelineDate}>{event.date}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Tracking Section */}
                {(order.trackingNumber || order.trackingUrl) && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Tracking Information</Text>
                        <View style={styles.infoCard}>
                            {order.trackingCarrier && (
                                <Text style={styles.label}>Carrier: <Text style={styles.value}>{order.trackingCarrier}</Text></Text>
                            )}
                            {order.trackingNumber && (
                                <Text style={styles.label}>Tracking #: <Text style={styles.value}>{order.trackingNumber}</Text></Text>
                            )}
                            {order.trackingUrl && (
                                <TouchableOpacity onPress={() => Linking.openURL(order.trackingUrl!)}>
                                    <Text style={styles.link}>Track Shipment</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                )}

                {/* Items Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Items</Text>
                    {order.items.map((item, index) => (
                        <View key={index} style={styles.itemRow}>
                            <View style={styles.itemInfo}>
                                <Text style={styles.itemName}>{item.product?.name || 'Product'}</Text>
                                <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                            </View>
                            <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
                        </View>
                    ))}
                    <View style={styles.divider} />
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Total</Text>
                        <Text style={styles.totalAmount}>${order.total.toFixed(2)}</Text>
                    </View>
                </View>

                {/* Shipping Address Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Shipping Address</Text>
                    <View style={styles.infoCard}>
                        <Text style={styles.addressText}>{order.shippingAddress.name}</Text>
                        <Text style={styles.addressText}>{order.shippingAddress.street}</Text>
                        <Text style={styles.addressText}>
                            {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
                        </Text>
                        <Text style={styles.addressText}>{order.shippingAddress.country}</Text>
                        {order.shippingAddress.phone && (
                            <Text style={styles.addressText}>{order.shippingAddress.phone}</Text>
                        )}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
        padding: 16,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 8,
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        padding: 12,
        borderRadius: 8,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontWeight: '600',
        fontSize: 14,
    },
    dateText: {
        color: '#6b7280',
    },
    infoCard: {
        backgroundColor: '#ffffff',
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    label: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 4,
    },
    value: {
        color: '#1f2937',
        fontWeight: '500',
    },
    link: {
        color: '#3b82f6',
        fontWeight: '600',
        marginTop: 4,
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontSize: 15,
        fontWeight: '500',
        color: '#1f2937',
    },
    itemQuantity: {
        fontSize: 13,
        color: '#6b7280',
        marginTop: 2,
    },
    itemPrice: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1f2937',
    },
    divider: {
        height: 1,
        backgroundColor: '#e5e7eb',
        marginVertical: 12,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
    },
    totalAmount: {
        fontSize: 18,
        fontWeight: '700',
        color: '#3b82f6',
    },
    addressText: {
        fontSize: 14,
        color: '#4b5563',
        marginBottom: 2,
    },
    errorText: {
        fontSize: 16,
        color: '#ef4444',
        marginBottom: 16,
    },
    backButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
    },
    backButtonText: {
        color: '#374151',
        fontWeight: '600',
    },
});
