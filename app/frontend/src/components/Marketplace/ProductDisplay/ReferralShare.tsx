import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { Share2, Copy, Check, Gift } from 'lucide-react';
import { referralService } from '@/services/referralService';
import { Button } from '@/design-system/components/Button';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { useToast } from '@/context/ToastContext';

interface ReferralShareProps {
  productTitle: string;
  className?: string;
}

export const ReferralShare: React.FC<ReferralShareProps> = ({
  productTitle,
  className = '',
}) => {
  const { address, isConnected } = useAccount();
  const { addToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleShare = async () => {
    let shareUrl = window.location.href;

    if (isConnected && address) {
      setIsGenerating(true);
      try {
        const result = await referralService.generateReferralCode(address);
        if (result.success && result.referralCode) {
          // Append ref code to current product URL
          const url = new URL(window.location.href);
          url.searchParams.set('ref', result.referralCode);
          shareUrl = url.toString();
        }
      } catch (error) {
        console.warn('Failed to generate referral code for share:', error);
      } finally {
        setIsGenerating(false);
      }
    }

    try {
      if (navigator.share) {
        await navigator.share({
          title: productTitle,
          text: `Check out this product on LinkDAO: ${productTitle}`,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        addToast('Link copied with your referral code!', 'success');
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <GlassPanel variant="secondary" className={`p-4 bg-blue-600/10 border-blue-500/30 ${className}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <Gift size={20} className="text-blue-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Share & Earn</h4>
            <p className="text-xs text-white/60">Earn LDAO tokens for successful referrals</p>
          </div>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={handleShare}
          disabled={isGenerating}
          className="flex items-center gap-2"
        >
          {isGenerating ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : copied ? (
            <Check size={16} />
          ) : (
            <Share2 size={16} />
          )}
          {copied ? 'Copied!' : 'Share Link'}
        </Button>
      </div>
    </GlassPanel>
  );
};
