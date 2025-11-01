import React from 'react';
import { EscrowInfo, EscrowStatus as EscrowStatusEnum } from '@/types/payment';
import { Button } from '@/design-system/components/Button';
import { useCryptoPayment } from '@/hooks/useCryptoPayment';
import { useChainId } from 'wagmi';

interface EscrowStatusProps {
  escrowInfo: EscrowInfo;
  escrowId: number;
}

const EscrowStatus: React.FC<EscrowStatusProps> = ({ escrowInfo, escrowId }) => {
  const { releaseFromEscrow, refundFromEscrow } = useCryptoPayment();
  const chainId = useChainId();

  const handleRelease = async () => {
    if (releaseFromEscrow) {
      await releaseFromEscrow(escrowId, chainId);
    }
  };

  const handleRefund = async () => {
    if (refundFromEscrow) {
      await refundFromEscrow(escrowId, chainId);
    }
  };

  return (
    <div className="p-4 border border-gray-700 rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Escrow Details</h3>
      <p>Status: {escrowInfo.status}</p>
      <p>Arbiter: {escrowInfo.arbiter}</p>
      <div className="mt-4 flex gap-4">
        {escrowInfo.status === EscrowStatusEnum.FUNDED && (
          <Button onClick={handleRelease}>Release Funds</Button>
        )}
        {escrowInfo.status === EscrowStatusEnum.FUNDED && (
          <Button onClick={handleRefund} variant="secondary">
            Request Refund
          </Button>
        )}
      </div>
    </div>
  );
};

export default EscrowStatus;
