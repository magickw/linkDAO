import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert, TextInput, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { localWalletTransactionService } from '@linkdao/shared/services/localWalletTransactionService';
import { SecureKeyStorage } from '@linkdao/shared/utils/secureKeyStorage';
import { isAddress, parseEther } from 'viem';
import { useScreenshotProtection } from '../../components/withScreenshotProtection';

const NETWORKS = [
  { id: 1, name: 'Ethereum', symbol: 'ETH' },
  { id: 8453, name: 'Base', symbol: 'ETH' },
  { id: 137, name: 'Polygon', symbol: 'MATIC' },
  { id: 42161, name: 'Arbitrum', symbol: 'ETH' },
];

export default function SendScreen({ route, navigation }: any) {
  const initialToken = route.params?.initialToken || 'ETH';
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState(NETWORKS[0]);
  
  // Password Verification State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  
  // Enable screenshot protection for sensitive transaction screen
  const { enableProtection, disableProtection } = useScreenshotProtection();

  useEffect(() => {
    enableProtection();
    return () => disableProtection();
  }, [enableProtection, disableProtection]);

  useEffect(() => {
    const getPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };
    getPermissions();
  }, []);

  const handleBarCodeScanned = ({ data }: any) => {
    setScanned(true);
    setIsScanning(false);
    if (isAddress(data)) {
        setRecipient(data);
    } else if (data.startsWith('ethereum:')) {
        const addr = data.split(':')[1]?.split('@')[0];
        if (isAddress(addr)) setRecipient(addr);
    } else {
        Alert.alert('Invalid QR Code', 'Scanned data is not a valid address');
    }
  };

  const handleSendPress = () => {
    if (!isAddress(recipient)) {
        Alert.alert('Error', 'Please enter a valid recipient address');
        return;
    }
    if (!amount || parseFloat(amount) <= 0) {
        Alert.alert('Error', 'Please enter a valid amount');
        return;
    }
    setShowPasswordModal(true);
  };

  const handleConfirmSend = async () => {
    if (!password) {
        Alert.alert('Error', 'Password is required');
        return;
    }

    setIsLoading(true);
    setShowPasswordModal(false);

    try {
        const activeWallet = await SecureKeyStorage.getActiveWallet();
        if (!activeWallet) throw new Error('No active wallet');

        const result = await localWalletTransactionService.sendTransaction({
            to: recipient,
            value: parseEther(amount),
            chainId: selectedNetwork.id,
            walletAddress: activeWallet,
            password: password
        });

        if (result.success) {
            Alert.alert('Success', `Transaction sent: ${result.hash}`);
            navigation.goBack();
        } else {
            Alert.alert('Transaction Failed', result.error);
        }
    } catch (error: any) {
        Alert.alert('Error', error.message);
    } finally {
        setIsLoading(false);
        setPassword('');
    }
  };

  if (hasPermission === null) {
    return <View style={styles.container}><ActivityIndicator size="large" style={{flex: 1}} /></View>;
  }
  if (hasPermission === false) {
    return <View style={styles.container}><Text style={styles.errorText}>No access to camera</Text></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      {isScanning ? (
          <View style={styles.cameraContainer}>
            <CameraView
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                style={StyleSheet.absoluteFillObject}
            />
            <TouchableOpacity style={styles.closeButton} onPress={() => setIsScanning(false)}>
                <Text style={styles.closeButtonText}>Close Camera</Text>
            </TouchableOpacity>
          </View>
      ) : (
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Send Assets</Text>
        
        <View style={styles.inputContainer}>
            <Text style={styles.label}>Network</Text>
            <View style={styles.networkGrid}>
                {NETWORKS.map(net => (
                    <TouchableOpacity 
                        key={net.id} 
                        style={[styles.networkButton, selectedNetwork.id === net.id && styles.selectedNetwork]}
                        onPress={() => setSelectedNetwork(net)}
                    >
                        <Text style={[styles.networkText, selectedNetwork.id === net.id && styles.selectedNetworkText]}>{net.name}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>

        <View style={styles.inputContainer}>
            <Text style={styles.label}>Recipient Address</Text>
            <View style={styles.row}>
                <TextInput
                    style={[styles.input, {flex: 1}]}
                    placeholder="0x..."
                    value={recipient}
                    onChangeText={setRecipient}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                <TouchableOpacity style={styles.scanButton} onPress={() => { setScanned(false); setIsScanning(true); }}>
                    <Text style={styles.scanButtonText}>Scan</Text>
                </TouchableOpacity>
            </View>
        </View>

        <View style={styles.inputContainer}>
            <Text style={styles.label}>Amount ({selectedNetwork.symbol})</Text>
            <TextInput
                style={styles.input}
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
            />
        </View>

        <TouchableOpacity 
            style={[styles.sendButton, isLoading && styles.disabledButton]} 
            onPress={handleSendPress}
            disabled={isLoading}
        >
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendButtonText}>Review & Send</Text>}
        </TouchableOpacity>
      </ScrollView>
      )}

      {/* Password Modal */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Confirm Transaction</Text>
                <Text style={styles.modalSubtitle}>Enter your wallet password to sign</Text>
                <TextInput
                    style={styles.modalInput}
                    placeholder="Password"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                    autoFocus
                />
                <View style={styles.modalButtons}>
                    <TouchableOpacity 
                        style={[styles.modalButton, styles.cancelButton]} 
                        onPress={() => { setShowPasswordModal(false); setPassword(''); }}
                    >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.modalButton, styles.confirmButton]} 
                        onPress={handleConfirmSend}
                    >
                        <Text style={styles.confirmButtonText}>Sign & Send</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20 },
  cameraContainer: { flex: 1 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 25 },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 16, color: '#666', marginBottom: 8, fontWeight: '500' },
  input: { 
      backgroundColor: '#f9f9f9', 
      padding: 15, 
      borderRadius: 12, 
      borderWidth: 1, 
      borderColor: '#eee',
      fontSize: 16
  },
  networkGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  networkButton: { 
      paddingVertical: 10, 
      paddingHorizontal: 15, 
      borderRadius: 20, 
      borderWidth: 1, 
      borderColor: '#ddd',
      backgroundColor: '#fff'
  },
  selectedNetwork: { borderColor: '#007AFF', backgroundColor: '#007AFF' },
  networkText: { color: '#666', fontWeight: '500' },
  selectedNetworkText: { color: '#fff' },
  row: { flexDirection: 'row', gap: 10 },
  scanButton: { 
      justifyContent: 'center', 
      alignItems: 'center', 
      backgroundColor: '#f0f0f0', 
      paddingHorizontal: 20, 
      borderRadius: 12 
  },
  scanButtonText: { color: '#007AFF', fontWeight: '600' },
  sendButton: { 
      backgroundColor: '#007AFF', 
      padding: 18, 
      borderRadius: 15, 
      alignItems: 'center',
      marginTop: 20
  },
  disabledButton: { backgroundColor: '#ccc' },
  sendButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  closeButton: {
      position: 'absolute',
      bottom: 50,
      alignSelf: 'center',
      backgroundColor: 'rgba(0,0,0,0.7)',
      padding: 15,
      borderRadius: 25
  },
  closeButtonText: { color: '#fff', fontSize: 16 },
  errorText: { color: 'red', textAlign: 'center', marginTop: 50 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', width: '85%', borderRadius: 20, padding: 25, elevation: 10 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  modalSubtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
  modalInput: { 
      backgroundColor: '#f5f5f5', 
      padding: 15, 
      borderRadius: 12, 
      borderWidth: 1, 
      borderColor: '#ddd',
      fontSize: 16,
      marginBottom: 20
  },
  modalButtons: { flexDirection: 'row', gap: 10 },
  modalButton: { flex: 1, padding: 15, borderRadius: 12, alignItems: 'center' },
  cancelButton: { backgroundColor: '#f0f0f0' },
  confirmButton: { backgroundColor: '#007AFF' },
  cancelButtonText: { color: '#666', fontWeight: '600' },
  confirmButtonText: { color: '#fff', fontWeight: 'bold' }
});