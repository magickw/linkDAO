import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, Switch } from 'react-native';

export default function WalletScreen() {
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [token, setToken] = useState('USDC');
  const [useENS, setUseENS] = useState(false);
  const [ensName, setEnsName] = useState('');
  
  const balances = {
    USDC: '1250.50',
    USDT: '0.00',
    ETH: '0.5432'
  };

  const handleSend = () => {
    // Validate input
    if (!recipient && !useENS) {
      Alert.alert('Error', 'Please enter a recipient address');
      return;
    }
    
    if (useENS && !ensName) {
      Alert.alert('Error', 'Please enter an ENS name');
      return;
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    
    // In a real app, this would connect to the wallet service
    const recipientDisplay = useENS ? ensName : recipient;
    console.log('Sending payment:', { amount, recipient: recipientDisplay, token });
    Alert.alert('Success', `Payment of ${amount} ${token} sent to ${recipientDisplay}!`);
    
    // Reset form
    setAmount('');
    setRecipient('');
    setEnsName('');
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Your Wallet</Text>
      
      <View style={styles.balancesContainer}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>USDC Balance</Text>
          <Text style={styles.balanceValue}>{balances.USDC}</Text>
          <Text style={styles.balanceSubtitle}>USD Coin</Text>
        </View>
        
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>USDT Balance</Text>
          <Text style={styles.balanceValue}>{balances.USDT}</Text>
          <Text style={styles.balanceSubtitle}>Tether</Text>
        </View>
        
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>ETH Balance</Text>
          <Text style={styles.balanceValue}>{balances.ETH}</Text>
          <Text style={styles.balanceSubtitle}>Ethereum</Text>
        </View>
      </View>
      
      <View style={styles.form}>
        <Text style={styles.sectionTitle}>Send Payment</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Token</Text>
          <View style={styles.tokenSelector}>
            <TouchableOpacity 
              style={[styles.tokenButton, token === 'USDC' && styles.selectedToken]}
              onPress={() => setToken('USDC')}
            >
              <Text style={[styles.tokenText, token === 'USDC' && styles.selectedTokenText]}>USDC</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tokenButton, token === 'USDT' && styles.selectedToken]}
              onPress={() => setToken('USDT')}
            >
              <Text style={[styles.tokenText, token === 'USDT' && styles.selectedTokenText]}>USDT</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tokenButton, token === 'ETH' && styles.selectedToken]}
              onPress={() => setToken('ETH')}
            >
              <Text style={[styles.tokenText, token === 'ETH' && styles.selectedTokenText]}>ETH</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Amount</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            keyboardType="decimal-pad"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <View style={styles.switchContainer}>
            <Text style={styles.label}>Use ENS Name</Text>
            <Switch
              value={useENS}
              onValueChange={setUseENS}
            />
          </View>
          
          {useENS ? (
            <TextInput
              style={styles.input}
              value={ensName}
              onChangeText={setEnsName}
              placeholder="username.eth"
            />
          ) : (
            <TextInput
              style={styles.input}
              value={recipient}
              onChangeText={setRecipient}
              placeholder="0x..."
            />
          )}
        </View>
        
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Text style={styles.sendButtonText}>Send Payment</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.recentTransactions}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        
        <View style={styles.transactionItem}>
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionText}>Received from 0x1234...5678</Text>
            <Text style={styles.transactionDate}>2023-07-15</Text>
          </View>
          <Text style={styles.transactionAmountPositive}>+100 USDC</Text>
        </View>
        
        <View style={styles.transactionItem}>
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionText}>Sent to 0x8765...4321</Text>
            <Text style={styles.transactionDate}>2023-07-10</Text>
          </View>
          <Text style={styles.transactionAmountNegative}>-50 USDC</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
    color: '#333',
  },
  balancesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  balanceCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  balanceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3b82f6',
    marginBottom: 5,
  },
  balanceSubtitle: {
    fontSize: 12,
    color: '#999',
  },
  form: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  recentTransactions: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  inputGroup: {
    marginBottom: 20,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  tokenSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tokenButton: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 5,
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedToken: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  tokenText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  selectedTokenText: {
    color: 'white',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 15,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 10,
  },
  sendButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 14,
    color: '#999',
  },
  transactionAmountPositive: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10b981',
  },
  transactionAmountNegative: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
});