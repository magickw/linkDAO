import React, { useState, useEffect } from 'react';

interface AdvancedRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const AdvancedRichTextEditor: React.FC<AdvancedRichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Share your thoughts...',
  disabled = false,
  className = ''
}) => {
  const [internalValue, setInternalValue] = useState(value);

  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
    onChange(newValue);
  };

  return (
    <div className={`border rounded-lg overflow-hidden ${className}`}>
      <textarea
        value={internalValue}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full p-3 border-none focus:ring-0 focus:outline-none min-h-[150px] resize-none"
        rows={6}
      />
    </div>
  );
};

export default AdvancedRichTextEditor;