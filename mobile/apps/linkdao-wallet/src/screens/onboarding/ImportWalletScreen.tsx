import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, SafeAreaView } from 'react-native';
import { validateMnemonic, derivePrivateKeyFromMnemonic, deriveAddressFromPrivateKey } from '@linkdao/shared/utils/bip39Utils';
import { SecureKeyStorage } from '@linkdao/shared/utils/secureKeyStorage';
import { useScreenshotProtection } from '../../components/withScreenshotProtection';

export default function ImportWalletScreen({ navigation }: any) {
  const [mnemonic, setMnemonic] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState(1); // 1: Phrase, 2: Password
  
  // Enable screenshot protection
  const { enableProtection, disableProtection } = useScreenshotProtection();
  
  useEffect(() => {
    enableProtection();
    return () => disableProtection();
  }, [enableProtection, disableProtection]);

  const handleNextStep = () => {
    if (!validateMnemonic(mnemonic)) {
      Alert.alert('Error', 'Invalid recovery phrase. Please check the words and order.');
      return;
    }
    setStep(2);
  };

  const handleImport = async () => {
    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    try {
      const privateKey = derivePrivateKeyFromMnemonic(mnemonic);
      const address = deriveAddressFromPrivateKey(privateKey);
      
      await SecureKeyStorage.storeWallet(address, privateKey, password, {
        name: 'Imported Wallet',
        isHardwareWallet: false,
        chainIds: [1, 8453, 137, 42161],
      }, mnemonic);

      Alert.alert('Success', 'Wallet imported successfully!');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to import wallet');
    }
  };

  if (step === 1) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Import Wallet</Text>
          <Text style={styles.subtitle}>
            Enter your 12-word recovery phrase to restore your wallet.
          </Text>
          
          <TextInput
            style={styles.inputArea}
            multiline
            numberOfLines={4}
            placeholder="word1 word2 word3..."
            value={mnemonic}
            onChangeText={setMnemonic}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TouchableOpacity style={styles.primaryButton} onPress={handleNextStep}>
            <Text style={styles.buttonText}>Next</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Set Password</Text>
        <Text style={styles.subtitle}>
          Set a new password to protect your wallet on this device.
        </Text>
        
        <TextInput
          style={styles.input}
          placeholder="New Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        
        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.primaryButton} onPress={handleImport}>
          <Text style={styles.buttonText}>Restore Wallet</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(1)}>
          <Text style={styles.secondaryButtonText}>Back to Phrase</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 30, textAlign: 'center' },
  inputArea: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    height: 120,
    textAlignVertical: 'top',
    marginBottom: 30,
    fontSize: 16
  },
  input: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 15,
    fontSize: 16
  },
  primaryButton: { 
    backgroundColor: '#007AFF', 
    padding: 15, 
    borderRadius: 12, 
    alignItems: 'center',
    marginBottom: 10
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  secondaryButton: { 
    padding: 15, 
    alignItems: 'center'
  },
  secondaryButtonText: { color: '#007AFF', fontSize: 16 }
});