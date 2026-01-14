import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, TextInput, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import { generateMnemonic, derivePrivateKeyFromMnemonic, deriveAddressFromPrivateKey } from '@linkdao/shared/utils/bip39Utils';
import { SecureKeyStorage } from '@linkdao/shared/utils/secureKeyStorage';
import { useScreenshotProtection } from '../../components/withScreenshotProtection';

export default function CreateWalletScreen({ navigation }: any) {
  const [mnemonic, setMnemonic] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState(1); // 1: Mnemonic, 2: Password
  
  // Enable screenshot protection
  const { enableProtection, disableProtection } = useScreenshotProtection();

  useEffect(() => {
    setMnemonic(generateMnemonic());
    enableProtection();
    return () => disableProtection();
  }, [enableProtection, disableProtection]);

  const handleNextStep = () => {
    setStep(2);
  };

  const handleCreate = async () => {
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
        name: 'My Wallet',
        isHardwareWallet: false,
        chainIds: [1, 8453, 137, 42161],
      }, mnemonic);

      Alert.alert('Success', 'Wallet created successfully!');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create wallet');
    }
  };

  if (step === 1) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Recovery Phrase</Text>
          <Text style={styles.subtitle}>
            Write down these 12 words in order. Never share them with anyone.
          </Text>
          
          <View style={styles.mnemonicContainer}>
            {mnemonic.split(' ').map((word, index) => (
              <View key={index} style={styles.wordBox}>
                <Text style={styles.wordIndex}>{index + 1}.</Text>
                <Text style={styles.wordText}>{word}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={handleNextStep}>
            <Text style={styles.buttonText}>I've backed it up</Text>
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
          This password will be used to encrypt your wallet on this device.
        </Text>
        
        <TextInput
          style={styles.input}
          placeholder="Password"
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

        <TouchableOpacity style={styles.primaryButton} onPress={handleCreate}>
          <Text style={styles.buttonText}>Create Wallet</Text>
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
  mnemonicContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'center',
    marginBottom: 40,
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#eee'
  },
  wordBox: { 
    flexDirection: 'row',
    backgroundColor: '#fff', 
    padding: 10, 
    margin: 5, 
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    minWidth: '28%'
  },
  wordIndex: { color: '#999', marginRight: 5, fontSize: 12 },
  wordText: { fontWeight: 'bold' },
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