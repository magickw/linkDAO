import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert, Share, ScrollView, ActivityIndicator, Platform } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SecureKeyStorage } from '@linkdao/shared/utils/secureKeyStorage';

const NETWORKS = [
  { id: 1, name: 'Ethereum', symbol: 'ETH' },
  { id: 8453, name: 'Base', symbol: 'ETH' },
  { id: 137, name: 'Polygon', symbol: 'MATIC' },
  { id: 42161, name: 'Arbitrum', symbol: 'ETH' },
];

export default function ReceiveScreen() {
  const [address, setAddress] = useState<string | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState(NETWORKS[0]);

  useEffect(() => {
    const loadAddress = async () => {
      const activeWallet = await SecureKeyStorage.getActiveWallet();
      setAddress(activeWallet);
    };
    loadAddress();
  }, []);

  const handleCopy = () => {
    // Clipboard would be imported in real environment
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
        <ActivityIndicator size="large" style={{flex: 1}} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Receive Assets</Text>
        
        <View style={styles.networkContainer}>
            <Text style={styles.label}>Select Network</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.networkScroll}>
                {NETWORKS.map(net => (
                    <TouchableOpacity 
                        key={net.id} 
                        style={[styles.networkButton, selectedNetwork.id === net.id && styles.selectedNetwork]}
                        onPress={() => setSelectedNetwork(net)}
                    >
                        <Text style={[styles.networkText, selectedNetwork.id === net.id && styles.selectedNetworkText]}>{net.name}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>

        <View style={styles.qrCard}>
            <Text style={styles.qrHeader}>My {selectedNetwork.name} Address</Text>
            <View style={styles.qrWrapper}>
                <QRCode
                    value={address}
                    size={220}
                    color="#000"
                    backgroundColor="#fff"
                />
            </View>
            <TouchableOpacity style={styles.addressContainer} onPress={handleCopy}>
                <Text style={styles.addressText}>{address}</Text>
                <Text style={styles.copyHint}>Tap to copy</Text>
            </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
            <Text style={styles.infoText}>Only send {selectedNetwork.symbol} or compatible tokens to this address on the {selectedNetwork.name} network.</Text>
        </View>

        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Text style={styles.shareButtonText}>Share Address</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 25, alignSelf: 'flex-start' },
  networkContainer: { width: '100%', marginBottom: 30 },
  label: { fontSize: 16, color: '#666', marginBottom: 12, fontWeight: '500' },
  networkScroll: { flexDirection: 'row' },
  networkButton: { 
      paddingVertical: 10, 
      paddingHorizontal: 20, 
      borderRadius: 20, 
      borderWidth: 1, 
      borderColor: '#eee',
      backgroundColor: '#f9f9f9',
      marginRight: 10
  },
  selectedNetwork: { borderColor: '#007AFF', backgroundColor: '#007AFF' },
  networkText: { color: '#666', fontWeight: '500' },
  selectedNetworkText: { color: '#fff' },
  qrCard: { 
      width: '100%', 
      backgroundColor: '#fff', 
      borderRadius: 25, 
      padding: 25, 
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#f0f0f0',
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 15,
      marginBottom: 30
  },
  qrHeader: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 20 },
  qrWrapper: { padding: 10, backgroundColor: '#fff', borderRadius: 15 },
  addressContainer: { marginTop: 25, alignItems: 'center', backgroundColor: '#f5f5f5', padding: 15, borderRadius: 15, width: '100%' },
  addressText: { fontSize: 13, color: '#333', textAlign: 'center', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  copyHint: { fontSize: 11, color: '#007AFF', marginTop: 5, fontWeight: '600' },
  infoBox: { backgroundColor: '#FFF9E6', padding: 15, borderRadius: 15, width: '100%', marginBottom: 30 },
  infoText: { color: '#856404', fontSize: 13, textAlign: 'center', lineHeight: 18 },
  shareButton: { 
      backgroundColor: '#007AFF', 
      width: '100%', 
      padding: 18, 
      borderRadius: 15, 
      alignItems: 'center' 
  },
  shareButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 18 }
});
