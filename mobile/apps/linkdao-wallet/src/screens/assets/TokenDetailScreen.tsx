import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { TokenBalance } from '@linkdao/shared/services/walletService';

export default function TokenDetailScreen({ route, navigation }: any) {
  const { token }: { token: TokenBalance } = route.params;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
            <View style={styles.iconCircle}>
                <Text style={styles.iconText}>{token.symbol.slice(0,1)}</Text>
            </View>
            <Text style={styles.balance}>{parseFloat(token.balanceFormatted).toFixed(4)} {token.symbol}</Text>
            <Text style={styles.valueUSD}>${(token.valueUSD || 0).toFixed(2)}</Text>
        </View>

        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Asset Info</Text>
            <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Name</Text>
                <Text style={styles.infoValue}>{token.name}</Text>
            </View>
            <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={styles.infoValue}>{token.address.slice(0,8)}...{token.address.slice(-8)}</Text>
            </View>
            <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Network</Text>
                <Text style={styles.infoValue}>Ethereum</Text>
            </View>
        </View>

        <View style={styles.actions}>
            <TouchableOpacity 
                style={styles.actionButton} 
                onPress={() => navigation.navigate('Send', { initialToken: token.symbol })}
            >
                <Text style={styles.actionButtonText}>Send</Text>
            </TouchableOpacity>
            <TouchableOpacity 
                style={[styles.actionButton, styles.secondaryAction]} 
                onPress={() => navigation.navigate('Receive')}
            >
                <Text style={styles.secondaryActionText}>Receive</Text>
            </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20 },
  header: { alignItems: 'center', marginVertical: 30 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  iconText: { fontSize: 32, fontWeight: 'bold', color: '#007AFF' },
  balance: { fontSize: 28, fontWeight: 'bold' },
  valueUSD: { fontSize: 18, color: '#666', marginTop: 5 },
  section: { marginTop: 20, backgroundColor: '#f9f9f9', borderRadius: 15, padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  infoLabel: { color: '#666' },
  infoValue: { fontWeight: '500' },
  actions: { flexDirection: 'row', gap: 15, marginTop: 40 },
  actionButton: { flex: 1, backgroundColor: '#007AFF', padding: 15, borderRadius: 12, alignItems: 'center' },
  actionButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  secondaryAction: { backgroundColor: '#f0f0f0' },
  secondaryActionText: { color: '#007AFF', fontWeight: 'bold', fontSize: 16 }
});
