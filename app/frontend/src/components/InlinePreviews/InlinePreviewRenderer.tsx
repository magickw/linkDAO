// Mock Inline Preview Renderer for testing
import React from 'react';

interface InlinePreviewRendererProps {
  preview: any;
  className?: string;
}

export const InlinePreviewRenderer: React.FC<InlinePreviewRendererProps> = ({
  preview,
  className
}) => {
  return (
    <div data-testid="inline-preview-renderer" className={className}>
      <h3>{preview.title}</h3>
      <p>{preview.description}</p>
      {preview.image && <img src={preview.image} alt={preview.title} />}
    </div>
  );
};