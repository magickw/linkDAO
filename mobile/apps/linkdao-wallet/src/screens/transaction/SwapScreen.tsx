import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, FlatList } from 'react-native';
import { dexService, SwapQuoteResult, TokenInfo } from '@linkdao/shared/services/dexService';
import { SecureKeyStorage } from '@linkdao/shared/utils/secureKeyStorage';

export default function SwapScreen() {
  const [amountIn, setAmountIn] = useState('');
  const [tokenIn, setTokenIn] = useState<TokenInfo | null>(null);
  const [tokenOut, setTokenOut] = useState<TokenInfo | null>(null);
  const [popularTokens, setPopularTokens] = useState<TokenInfo[]>([]);
  const [quote, setQuote] = useState<SwapQuoteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [selectingFor, setSelectingFor] = useState<'in' | 'out'>('in');

  useEffect(() => {
      const loadTokens = async () => {
          const tokens = await dexService.getPopularTokens(1); // Default to Mainnet
          setPopularTokens(tokens);
          setTokenIn(tokens[0]);
          setTokenOut(tokens[1]);
      };
      loadTokens();
  }, []);

  useEffect(() => {
      const getQuote = async () => {
          if (!amountIn || parseFloat(amountIn) <= 0 || !tokenIn || !tokenOut) {
              setQuote(null);
              return;
          }
          
          setLoading(true);
          try {
              const quoteResult = await dexService.getSwapQuote({
                  tokenInAddress: tokenIn.address,
                  tokenOutAddress: tokenOut.address,
                  amountIn: parseFloat(amountIn),
                  slippageTolerance: 0.5
              });

              if (quoteResult?.data?.quote) {
                  setQuote(quoteResult.data.quote);
              } else {
                  // Fallback for demo
                  setQuote({
                      amountIn: amountIn,
                      amountOut: (parseFloat(amountIn) * (tokenIn.symbol === 'ETH' ? 3000 : 1)).toString(),
                      priceImpact: '0.1',
                      gasEstimate: '150000',
                      route: [],
                      timestamp: Date.now()
                  });
              }
          } catch (error) {
              console.error(error);
          } finally {
              setLoading(false);
          }
      };

      const timer = setTimeout(getQuote, 500);
      return () => clearTimeout(timer);
  }, [amountIn, tokenIn, tokenOut]);

  const handleSwap = () => {
      Alert.alert('Swap', `Swapping ${amountIn} ${tokenIn?.symbol} for ~${quote ? parseFloat(quote.amountOut).toFixed(6) : ''} ${tokenOut?.symbol}`);
  };

  const openTokenModal = (type: 'in' | 'out') => {
      setSelectingFor(type);
      setShowTokenModal(true);
  };

  const selectToken = (token: TokenInfo) => {
      if (selectingFor === 'in') {
          if (token.address === tokenOut?.address) setTokenOut(tokenIn);
          setTokenIn(token);
      } else {
          if (token.address === tokenIn?.address) setTokenIn(tokenOut);
          setTokenOut(token);
      }
      setShowTokenModal(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Swap</Text>
        
        <View style={styles.swapCard}>
            <View style={styles.inputRow}>
                <TextInput
                    style={styles.input}
                    placeholder="0.0"
                    keyboardType="decimal-pad"
                    value={amountIn}
                    onChangeText={setAmountIn}
                />
                <TouchableOpacity style={styles.tokenSelect} onPress={() => openTokenModal('in')}>
                    <Text style={styles.tokenText}>{tokenIn?.symbol || 'Select'}</Text>
                </TouchableOpacity>
            </View>
            <Text style={styles.balanceText}>Balance: 0.00</Text>
        </View>

        <View style={styles.arrowContainer}>
            <TouchableOpacity onPress={() => {const tmp = tokenIn; setTokenIn(tokenOut); setTokenOut(tmp);}}>
                <Text style={styles.arrow}>↓</Text>
            </TouchableOpacity>
        </View>

        <View style={styles.swapCard}>
            <View style={styles.inputRow}>
                <Text style={[styles.input, {color: '#666'}]}>
                    {loading ? '...' : quote ? parseFloat(quote.amountOut).toFixed(6) : '0.0'}
                </Text>
                <TouchableOpacity style={styles.tokenSelect} onPress={() => openTokenModal('out')}>
                    <Text style={styles.tokenText}>{tokenOut?.symbol || 'Select'}</Text>
                </TouchableOpacity>
            </View>
            <Text style={styles.balanceText}>Balance: 0.00</Text>
        </View>

        {quote && (
            <View style={styles.quoteInfo}>
                <Text style={styles.infoText}>Rate: 1 {tokenIn?.symbol} ≈ {(parseFloat(quote.amountOut)/parseFloat(amountIn || '1')).toFixed(4)} {tokenOut?.symbol}</Text>
                <Text style={styles.infoText}>Price Impact: {quote.priceImpact}%</Text>
            </View>
        )}

        <TouchableOpacity 
            style={[styles.swapButton, (!amountIn || loading) && styles.disabledButton]} 
            onPress={handleSwap}
            disabled={!amountIn || loading}
        >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.swapButtonText}>Review Swap</Text>}
        </TouchableOpacity>
      </View>

      {/* Token Selection Modal */}
      <Modal visible={showTokenModal} animationType="slide">
          <SafeAreaView style={{flex: 1}}>
              <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select a token</Text>
                  <TouchableOpacity onPress={() => setShowTokenModal(false)}>
                      <Text style={styles.closeModal}>Close</Text>
                  </TouchableOpacity>
              </View>
              <FlatList
                data={popularTokens}
                keyExtractor={(item) => item.address}
                renderItem={({item}) => (
                    <TouchableOpacity style={styles.tokenItem} onPress={() => selectToken(item)}>
                        <View>
                            <Text style={styles.tokenItemSymbol}>{item.symbol}</Text>
                            <Text style={styles.tokenItemName}>{item.name}</Text>
                        </View>
                        <Text style={styles.tokenItemAddress}>{item.address.slice(0,6)}...{item.address.slice(-4)}</Text>
                    </TouchableOpacity>
                )}
              />
          </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  swapCard: {
      backgroundColor: '#f9f9f9',
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: '#eee'
  },
  inputRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  input: { fontSize: 32, fontWeight: '600', flex: 1 },
  tokenSelect: { backgroundColor: '#fff', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#ddd' },
  tokenText: { fontWeight: 'bold', fontSize: 16 },
  balanceText: { color: '#999', marginTop: 10, fontSize: 14 },
  arrowContainer: { alignItems: 'center', marginVertical: -15, zIndex: 1 },
  arrow: { fontSize: 24, backgroundColor: '#fff', width: 40, height: 40, textAlign: 'center', lineHeight: 40, borderRadius: 20, borderWidth: 1, borderColor: '#eee', overflow: 'hidden' },
  quoteInfo: { marginTop: 20, padding: 15, backgroundColor: '#f0f8ff', borderRadius: 15 },
  infoText: { color: '#007AFF', marginBottom: 5 },
  swapButton: { backgroundColor: '#007AFF', padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 30 },
  disabledButton: { backgroundColor: '#ccc' },
  swapButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  closeModal: { color: '#007AFF', fontSize: 16 },
  tokenItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  tokenItemSymbol: { fontSize: 18, fontWeight: 'bold' },
  tokenItemName: { fontSize: 14, color: '#666' },
  tokenItemAddress: { color: '#999', fontSize: 12 }
});


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  swapCard: {
      backgroundColor: '#f9f9f9',
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: '#eee'
  },
  inputRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  input: { fontSize: 32, fontWeight: '600', flex: 1 },
  tokenSelect: { backgroundColor: '#fff', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#ddd' },
  tokenText: { fontWeight: 'bold', fontSize: 16 },
  balanceText: { color: '#999', marginTop: 10, fontSize: 14 },
  arrowContainer: { alignItems: 'center', marginVertical: -15, zIndex: 1 },
  arrow: { fontSize: 24, backgroundColor: '#fff', width: 40, height: 40, textAlign: 'center', lineHeight: 40, borderRadius: 20, borderWidth: 1, borderColor: '#eee', overflow: 'hidden' },
  quoteInfo: { marginTop: 20, padding: 15, backgroundColor: '#f0f8ff', borderRadius: 15 },
  infoText: { color: '#007AFF', marginBottom: 5 },
  swapButton: { backgroundColor: '#007AFF', padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 30 },
  disabledButton: { backgroundColor: '#ccc' },
  swapButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 18 }
});
