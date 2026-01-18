import { x402Client, wrapFetchWithPayment } from '@x402/fetch';
import { registerExactEvmScheme } from '@x402/evm/exact/client';
import { useWalletClient } from 'wagmi';
import { useMemo } from 'react';

// Backend API URL for x402 endpoints
const getApiBaseUrl = (): string => {
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
        return 'https://api.linkdao.io';
    }
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000';
};

/**
 * Resolves a URL to an absolute URL using the backend API base.
 * Handles relative paths like '/api/x402/checkout' -> 'https://api.linkdao.io/api/x402/checkout'
 */
const resolveUrl = (input: RequestInfo | URL): string => {
    const apiBase = getApiBaseUrl();

    if (typeof input === 'string') {
        // If it's already an absolute URL, return as-is
        if (input.startsWith('http://') || input.startsWith('https://')) {
            return input;
        }
        // Relative URL - prepend API base
        return `${apiBase}${input}`;
    }

    if (input instanceof URL) {
        return input.toString();
    }

    // Request object - extract and resolve URL
    if (input instanceof Request) {
        const url = input.url;
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }
        return `${apiBase}${url}`;
    }

    return String(input);
};

/**
 * Hook to get an x402-enabled fetch function.
 * Wraps standard fetch to handle 402 Payment Required responses automatically.
 * Automatically resolves relative URLs to the backend API.
 */
export function useX402() {
    const { data: walletClient } = useWalletClient();

    const fetchWithAuth = useMemo(() => {
        // If no wallet is connected, return standard fetch (will fail on 402 but won't crash)
        if (!walletClient) {
            return async (input: RequestInfo | URL, init?: RequestInit) => {
                const resolvedUrl = resolveUrl(input);
                const response = await fetch(resolvedUrl, init);
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

        // Create a custom fetch that resolves URLs before passing to x402
        const fetchWithResolvedUrl = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
            const resolvedUrl = resolveUrl(input);
            return fetch(resolvedUrl, init);
        };

        // Wrap the URL-resolving fetch with x402 payment handling
        return wrapFetchWithPayment(fetchWithResolvedUrl, client);
    }, [walletClient]);

    return { fetchWithAuth };
}
