import React, { useState, useEffect, useCallback } from 'react';
import { motion, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';

export type CursorType = 'default' | 'pointer' | 'buy' | 'nft' | 'tip' | 'text' | 'zoom';

/**
 * Custom Cursor Component
 * A premium, state-aware cursor that follows the mouse and reacts to interactive elements
 */
export const CustomCursor: React.FC = () => {
  const [cursorType, setCursorType] = useState<CursorType>('default');
  const [isVisible, setIsLoading] = useState(false);

  // Mouse position
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  // Smooth springs for fluid movement
  const springConfig = { damping: 25, stiffness: 250 };
  const cursorX = useSpring(mouseX, springConfig);
  const cursorY = useSpring(mouseY, springConfig);

  const onMouseMove = useCallback((e: MouseEvent) => {
    mouseX.set(e.clientX);
    mouseY.set(e.clientY);
    if (!isVisible) setIsLoading(true);
  }, [mouseX, mouseY, isVisible]);

  const onMouseLeave = useCallback(() => {
    setIsLoading(false);
  }, []);

  const onMouseEnter = useCallback(() => {
    setIsLoading(true);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('mouseenter', onMouseEnter);

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      // Check for data-cursor attribute
      const dataCursor = target.closest('[data-cursor]')?.getAttribute('data-cursor') as CursorType;
      if (dataCursor) {
        setCursorType(dataCursor);
        return;
      }

      // Default logic for common elements
      if (target.closest('button') || target.closest('a') || target.closest('[role="button"]')) {
        setCursorType('pointer');
      } else if (target.closest('input') || target.closest('textarea') || target.isContentEditable) {
        setCursorType('text');
      } else if (target.closest('.cursor-zoom-in')) {
        setCursorType('zoom');
      } else {
        setCursorType('default');
      }
    };

    window.addEventListener('mouseover', handleMouseOver);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener('mouseenter', onMouseEnter);
      window.removeEventListener('mouseover', handleMouseOver);
    };
  }, [onMouseMove, onMouseLeave, onMouseEnter]);

  // Size and style mapping
  const cursorVariants = {
    default: {
      width: 12,
      height: 12,
      backgroundColor: 'rgba(59, 130, 246, 0.8)', // Primary blue
      borderRadius: '50%',
    },
    pointer: {
      width: 48,
      height: 48,
      backgroundColor: 'rgba(59, 130, 246, 0.2)',
      border: '1px solid rgba(59, 130, 246, 0.5)',
      borderRadius: '50%',
    },
    buy: {
      width: 80,
      height: 80,
      backgroundColor: 'rgba(16, 185, 129, 0.3)', // Green
      border: '2px solid rgba(16, 185, 129, 0.6)',
      borderRadius: '50%',
    },
    nft: {
      width: 100,
      height: 100,
      backgroundColor: 'rgba(139, 92, 246, 0.2)', // Purple
      border: '2px solid rgba(139, 92, 246, 0.5)',
      borderRadius: '24px',
    },
    tip: {
      width: 64,
      height: 64,
      backgroundColor: 'rgba(245, 158, 11, 0.3)', // Amber
      border: '2px solid rgba(245, 158, 11, 0.6)',
      borderRadius: '50%',
    },
    text: {
      width: 4,
      height: 24,
      backgroundColor: 'rgba(59, 130, 246, 1)',
      borderRadius: '2px',
    },
    zoom: {
      width: 60,
      height: 60,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      border: '1px solid rgba(255, 255, 255, 0.5)',
      backdropFilter: 'blur(4px)',
      borderRadius: '50%',
    }
  };

  const currentVariant = cursorVariants[cursorType] || cursorVariants.default;

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Main Inner Dot */}
          <motion.div
            className="fixed pointer-events-none z-[9999] mix-blend-difference hidden lg:block"
            style={{
              x: mouseX,
              y: mouseY,
              translateX: '-50%',
              translateY: '-50%',
              width: 6,
              height: 6,
              backgroundColor: '#fff',
              borderRadius: '50%',
            }}
          />

          {/* Exterior Ring / Effect */}
          <motion.div
            className="fixed pointer-events-none z-[9998] hidden lg:flex items-center justify-center overflow-hidden"
            animate={{
              width: currentVariant.width,
              height: currentVariant.height,
              backgroundColor: currentVariant.backgroundColor,
              border: currentVariant.border || 'none',
              borderRadius: currentVariant.borderRadius,
              opacity: 1,
            }}
            initial={{ opacity: 0, width: 0, height: 0 }}
            exit={{ opacity: 0, scale: 0 }}
            style={{
              x: cursorX,
              y: cursorY,
              translateX: '-50%',
              translateY: '-50%',
              backdropFilter: cursorType === 'zoom' ? 'blur(4px)' : 'none',
            }}
          >
            <AnimatePresence mode="wait">
              {cursorType === 'buy' && (
                <motion.span
                  key="buy"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  className="text-white text-xs font-bold uppercase tracking-tighter"
                >
                  Buy
                </motion.span>
              )}
              {cursorType === 'nft' && (
                <motion.span
                  key="nft"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-white text-xs font-bold"
                >
                  VIEW NFT
                </motion.span>
              )}
              {cursorType === 'tip' && (
                <motion.span
                  key="tip"
                  initial={{ rotate: -45, scale: 0 }}
                  animate={{ rotate: 0, scale: 1.2 }}
                  exit={{ rotate: 45, scale: 0 }}
                  className="text-white text-lg"
                >
                  ⚡
                </motion.span>
              )}
              {cursorType === 'zoom' && (
                <motion.span
                  key="zoom"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-white text-lg"
                >
                  🔍
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CustomCursor;
