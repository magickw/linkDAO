  // Fetch wallet data
  const fetchWalletData = useCallback(async () => {
    if (!address) return;

    try {
      setIsLoadingBalance(true);
      setError(null);

      // Get wallet data from wallet service
      const walletServiceInstance = new walletService.WalletService(chainId);
      const walletData = await walletServiceInstance.getWalletData(address as `0x${string}`);

      // Discover additional tokens the user might hold
      let discoveredTokens: any[] = [];
      try {
        discoveredTokens = await dexService.discoverTokens(address, chainId);
      } catch (err) {
        console.warn('Failed to discover tokens:', err);
      }

      // Merge discovered tokens with existing balances
      const allTokens = [...walletData.tokens];
      for (const discoveredToken of discoveredTokens) {
        // Only add if not already in the list
        if (!allTokens.some(t => t.symbol === discoveredToken.symbol)) {
          // Create a minimal token balance object for discovered tokens
          allTokens.push({
            symbol: discoveredToken.symbol,
            name: discoveredToken.name,
            balance: 0, // We don't know the balance, will be updated if user has it
            valueUSD: 0,
            change24h: 0,
            contractAddress: discoveredToken.address,
            chains: [chainId]
          });
        }
      }

      // Sort tokens by value
      const sortedTokens = allTokens.sort((a, b) => b.valueUSD - a.valueUSD);

      // Get recent transactions with USD values
      let recentTransactions = walletData.transactions;
      try {
        // Fetch recent transactions via explorer APIs when enabled
        let recentTransactions: any[] = [];
        if (enableTransactionHistory) {
          try {
            const cacheKey = `${address}:${maxTransactions}`;
            const cached = txCache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < TX_TTL_MS) {
              recentTransactions = cached.data.map((t) => ({ ...t, timestamp: new Date(t.timestamp) }));
            } else {
              // Determine chains to query: default supported + optional env extension
              const unifiedKey = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY;
              const unifiedBase = 'https://api.etherscan.io/v2/api';
              const defaultChainIds = [1, 8453, 84532, 137, 42161];
              const extraChainIds = (process.env.NEXT_PUBLIC_EXPLORER_CHAIN_IDS || '')
                .split(',')
                .map((s) => parseInt(s.trim(), 10))
                .filter((n) => Number.isFinite(n) && !defaultChainIds.includes(n));
              const chainIdsToQuery = [...defaultChainIds, ...extraChainIds];
              const nativeSymbolFor = (cid: number) => (cid === 137 ? 'MATIC' : 'ETH');

            if (unifiedKey) {
              // Use unified v2 endpoint for both native and token transfers
              const fetchNative = chainIdsToQuery.map(async (chainId) => {
                try {
                  const url = new URL(unifiedBase);
                  url.searchParams.set('chainid', String(chainId));
                  url.searchParams.set('module', 'account');
                  url.searchParams.set('action', 'txlist');
                  url.searchParams.set('address', address as string);
                  url.searchParams.set('sort', 'desc');
                  url.searchParams.set('apikey', unifiedKey);
                  const res = await fetch(url.toString());
                  const data = await res.json().catch(() => ({ status: '0', result: [] }));
                  if (data && data.status !== '0' && Array.isArray(data.result)) {
                    return data.result.slice(0, maxTransactions).map((tx: any) => {
                      const valueWei = BigInt(tx.value || '0');
                      const amount = Number(valueWei) / 1e18;
                      const isSend = (tx.from || '').toLowerCase() === (address as string).toLowerCase();
                      return {
                        id: `${chainId}_${tx.hash}`,
                        type: isSend ? 'send' : 'receive',
                        amount,
                        token: nativeSymbolFor(chainId),
                        valueUSD: undefined,
                        timestamp: new Date((Number(tx.timeStamp) || 0) * 1000),
                        status: Number(tx.confirmations || 0) > 0 ? 'confirmed' : 'pending',
                        hash: tx.hash,
                        chainId,
                      };
                    });
                  }
                } catch (_) {}
                return [];
              });

              const fetchErc20 = chainIdsToQuery.map(async (chainId) => {
                try {
                  const url = new URL(unifiedBase);
                  url.searchParams.set('chainid', String(chainId));
                  url.searchParams.set('module', 'account');
                  url.searchParams.set('action', 'tokentx');
                  url.searchParams.set('address', address as string);
                  url.searchParams.set('sort', 'desc');
                  url.searchParams.set('apikey', unifiedKey);
                  const res = await fetch(url.toString());
                  const data = await res.json().catch(() => ({ status: '0', result: [] }));
                  if (data && data.status !== '0' && Array.isArray(data.result)) {
                    return data.result.slice(0, maxTransactions).map((tx: any) => {
                      const decimals = Number(tx.tokenDecimal || 18);
                      const raw = tx.value || '0';
                      const amount = Number(raw) / Math.pow(10, decimals);
                      const isSend = (tx.from || '').toLowerCase() === (address as string).toLowerCase();
                      const symbol = (tx.tokenSymbol || '').toUpperCase();
                      return {
                        id: `${chainId}_${tx.hash}_${tx.contractAddress}`,
                        type: isSend ? 'send' : 'receive',
                        amount,
                        token: symbol,
                        valueUSD: undefined,
                        timestamp: new Date((Number(tx.timeStamp) || 0) * 1000),
                        status: Number(tx.confirmations || 0) > 0 ? 'confirmed' : 'pending',
                        hash: tx.hash,
                        chainId,
                        from: tx.from,
                        to: tx.to || (isSend ? tx.to : address),
                      };
                    });
                  }
                } catch (_) {}
                return [];
              });

              const [perChainNative, perChainErc20] = await Promise.all([Promise.all(fetchNative), Promise.all(fetchErc20)]);
              recentTransactions = [...perChainNative.flat(), ...perChainErc20.flat()]
                .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                .slice(0, maxTransactions);
            } else {
              // Fallback to previous per-explorer approach if unified key is not set
              const explorerConfigs: Array<{ chainId: number; baseUrl: string; apiKey?: string; nativeSymbol: string }> = [
                { chainId: 1, baseUrl: 'https://api.etherscan.io/api', apiKey: process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY, nativeSymbol: 'ETH' },
                { chainId: 8453, baseUrl: 'https://api.basescan.org/api', apiKey: process.env.NEXT_PUBLIC_BASESCAN_API_KEY, nativeSymbol: 'ETH' },
                { chainId: 84532, baseUrl: 'https://api-sepolia.basescan.org/api', apiKey: process.env.NEXT_PUBLIC_BASESCAN_API_KEY, nativeSymbol: 'ETH' },
                { chainId: 137, baseUrl: 'https://api.polygonscan.com/api', apiKey: process.env.NEXT_PUBLIC_POLYGONSCAN_API_KEY, nativeSymbol: 'MATIC' },
                { chainId: 42161, baseUrl: 'https://api.arbiscan.io/api', apiKey: process.env.NEXT_PUBLIC_ARBISCAN_API_KEY, nativeSymbol: 'ETH' },
              ];

              const fetches = explorerConfigs.map(async ({ chainId, baseUrl, apiKey, nativeSymbol }) => {
                try {
                  const url = new URL(baseUrl);
                  url.searchParams.set('module', 'account');
                  url.searchParams.set('action', 'txlist');
                  url.searchParams.set('address', address as string);
                  url.searchParams.set('sort', 'desc');
                  if (apiKey) url.searchParams.set('apikey', apiKey);
                  const res = await fetch(url.toString());
                  const data = await res.json().catch(() => ({ status: '0', result: [] }));
                  if (data && data.status !== '0' && Array.isArray(data.result)) {
                    return data.result.slice(0, maxTransactions).map((tx: any) => {
                      const valueWei = BigInt(tx.value || '0');
                      const amount = Number(valueWei) / 1e18;
                      const isSend = (tx.from || '').toLowerCase() === (address as string).toLowerCase();
                      return {
                        id: `${chainId}_${tx.hash}`,
                        type: isSend ? 'send' : 'receive',
                        amount,
                        token: nativeSymbol,
                        valueUSD: undefined,
                        timestamp: new Date((Number(tx.timeStamp) || 0) * 1000),
                        status: Number(tx.confirmations || 0) > 0 ? 'confirmed' : 'pending',
                        hash: tx.hash,
                        chainId,
                        from: tx.from,
                        to: tx.to || (isSend ? tx.to : address),
                      };
                    });
                  }
                } catch (_) {}
                return [];
              });

              const erc20Fetches = explorerConfigs.map(async ({ chainId, baseUrl, apiKey }) => {
                try {
                  const url = new URL(baseUrl);
                  url.searchParams.set('module', 'account');
                  url.searchParams.set('action', 'tokentx');
                  url.searchParams.set('address', address as string);
                  url.searchParams.set('sort', 'desc');
                  if (apiKey) url.searchParams.set('apikey', apiKey);
                  const res = await fetch(url.toString());
                  const data = await res.json().catch(() => ({ status: '0', result: [] }));
                  if (data && data.status !== '0' && Array.isArray(data.result)) {
                    return data.result.slice(0, maxTransactions).map((tx: any) => {
                      const decimals = Number(tx.tokenDecimal || 18);
                      const raw = tx.value || '0';
                      const amount = Number(raw) / Math.pow(10, decimals);
                      const isSend = (tx.from || '').toLowerCase() === (address as string).toLowerCase();
                      const symbol = (tx.tokenSymbol || '').toUpperCase();
                      return {
                        id: `${chainId}_${tx.hash}_${tx.contractAddress}`,
                        type: isSend ? 'send' : 'receive',
                        amount,
                        token: symbol,
                        valueUSD: undefined,
                        timestamp: new Date((Number(tx.timeStamp) || 0) * 1000),
                        status: Number(tx.confirmations || 0) > 0 ? 'confirmed' : 'pending',
                        hash: tx.hash,
                        chainId,
                        from: tx.from,
                        to: tx.to || (isSend ? tx.to : address),
                      };
                    });
                  }
                } catch (_) {}
                return [];
              });

              const [perChainNative, perChainErc20] = await Promise.all([Promise.all(fetches), Promise.all(erc20Fetches)]);
              recentTransactions = [...perChainNative.flat(), ...perChainErc20.flat()]
                .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                .slice(0, maxTransactions);
            }

            // Enrich transactions with USD values via price service
            const symbols = Array.from(new Set(recentTransactions.map((t) => String(t.token).toUpperCase()).filter(Boolean)));
            if (symbols.length > 0) {
              const prices = await cryptoPriceService.getPrices(symbols);
              recentTransactions = recentTransactions.map((t) => {
                const pd = prices.get(String(t.token).toUpperCase());
                const usd = pd ? (t.amount || 0) * (pd.current_price || 0) : undefined;
                return { ...t, valueUSD: usd };
              });
            }
            // Cache normalized result (serialize timestamp)
            txCache.set(cacheKey, { data: recentTransactions.map((t) => ({ ...t, timestamp: (t.timestamp as Date).toISOString() })), timestamp: Date.now() });
          } catch (e) {
            // Soft-fail on tx history
            recentTransactions = [];
          }
        } else {
          recentTransactions = [];
        }
      } catch (err) {
        console.warn('Failed to enrich transactions:', err);
      }

      const portfolioValue = sortedTokens.reduce((sum, b) => sum + (b.valueUSD || 0), 0);
      const portfolioChange = sortedTokens.length > 0
        ? sortedTokens.reduce((sum, b) => sum + (b.change24h * (b.valueUSD / (portfolioValue || 1))), 0)
        : 0;

      const data: EnhancedWalletData = {
        address,
        balances: sortedTokens,
        recentTransactions,
        portfolioValue,
        portfolioChange,
        quickActions: [
          {
            id: 'send',
            label: 'Send',
            icon: '📤',
            action: async () => {
              // This will be handled by the UI components
              console.log('Send action triggered');
            },
            tooltip: 'Send tokens to another address'
          },
          {
            id: 'receive',
            label: 'Receive',
            icon: '📥',
            action: async () => {
              // This will be handled by the UI components
              console.log('Receive action triggered');
            },
            tooltip: 'Show receive address and QR code'
          },
          {
            id: 'swap',
            label: 'Swap',
            icon: '🔄',
            action: async () => {
              // This will be handled by the UI components
              console.log('Swap action triggered');
            },
            tooltip: 'Swap tokens on DEX'
          },
          {
            id: 'stake',
            label: 'Stake',
            icon: '🏦',
            action: async () => {
              // This will be handled by the UI components
              console.log('Stake action triggered');
            },
            tooltip: 'Stake tokens to earn rewards'
          }
        ]
      };

      setWalletData(data);
      setLastUpdated(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch wallet data';
      setError(errorMessage);
      console.error('Wallet data fetch error:', err);
    } finally {
      setIsLoadingBalance(false);
    }
  }, [address, chainId, providedChainId, connectedChainId]);