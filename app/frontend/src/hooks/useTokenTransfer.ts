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
}

export function useTokenTransfer() {
    const chainId = useChainId();
    const { address } = useAccount();
    const config = useConfig();
    const [isPending, setIsPending] = useState(false);
    const [txHash, setTxHash] = useState<`0x${string}` | null>(null);

    // Get the current chain object from config
    const chain = config.chains.find(c => c.id === chainId);

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

    const transfer = useCallback(async ({ tokenAddress, recipient, amount, decimals = 18 }: TransferOptions) => {
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
                    chainId
                });
            } else {
                // ERC20 Token
                hash = await writeContractAsync({
                    address: tokenAddress as `0x${string}`,
                    abi: ERC20_TRANSFER_ABI,
                    functionName: 'transfer',
                    args: [recipient as `0x${string}`, amountBigInt],
                    chain,
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
    }, [chain, chainId, address, sendTransactionAsync, writeContractAsync]);

    return {
        transfer,
        isPending: isPending || isNativePending || isErc20Pending,
        txHash
    };
}
