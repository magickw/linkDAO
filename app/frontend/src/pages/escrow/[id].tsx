import React from 'react';
import { useRouter } from 'next/router';
import EscrowStatus from '@/components/Escrow/EscrowStatus';
import { useQuery } from '@tanstack/react-query';
import { getEscrowInfo } from '@/services/escrowService';

const EscrowPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const escrowId = Number(id);

  const { data: escrowInfo, isLoading } = useQuery({
    queryKey: ['escrow', escrowId], 
    queryFn: () => getEscrowInfo(escrowId),
    enabled: !!escrowId,
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!escrowInfo) {
    return <div>Escrow not found</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Escrow Details</h1>
      <EscrowStatus escrowInfo={escrowInfo} escrowId={escrowId} />
    </div>
  );
};

export default EscrowPage;
