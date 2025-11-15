import React from 'react';
import AdvancedRichTextEditor from './AdvancedRichTextEditor';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  showPreview?: boolean;
  disabled?: boolean;
  className?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Share your thoughts...',
  showPreview = false, // Note: showPreview is not used in the advanced editor since it's always WYSIWYG
  disabled = false,
  className = ''
}) => {
  return (
    <AdvancedRichTextEditor
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
    />
  );
};

export default RichTextEditor;