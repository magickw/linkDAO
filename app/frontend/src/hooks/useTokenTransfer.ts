import { useCallback, useState } from 'react';
import { useSendTransaction, useWriteContract, useChainId, useAccount, useConfig } from 'wagmi';
import { parseUnits } from 'viem';

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
    recipient: string;
    amount: string;
    decimals?: number;
    chainId?: number; // Optional chain ID, defaults to current connected chain
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

    const transfer = useCallback(async ({ tokenAddress, recipient, amount, decimals = 18, chainId }: TransferOptions & { chainId?: number }) => {
        setIsPending(true);
        setTxHash(null);

        try {
            // Validate recipient
            if (!recipient || !recipient.match(/^0x[a-fA-F0-9]{40}$/)) {
                throw new Error('Invalid recipient address');
            }

            // Parse amount
            const amountBigInt = parseUnits(amount, decimals);

            let hash: `0x${string}`;

            // Check if Native Token (ETH)
            const isNative = !tokenAddress ||
                tokenAddress === '0x0000000000000000000000000000000000000000' ||
                tokenAddress.toLowerCase() === 'eth';

            if (isNative) {
                hash = await sendTransactionAsync({
                    to: recipient as `0x${string}`,
                    value: amountBigInt,
                    chainId: chainId  // Use the specified chainId if provided
                });
            } else {
                // For ERC20 transfers on a different chain, we need to get the correct chain config
                const targetChainId = chainId || currentChainId;
                const targetChain = config.chains.find(c => c.id === targetChainId);
                
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
