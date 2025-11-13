import React, { useState, useEffect } from 'react';

interface AuctionTimerProps {
  endTime: string;
  className?: string;
}

export const AuctionTimer: React.FC<AuctionTimerProps> = ({ endTime, className = '' }) => {
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isEnded, setIsEnded] = useState<boolean>(false);

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const end = new Date(endTime);
      const now = new Date();
      const diff = end.getTime() - now.getTime();

      if (diff <= 0) {
        setIsEnded(true);
        return 'Ended';
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        return `${days}d ${hours}h`;
      } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
      } else {
        return `${seconds}s`;
      }
    };

    setTimeRemaining(calculateTimeRemaining());
    const timer = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining());
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime]);

  return (
    <div className={`text-sm font-medium ${className} ${isEnded ? 'text-red-400' : 'text-white'}`}>
      {timeRemaining}
    </div>
  );
};

export default AuctionTimer;