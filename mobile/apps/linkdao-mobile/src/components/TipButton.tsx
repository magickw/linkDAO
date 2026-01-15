/**
 * Tip Button Component
 * Allows users to send token tips to content creators
 */

import React, { useState } from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    Modal,
    View,
    TextInput,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tippingService, walletService } from '../services';
import { ethers } from 'ethers';

interface TipButtonProps {
    recipientId: string;
    contentType: 'post' | 'comment' | 'user';
    contentId?: string;
    compact?: boolean;
    onTipSent?: () => void;
}

export default function TipButton({
    recipientId,
    contentType,
    contentId,
    compact = false,
    onTipSent,
}: TipButtonProps) {
    const [showModal, setShowModal] = useState(false);
    const [amount, setAmount] = useState('');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);

    const presetAmounts = [1, 5, 10, 25, 50, 100];

    const handleSendTip = async () => {
        const tipAmount = parseFloat(amount);
        if (!tipAmount || tipAmount <= 0) {
            Alert.alert('Error', 'Please enter a valid amount');
            return;
        }

        try {
            setSending(true);

            // 1. Send transaction on-chain
            if (!walletService.isConnected()) {
                throw new Error('Wallet not connected');
            }

            // For now, simulate sending ETH/LDAO tip directly to recipient
            // In production, you would call the TipRouter contract
            const txHash = await walletService.sendTransaction({
                to: recipientId, // This should be the wallet address
                value: ethers.parseEther(tipAmount.toString()).toString(),
            });

            console.log('✅ Tip transaction sent:', txHash);

            // 2. Record tip in backend
            const result = await tippingService.sendTip({
                recipientId,
                amount: tipAmount,
                contentType,
                contentId,
                message,
            });

            if (result.success) {
                Alert.alert('Success', `Sent ${tipAmount} LDAO tip!\nTransaction: ${txHash.slice(0, 10)}...`);
                setShowModal(false);
                setAmount('');
                setMessage('');
                onTipSent?.();
            } else {
                Alert.alert('Partially Successful', 'Transaction sent but failed to record in history.');
            }
        } catch (error: any) {
            console.error('Error sending tip:', error);
            Alert.alert('Error', error.message || 'Failed to send tip');
        } finally {
            setSending(false);
        }
    };

    return (
        <>
            <TouchableOpacity
                style={[styles.tipButton, compact && styles.tipButtonCompact]}
                onPress={() => setShowModal(true)}
            >
                <Ionicons name="cash-outline" size={compact ? 16 : 20} color="#FFB800" />
                {!compact && <Text style={styles.tipButtonText}>Tip</Text>}
            </TouchableOpacity>

            <Modal
                visible={showModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Send Tip</Text>
                            <TouchableOpacity onPress={() => setShowModal(false)}>
                                <Ionicons name="close" size={24} color="#000" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.description}>
                            Send LDAO tokens to show appreciation
                        </Text>

                        {/* Preset Amounts */}
                        <View style={styles.presetsContainer}>
                            {presetAmounts.map((preset) => (
                                <TouchableOpacity
                                    key={preset}
                                    style={[
                                        styles.presetButton,
                                        amount === preset.toString() && styles.presetButtonActive,
                                    ]}
                                    onPress={() => setAmount(preset.toString())}
                                >
                                    <Text
                                        style={[
                                            styles.presetText,
                                            amount === preset.toString() && styles.presetTextActive,
                                        ]}
                                    >
                                        {preset}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Custom Amount */}
                        <TextInput
                            style={styles.input}
                            placeholder="Custom amount (LDAO)"
                            placeholderTextColor="#8E8E93"
                            keyboardType="numeric"
                            value={amount}
                            onChangeText={setAmount}
                        />

                        {/* Message */}
                        <TextInput
                            style={[styles.input, styles.messageInput]}
                            placeholder="Add a message (optional)"
                            placeholderTextColor="#8E8E93"
                            multiline
                            value={message}
                            onChangeText={setMessage}
                            maxLength={200}
                        />

                        {/* Send Button */}
                        <TouchableOpacity
                            style={[styles.sendButton, sending && styles.sendButtonDisabled]}
                            onPress={handleSendTip}
                            disabled={sending}
                        >
                            {sending ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.sendButtonText}>Send Tip</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    tipButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#FFF9E6',
    },
    tipButtonCompact: {
        padding: 8,
        backgroundColor: 'transparent',
    },
    tipButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFB800',
        marginLeft: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 34,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
    },
    description: {
        fontSize: 14,
        color: '#8E8E93',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
    },
    presetsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 16,
        gap: 8,
    },
    presetButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#F2F2F7',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    presetButtonActive: {
        backgroundColor: '#FFF9E6',
        borderColor: '#FFB800',
    },
    presetText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000',
    },
    presetTextActive: {
        color: '#FFB800',
    },
    input: {
        backgroundColor: '#F2F2F7',
        borderRadius: 12,
        padding: 14,
        marginHorizontal: 16,
        marginBottom: 12,
        fontSize: 16,
        color: '#000',
    },
    messageInput: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    sendButton: {
        backgroundColor: '#FFB800',
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 16,
        marginTop: 8,
        alignItems: 'center',
    },
    sendButtonDisabled: {
        opacity: 0.5,
    },
    sendButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
});
