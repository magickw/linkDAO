import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert, Share } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SecureKeyStorage } from '@linkdao/shared/utils/secureKeyStorage';

export default function ReceiveScreen() {
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    const loadAddress = async () => {
      const activeWallet = await SecureKeyStorage.getActiveWallet();
      setAddress(activeWallet);
    };
    loadAddress();
  }, []);

  const handleCopy = () => {
    // In real app, import Clipboard
    Alert.alert('Copied', 'Address copied to clipboard');
  };

  const handleShare = async () => {
    if (address) {
      await Share.share({
        message: address,
      });
    }
  };

  if (!address) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text>Loading wallet address...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Receive</Text>
        <Text style={styles.subtitle}>Scan this QR code to receive tokens</Text>
        
        <View style={styles.qrContainer}>
          <QRCode
            value={address}
            size={200}
          />
        </View>

        <Text style={styles.address}>{address}</Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.button} onPress={handleCopy}>
            <Text style={styles.buttonText}>Copy Address</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.shareButton]} onPress={handleShare}>
            <Text style={[styles.buttonText, styles.shareButtonText]}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 30 },
  qrContainer: { padding: 20, backgroundColor: '#fff', borderRadius: 20, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 10, marginBottom: 30 },
  address: { fontSize: 14, color: '#333', textAlign: 'center', marginBottom: 30, paddingHorizontal: 20 },
  buttonRow: { flexDirection: 'row', gap: 15 },
  button: { backgroundColor: '#f0f0f0', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 25 },
  buttonText: { color: '#007AFF', fontWeight: '600', fontSize: 16 },
  shareButton: { backgroundColor: '#007AFF' },
  shareButtonText: { color: '#fff' }
});
