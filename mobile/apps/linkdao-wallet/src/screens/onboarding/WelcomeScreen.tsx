import React, { useEffect } from 'react';
import { View, Text, Button, StyleSheet, SafeAreaView } from 'react-native';
import { SecureKeyStorage } from '@linkdao/shared/utils/secureKeyStorage';

export default function WelcomeScreen({ navigation }: any) {
  useEffect(() => {
    const checkWallet = async () => {
      const activeWallet = await SecureKeyStorage.getActiveWallet();
      if (activeWallet) {
        navigation.replace('Main');
      }
    };
    checkWallet();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>LinkDAO Wallet</Text>
      <Text style={styles.subtitle}>Your non-custodial gateway to the LinkDAO ecosystem.</Text>
      
      <View style={styles.buttonContainer}>
        <Button
          title="Create New Wallet"
          onPress={() => navigation.navigate('CreateWallet')} 
        />
      </View>
      <View style={styles.buttonContainer}>
        <Button
          title="Import Wallet"
          onPress={() => navigation.navigate('ImportWallet')} 
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 40 },
  buttonContainer: { width: '100%', marginVertical: 10 },
});
