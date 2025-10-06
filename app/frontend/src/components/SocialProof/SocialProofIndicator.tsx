// Mock Social Proof Indicator for testing
import React from 'react';

interface SocialProofIndicatorProps {
  socialProof: any;
}

const SocialProofIndicator: React.FC<SocialProofIndicatorProps> = ({
  socialProof
}) => {
  return (
    <div data-testid="social-proof-indicator">
      {socialProof.followedUsersWhoEngaged.length > 0 && (
        <span>Liked by {socialProof.followedUsersWhoEngaged.length} people you follow</span>
      )}
    </div>
  );
};

export default SocialProofIndicator;