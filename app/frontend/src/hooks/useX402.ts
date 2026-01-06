import { x402Client, wrapFetchWithPayment } from '@x402/fetch';
import { registerExactEvmScheme } from '@x402/evm/exact/client';
import { useWalletClient } from 'wagmi';
import { useMemo } from 'react';

/**
 * Hook to get an x402-enabled fetch function.
 * Wraps standard fetch to handle 402 Payment Required responses automatically.
 */
export function useX402() {
    const { data: walletClient } = useWalletClient();

    const fetchWithAuth = useMemo(() => {
        // If no wallet is connected, return standard fetch (will fail on 402 but won't crash)
        if (!walletClient) {
            return async (input: RequestInfo | URL, init?: RequestInit) => {
                const response = await fetch(input, init);
                if (response.status === 402) {
                    throw new Error('Payment Required: Please connect your wallet to pay.');
                }
                return response;
            };
        }

        const client = new x402Client();

        // Register EVM Scheme with the connected wallet
        // wagmi walletClient is a viem Client, which is compatible
        registerExactEvmScheme(client, { signer: walletClient as any });

        // Wrap fetch
        return wrapFetchWithPayment(fetch, client);
    }, [walletClient]);

    return { fetchWithAuth };
}
