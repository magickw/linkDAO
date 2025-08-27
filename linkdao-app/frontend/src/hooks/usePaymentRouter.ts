import { useContractWrite, usePrepareContractWrite, useBalance } from 'wagmi';
import { paymentRouterABI } from '@/lib/abi/PaymentRouterABI';

// Replace with actual contract address after deployment
const CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000';

export function usePaymentRouter() {
  // Prepare ETH payment transaction
  const { config: sendEthConfig } = usePrepareContractWrite({
    address: CONTRACT_ADDRESS,
    abi: paymentRouterABI,
    functionName: 'sendEthPayment',
    args: [
      '0x0000000000000000000000000000000000000000', // to address
      0n, // amount
      '', // memo
    ],
    value: 0n, // ETH value to send
  });

  // Send ETH payment
  const {
    data: sendEthData,
    isLoading: isSendingEth,
    isSuccess: isEthSent,
    write: sendEthPayment,
  } = useContractWrite(sendEthConfig);

  // Prepare token payment transaction
  const { config: sendTokenConfig } = usePrepareContractWrite({
    address: CONTRACT_ADDRESS,
    abi: paymentRouterABI,
    functionName: 'sendTokenPayment',
    args: [
      '0x0000000000000000000000000000000000000000', // token address
      '0x0000000000000000000000000000000000000000', // to address
      0n, // amount
      '', // memo
    ],
  });

  // Send token payment
  const {
    data: sendTokenData,
    isLoading: isSendingToken,
    isSuccess: isTokenSent,
    write: sendTokenPayment,
  } = useContractWrite(sendTokenConfig);

  // Check if token is supported
  const useIsTokenSupported = (tokenAddress: `0x${string}` | undefined) => {
    return useBalance({
      address: CONTRACT_ADDRESS,
      token: tokenAddress,
      watch: true,
    });
  };

  return {
    sendEthPayment,
    isSendingEth,
    isEthSent,
    sendEthData,
    sendTokenPayment,
    isSendingToken,
    isTokenSent,
    sendTokenData,
    useIsTokenSupported,
  };
}