import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert, TextInput, ActivityIndicator, Modal } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { walletService } from '@linkdao/shared/services/walletService';
import { localWalletTransactionService } from '@linkdao/shared/services/localWalletTransactionService';
import { SecureKeyStorage } from '@linkdao/shared/utils/secureKeyStorage';
import { parseEther } from 'viem';

export default function SendScreen({ navigation }: any) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Password Verification State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');

  useEffect(() => {
    const getPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };
    getPermissions();
  }, []);

  const handleBarCodeScanned = ({ type, data }: any) => {
    setScanned(true);
    setIsScanning(false);
    if (data.startsWith('0x') && data.length === 42) {
        setRecipient(data);
    } else if (data.startsWith('ethereum:')) {
        setRecipient(data.replace('ethereum:', ''));
    } else {
        Alert.alert('Invalid QR Code', 'Scanned data is not a valid address');
    }
  };

  const handleSendPress = () => {
    if (!recipient || !amount) {
        Alert.alert('Error', 'Please enter recipient and amount');
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
            chainId: 1, // Default to Mainnet or get from store
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
      <View style={styles.content}>
        <Text style={styles.title}>Send</Text>
        
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
            <Text style={styles.label}>Amount (ETH)</Text>
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
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendButtonText}>Send Transaction</Text>}
        </TouchableOpacity>
      </View>
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
  content: { flex: 1, padding: 20 },
  cameraContainer: { flex: 1 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 30 },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 16, color: '#666', marginBottom: 5 },
  input: { 
      backgroundColor: '#f9f9f9', 
      padding: 15, 
      borderRadius: 12, 
      borderWidth: 1, 
      borderColor: '#eee',
      fontSize: 16
  },
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


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, padding: 20 },
  cameraContainer: { flex: 1 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 30 },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 16, color: '#666', marginBottom: 5 },
  input: { 
      backgroundColor: '#f9f9f9', 
      padding: 15, 
      borderRadius: 12, 
      borderWidth: 1, 
      borderColor: '#eee',
      fontSize: 16
  },
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
  sendButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  closeButton: {
      position: 'absolute',
      bottom: 50,
      alignSelf: 'center',
      backgroundColor: 'rgba(0,0,0,0.7)',
      padding: 15,
      borderRadius: 25
  },
  closeButtonText: { color: '#fff', fontSize: 16 }
});
