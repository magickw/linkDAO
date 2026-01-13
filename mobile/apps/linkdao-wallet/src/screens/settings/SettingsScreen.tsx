import React from 'react';
import { View, Text, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { SecureKeyStorage } from '@linkdao/shared/utils/secureKeyStorage';

export default function SettingsScreen({ navigation }: any) {
  const handleClearWallet = () => {
    Alert.alert(
      'Delete Wallet',
      'Are you sure you want to delete ALL wallet data from this device? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            await SecureKeyStorage.clearAll();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Auth' }],
            });
          }
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security</Text>
        <TouchableOpacity style={styles.deleteButton} onPress={handleClearWallet}>
          <Text style={styles.deleteButtonText}>Delete Wallet Data</Text>
        </TouchableOpacity>
      </View>

      <Button 
        title="Logout (Dev)" 
        onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Auth' }] })} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 30 },
  section: { marginBottom: 30 },
  sectionTitle: { fontSize: 18, color: '#666', marginBottom: 15 },
  deleteButton: { 
    backgroundColor: '#FFE5E5', 
    padding: 15, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#FF3B30' 
  },
  deleteButtonText: { color: '#FF3B30', fontWeight: 'bold', textAlign: 'center' }
});
