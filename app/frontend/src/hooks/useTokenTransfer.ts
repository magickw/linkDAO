import { useCallback, useState } from 'react';
import { useSendTransaction, useWriteContract, useChainId, useAccount, useConfig } from 'wagmi';
import { parseUnits, encodeFunctionData } from 'viem';
import { SecureKeyStorage } from '../security/secureKeyStorage';
import { localWalletTransactionService } from '../services/localWalletTransactionService';
import { pendingTransactionService } from '../services/pendingTransactionService';

const ERC20_TRANSFER_ABI = [
    {
        name: 'transfer',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' }
        ],
        outputs: [{ name: '', type: 'bool' }]
    }
] as const;

interface TransferOptions {
    tokenAddress?: string; // If undefined/null/empty, assumes Native Token (ETH)
    tokenSymbol?: string; // Optional symbol for display/tracking
    recipient: string;
    amount: string;
    decimals?: number;
    chainId?: number; // Optional chain ID, defaults to current connected chain
    password?: string; // Optional password for local wallet
}

export function useTokenTransfer() {
    const currentChainId = useChainId();
    const { address } = useAccount();
    const config = useConfig();
    const [isPending, setIsPending] = useState(false);
    const [txHash, setTxHash] = useState<`0x${string}` | null>(null);

    // Native ETH Transfer
    const {
        sendTransactionAsync,
        isPending: isNativePending
    } = useSendTransaction();

    // ERC20 Transfer
    const {
        writeContractAsync,
        isPending: isErc20Pending
    } = useWriteContract();

    const transfer = useCallback(async ({ tokenAddress, tokenSymbol, recipient, amount, decimals = 18, chainId, password }: TransferOptions & { chainId?: number, password?: string }) => {
        setIsPending(true);
        setTxHash(null);

        try {
            // Validate recipient
            if (!recipient || !recipient.match(/^0x[a-fA-F0-9]{40}$/)) {
                throw new Error('Invalid recipient address');
            }

            // Parse amount
            const amountBigInt = parseUnits(amount, decimals);

            // Check if Native Token (ETH)
            const isNative = !tokenAddress ||
                tokenAddress === '0x0000000000000000000000000000000000000000' ||
                tokenAddress.toLowerCase() === 'eth';

            const activeLocalWallet = SecureKeyStorage.getActiveWallet();

            // Local Wallet Transaction
            if (activeLocalWallet && password) {
                const targetChainId = chainId || currentChainId;
                let data = '0x';
                let to = recipient;
                let value = amountBigInt;

                if (!isNative) {
                    // ERC20 Transfer
                    to = tokenAddress!;
                    value = 0n;
                    data = encodeFunctionData({
                        abi: ERC20_TRANSFER_ABI,
                        functionName: 'transfer',
                        args: [recipient as `0x${string}`, amountBigInt]
                    });
                }

                const result = await localWalletTransactionService.sendTransaction({
                    to,
                    value,
                    data,
                    chainId: targetChainId,
                    walletAddress: activeLocalWallet,
                    password
                });

                if (!result.success) {
                    throw new Error(result.error || 'Transaction failed');
                }

                const hash = result.hash as `0x${string}`;
                setTxHash(hash);

                // Register pending transaction
                pendingTransactionService.addTransaction({
                    hash,
                    type: 'send',
                    amount,
                    token: tokenSymbol || (isNative ? 'ETH' : 'ERC20'),
                    from: activeLocalWallet,
                    to: recipient,
                    chainId: targetChainId
                });

                return hash;
            }

            // Wagmi Transaction (Injected Wallet)
            let hash: `0x${string}`;

            if (isNative) {
                hash = await sendTransactionAsync({
                    to: recipient as `0x${string}`,
                    value: amountBigInt,
                    chainId: chainId  // Use the specified chainId if provided
                });
            } else {
                // For ERC20 transfers on a different chain, we need to get the correct chain config
                const targetChainId = chainId || currentChainId;
                
                hash = await writeContractAsync({
                    address: tokenAddress as `0x${string}`,
                    abi: ERC20_TRANSFER_ABI,
                    functionName: 'transfer',
                    args: [recipient as `0x${string}`, amountBigInt],
                    chain: chainId ? config.chains.find(c => c.id === chainId) : undefined,  // Use specified chain if provided
                    account: address
                });
            }

            setTxHash(hash);

            // Register pending transaction
            if (address) {
                pendingTransactionService.addTransaction({
                    hash,
                    type: 'send',
                    amount,
                    token: tokenSymbol || (isNative ? 'ETH' : 'ERC20'),
                    from: address,
                    to: recipient,
                    chainId: chainId || currentChainId
                });
            }

            return hash;
        } catch (error) {
            console.error('Transfer failed:', error);
            throw error;
        } finally {
            setIsPending(false);
        }
    }, [currentChainId, config.chains, address, sendTransactionAsync, writeContractAsync]);

    return {
        transfer,
        isPending: isPending || isNativePending || isErc20Pending,
        txHash
    };
}
