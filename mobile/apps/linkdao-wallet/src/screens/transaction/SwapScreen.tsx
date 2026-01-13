import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { dexService, SwapQuoteResult, Token } from '@linkdao/shared/services/dexService';
import { SecureKeyStorage } from '@linkdao/shared/utils/secureKeyStorage';

export default function SwapScreen() {
  const [amountIn, setAmountIn] = useState('');
  const [tokenIn, setTokenIn] = useState('ETH');
  const [tokenOut, setTokenOut] = useState('USDC');
  const [quote, setQuote] = useState<SwapQuoteResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Mock token list - in real app fetch from dexService.getPopularTokens
  const tokens = ['ETH', 'USDC', 'DAI', 'WBTC'];

  useEffect(() => {
      const getQuote = async () => {
          if (!amountIn || parseFloat(amountIn) <= 0) return;
          
          setLoading(true);
          try {
              // Real implementation would look up addresses from token list
              // Mocking addresses for now
              const tokenInAddr = tokenIn === 'ETH' ? '0x0000000000000000000000000000000000000000' : '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
              const tokenOutAddr = tokenOut === 'USDC' ? '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' : '0x0000000000000000000000000000000000000000';

              const quoteResult = await dexService.getSwapQuote({
                  tokenInAddress: tokenInAddr,
                  tokenOutAddress: tokenOutAddr,
                  amountIn: parseFloat(amountIn),
                  slippageTolerance: 0.5
              });

              if (quoteResult?.data?.quote) {
                  setQuote(quoteResult.data.quote);
              } else {
                  // Fallback for demo if API fails/is disabled
                  setQuote({
                      amountIn: amountIn,
                      amountOut: (parseFloat(amountIn) * 3000).toString(), // Mock rate
                      priceImpact: '0.1',
                      gasEstimate: '21000',
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
      Alert.alert('Swap', `Swapping ${amountIn} ${tokenIn} for ~${quote?.amountOut} ${tokenOut}`);
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
                <TouchableOpacity style={styles.tokenSelect}>
                    <Text style={styles.tokenText}>{tokenIn}</Text>
                </TouchableOpacity>
            </View>
            <Text style={styles.balanceText}>Balance: 0.00</Text>
        </View>

        <View style={styles.arrowContainer}>
            <Text style={styles.arrow}>↓</Text>
        </View>

        <View style={styles.swapCard}>
            <View style={styles.inputRow}>
                <Text style={[styles.input, {color: '#666'}]}>
                    {loading ? '...' : quote ? parseFloat(quote.amountOut).toFixed(6) : '0.0'}
                </Text>
                <TouchableOpacity style={styles.tokenSelect}>
                    <Text style={styles.tokenText}>{tokenOut}</Text>
                </TouchableOpacity>
            </View>
            <Text style={styles.balanceText}>Balance: 0.00</Text>
        </View>

        {quote && (
            <View style={styles.quoteInfo}>
                <Text style={styles.infoText}>Rate: 1 {tokenIn} ≈ {(parseFloat(quote.amountOut)/parseFloat(amountIn || '1')).toFixed(2)} {tokenOut}</Text>
                <Text style={styles.infoText}>Gas: ~${(parseFloat(quote.gasEstimate) * 0.000000001 * 2000).toFixed(2)}</Text>
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
  swapButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 18 }
});
