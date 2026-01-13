import React, { useEffect } from 'react';
import { View, Text, Button, StyleSheet, SafeAreaView, Image } from 'react-native';
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
      <Image 
        source={require('../../../assets/logo.png')} 
        style={styles.logo}
        resizeMode="contain"
      />
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
  logo: { width: 120, height: 120, marginBottom: 20 },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 40 },
  buttonContainer: { width: '100%', marginVertical: 10 },
});
