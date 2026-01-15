/**
 * Connection Status Component
 * Displays WebSocket connection status to user
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { webSocketService } from '../services/websocketService';

export default function ConnectionStatus() {
    const [isConnected, setIsConnected] = useState(false);
    const [isReconnecting, setIsReconnecting] = useState(false);
    const [showStatus, setShowStatus] = useState(false);
    const fadeAnim = useState(new Animated.Value(0))[0];

    useEffect(() => {
        // Subscribe to connection events
        const unsubscribeConnected = webSocketService.on('connected', () => {
            setIsConnected(true);
            setIsReconnecting(false);
            showStatusBriefly();
        });

        const unsubscribeDisconnected = webSocketService.on('disconnected', () => {
            setIsConnected(false);
            setIsReconnecting(true);
            setShowStatus(true);
        });

        // Check initial connection status
        setIsConnected(webSocketService.isConnected());

        return () => {
            unsubscribeConnected();
            unsubscribeDisconnected();
        };
    }, []);

    useEffect(() => {
        if (showStatus) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    }, [showStatus]);

    const showStatusBriefly = () => {
        setShowStatus(true);
        setTimeout(() => {
            setShowStatus(false);
        }, 3000);
    };

    const handleRetry = () => {
        // Attempt to reconnect
        const token = ''; // Get from auth store
        webSocketService.connect(token);
    };

    if (!showStatus && isConnected) {
        return null;
    }

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    opacity: fadeAnim,
                    backgroundColor: isConnected ? '#34C759' : isReconnecting ? '#FF9500' : '#FF3B30',
                },
            ]}
        >
            <View style={styles.content}>
                <Ionicons
                    name={
                        isConnected
                            ? 'checkmark-circle'
                            : isReconnecting
                                ? 'sync'
                                : 'alert-circle'
                    }
                    size={16}
                    color="#fff"
                />
                <Text style={styles.text}>
                    {isConnected
                        ? 'Connected'
                        : isReconnecting
                            ? 'Reconnecting...'
                            : 'Disconnected'}
                </Text>
            </View>

            {!isConnected && !isReconnecting && (
                <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                    <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingVertical: 8,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 1000,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    text: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
        marginLeft: 8,
    },
    retryButton: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    retryText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#fff',
    },
});
