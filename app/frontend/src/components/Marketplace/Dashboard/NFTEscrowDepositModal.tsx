/**
 * NFT Escrow Deposit Modal Component
 * Allows sellers to deposit their NFT into escrow for atomic swap
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Address } from 'viem';
import { useAccount } from 'wagmi';
import { Button, GlassPanel, LoadingSkeleton } from '../../../design-system';
import { useNFTEscrow, NFTStandard, NFTEscrowStep } from '../../../hooks/useNFTEscrow';
import { SellerOrder } from '../../../types/seller';

interface NFTEscrowDepositModalProps {
    order: SellerOrder;
    onClose: () => void;
    onSuccess?: () => void;
}

export const NFTEscrowDepositModal: React.FC<NFTEscrowDepositModalProps> = ({
    order,
    onClose,
    onSuccess
}) => {
    const { address: walletAddress } = useAccount();
    const {
        state,
        isNFTApproved,
        escrowDetails,
        approveNFT,
        depositNFT,
        checkNFTApproval,
        loadEscrowDetails,
        reset
    } = useNFTEscrow();

    const [step, setStep] = useState<'loading' | 'approve' | 'deposit' | 'success' | 'error'>('loading');

    // Parse NFT details from order
    const nftContractAddress = order.nftContractAddress as Address | undefined;
    const nftTokenId = order.nftTokenId ? BigInt(order.nftTokenId) : undefined;
    const nftStandard = order.nftStandard === 'ERC721' ? NFTStandard.ERC721 : NFTStandard.ERC1155;
    const escrowId = order.nftEscrowId ? BigInt(order.nftEscrowId) : undefined;

    // Load escrow details and check approval on mount
    useEffect(() => {
        const init = async () => {
            if (!nftContractAddress || !nftTokenId || !walletAddress || !escrowId) {
                setStep('error');
                return;
            }

            try {
                // Load escrow details
                await loadEscrowDetails(escrowId);

                // Check if NFT is already approved
                const approved = await checkNFTApproval(
                    nftContractAddress,
                    nftTokenId,
                    nftStandard,
                    walletAddress
                );

                setStep(approved ? 'deposit' : 'approve');
            } catch (error) {
                console.error('Failed to initialize NFT deposit modal:', error);
                setStep('error');
            }
        };

        init();
    }, [nftContractAddress, nftTokenId, walletAddress, escrowId, nftStandard, loadEscrowDetails, checkNFTApproval]);

    // Handle NFT approval
    const handleApprove = async () => {
        if (!nftContractAddress || !nftTokenId) return;

        const hash = await approveNFT(nftContractAddress, nftTokenId, nftStandard);
        if (hash) {
            setStep('deposit');
        }
    };

    // Handle NFT deposit
    const handleDeposit = async () => {
        if (!escrowId) return;

        const hash = await depositNFT(escrowId);
        if (hash) {
            setStep('success');
            onSuccess?.();
        }
    };

    // Handle close
    const handleClose = () => {
        reset();
        onClose();
    };

    // Get NFT item from order
    const nftItem = order.items?.find(item => item.isNFT);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <GlassPanel className="w-full max-w-lg">
                <div className="p-6">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-white">Deposit NFT to Escrow</h2>
                            <p className="text-sm text-gray-400 mt-1">
                                Order #{order.id.slice(0, 8)}
                            </p>
                        </div>
                        <button
                            onClick={handleClose}
                            className="text-gray-400 hover:text-white"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* NFT Preview */}
                    <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
                        <div className="flex items-center gap-4">
                            {nftItem?.image ? (
                                <img
                                    src={nftItem.image}
                                    alt={nftItem.title}
                                    className="w-20 h-20 rounded-lg object-cover"
                                />
                            ) : (
                                <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                            )}
                            <div className="flex-1">
                                <h3 className="font-semibold text-white">{nftItem?.title || 'NFT Item'}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                                        {order.nftStandard || 'ERC721'}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                        Token #{order.nftTokenId?.slice(0, 8)}...
                                    </span>
                                </div>
                                <p className="text-sm text-gray-400 mt-1">
                                    Contract: {order.nftContractAddress?.slice(0, 6)}...{order.nftContractAddress?.slice(-4)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Progress Steps */}
                    <div className="flex items-center justify-center gap-4 mb-6">
                        <div className={`flex items-center gap-2 ${step === 'approve' || step === 'loading' ? 'text-purple-400' : step === 'deposit' || step === 'success' ? 'text-green-400' : 'text-gray-500'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'approve' || step === 'loading' ? 'bg-purple-500/20 border-2 border-purple-400' : step === 'deposit' || step === 'success' ? 'bg-green-500/20 border-2 border-green-400' : 'bg-gray-700 border-2 border-gray-600'}`}>
                                {step === 'deposit' || step === 'success' ? (
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                ) : '1'}
                            </div>
                            <span className="text-sm font-medium">Approve</span>
                        </div>

                        <div className="w-8 h-px bg-gray-600" />

                        <div className={`flex items-center gap-2 ${step === 'deposit' ? 'text-purple-400' : step === 'success' ? 'text-green-400' : 'text-gray-500'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'deposit' ? 'bg-purple-500/20 border-2 border-purple-400' : step === 'success' ? 'bg-green-500/20 border-2 border-green-400' : 'bg-gray-700 border-2 border-gray-600'}`}>
                                {step === 'success' ? (
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                ) : '2'}
                            </div>
                            <span className="text-sm font-medium">Deposit</span>
                        </div>
                    </div>

                    {/* Content based on step */}
                    {step === 'loading' && (
                        <div className="text-center py-8">
                            <LoadingSkeleton className="w-12 h-12 mx-auto rounded-full" />
                            <p className="text-gray-400 mt-4">Loading escrow details...</p>
                        </div>
                    )}

                    {step === 'approve' && (
                        <div className="space-y-4">
                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <svg className="w-5 h-5 text-yellow-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <div>
                                        <h4 className="font-semibold text-yellow-300">Approval Required</h4>
                                        <p className="text-sm text-gray-400 mt-1">
                                            You need to approve the escrow contract to transfer your NFT. This is a one-time approval.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <Button
                                variant="primary"
                                className="w-full"
                                onClick={handleApprove}
                                disabled={state.isLoading}
                            >
                                {state.isLoading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Approving...
                                    </>
                                ) : (
                                    'Approve NFT Transfer'
                                )}
                            </Button>
                        </div>
                    )}

                    {step === 'deposit' && (
                        <div className="space-y-4">
                            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <svg className="w-5 h-5 text-purple-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div>
                                        <h4 className="font-semibold text-purple-300">Ready to Deposit</h4>
                                        <p className="text-sm text-gray-400 mt-1">
                                            Your NFT is approved. Deposit it into escrow to enable the atomic swap.
                                            The buyer's payment will be released to you once they confirm receipt.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-800/50 rounded-lg p-4">
                                <h4 className="text-sm font-semibold text-gray-300 mb-2">How it works:</h4>
                                <ol className="text-sm text-gray-400 space-y-2">
                                    <li className="flex items-start gap-2">
                                        <span className="text-purple-400">1.</span>
                                        <span>Your NFT is transferred to the escrow contract</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-purple-400">2.</span>
                                        <span>When the buyer confirms receipt, the NFT transfers to them</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-purple-400">3.</span>
                                        <span>Payment is automatically released to your wallet</span>
                                    </li>
                                </ol>
                            </div>

                            <Button
                                variant="primary"
                                className="w-full"
                                onClick={handleDeposit}
                                disabled={state.isLoading}
                            >
                                {state.isLoading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Depositing NFT...
                                    </>
                                ) : (
                                    'Deposit NFT to Escrow'
                                )}
                            </Button>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">NFT Deposited!</h3>
                            <p className="text-gray-400 mb-6">
                                Your NFT is now securely held in escrow. Once the buyer confirms receipt,
                                the payment will be released to your wallet.
                            </p>
                            <Button variant="secondary" onClick={handleClose}>
                                Close
                            </Button>
                        </div>
                    )}

                    {step === 'error' && (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">Something went wrong</h3>
                            <p className="text-gray-400 mb-6">
                                {state.error || 'Unable to load escrow details. Please try again.'}
                            </p>
                            <div className="flex gap-2 justify-center">
                                <Button variant="secondary" onClick={handleClose}>
                                    Close
                                </Button>
                                <Button variant="primary" onClick={() => setStep('loading')}>
                                    Retry
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </GlassPanel>
        </div>
    );
};

export default NFTEscrowDepositModal;
