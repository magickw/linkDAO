import React from 'react';

interface GridOverlayProps {
  breakpoint: string;
  cols: number;
  rowHeight: number;
  margin: [number, number];
}

export const GridOverlay: React.FC<GridOverlayProps> = ({
  breakpoint,
  cols,
  rowHeight,
  margin
}) => {
  return (
    <div className="grid-overlay">
      <div className="grid-info">
        <div className="grid-info-content">
          <span className="breakpoint-label">{breakpoint.toUpperCase()}</span>
          <span className="cols-label">{cols} cols</span>
        </div>
      </div>

      <style jsx>{`
        .grid-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          z-index: 1;
          background-image: 
            linear-gradient(to right, rgba(59, 130, 246, 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(59, 130, 246, 0.1) 1px, transparent 1px);
          background-size: calc(100% / ${cols}) ${rowHeight + margin[1]}px;
          opacity: 0.5;
        }

        .grid-info {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 1000;
          pointer-events: auto;
        }

        .grid-info-content {
          background: rgba(59, 130, 246, 0.9);
          color: white;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          display: flex;
          align-items: center;
          space-x: 8px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .breakpoint-label {
          margin-right: 8px;
        }

        .cols-label {
          opacity: 0.8;
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .grid-info {
            top: 10px;
            right: 10px;
          }
          
          .grid-info-content {
            padding: 6px 8px;
            font-size: 11px;
          }
        }
      `}</style>
    </div>
  );
};