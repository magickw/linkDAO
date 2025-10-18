import React, { useState, useRef, useCallback } from 'react';
import { Eye, EyeOff, ChevronDown, Check } from 'lucide-react';

interface TouchOptimizedInputProps {
  label: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export const TouchOptimizedInput: React.FC<TouchOptimizedInputProps> = ({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  error,
  className = ''
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  const inputType = type === 'password' && showPassword ? 'text' : type;

  return (
    <div className={`touch-input-container ${className}`}>
      <label className="block text-sm font-medium text-white/70 mb-2">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      
      <div className="relative">
        <input
          ref={inputRef}
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full px-4 py-4 text-base bg-white/10 backdrop-blur-md border rounded-lg text-white placeholder-white/50
            transition-all duration-200 min-h-[48px]
            ${isFocused ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-white/20'}
            ${error ? 'border-red-500 ring-2 ring-red-500/20' : ''}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'}
            focus:outline-none
          `}
          style={{
            fontSize: '16px', // Prevents zoom on iOS
            WebkitAppearance: 'none',
            borderRadius: '8px'
          }}
        />
        
        {/* Password toggle */}
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 text-white/70 hover:text-white"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        )}
      </div>
      
      {error && (
        <p className="mt-2 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
};

interface TouchOptimizedSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export const TouchOptimizedSelect: React.FC<TouchOptimizedSelectProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  required = false,
  disabled = false,
  error,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const selectedOption = options.find(option => option.value === value);

  const handleOptionSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setIsFocused(false);
  };

  return (
    <div className={`touch-select-container ${className}`}>
      <label className="block text-sm font-medium text-white/70 mb-2">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 150)}
          disabled={disabled}
          className={`
            w-full px-4 py-4 text-base bg-white/10 backdrop-blur-md border rounded-lg text-white
            transition-all duration-200 min-h-[48px] flex items-center justify-between
            ${isFocused || isOpen ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-white/20'}
            ${error ? 'border-red-500 ring-2 ring-red-500/20' : ''}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            focus:outline-none
          `}
        >
          <span className={selectedOption ? 'text-white' : 'text-white/50'}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown className={`w-5 h-5 text-white/70 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        
        {/* Options dropdown */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white/95 backdrop-blur-md border border-white/20 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleOptionSelect(option.value)}
                className={`
                  w-full px-4 py-3 text-left text-gray-900 hover:bg-purple-100 transition-colors
                  flex items-center justify-between min-h-[48px]
                  ${value === option.value ? 'bg-purple-50 text-purple-900' : ''}
                `}
              >
                <span>{option.label}</span>
                {value === option.value && <Check className="w-4 h-4 text-purple-600" />}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {error && (
        <p className="mt-2 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
};

interface TouchOptimizedTextareaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export const TouchOptimizedTextarea: React.FC<TouchOptimizedTextareaProps> = ({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  maxLength,
  required = false,
  disabled = false,
  error,
  className = ''
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className={`touch-textarea-container ${className}`}>
      <label className="block text-sm font-medium text-white/70 mb-2">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          rows={rows}
          maxLength={maxLength}
          disabled={disabled}
          className={`
            w-full px-4 py-4 text-base bg-white/10 backdrop-blur-md border rounded-lg text-white placeholder-white/50
            transition-all duration-200 resize-none
            ${isFocused ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-white/20'}
            ${error ? 'border-red-500 ring-2 ring-red-500/20' : ''}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'}
            focus:outline-none
          `}
          style={{
            fontSize: '16px', // Prevents zoom on iOS
            minHeight: `${rows * 24 + 32}px`
          }}
        />
        
        {maxLength && (
          <div className="absolute bottom-2 right-2 text-xs text-white/50">
            {value.length}/{maxLength}
          </div>
        )}
      </div>
      
      {error && (
        <p className="mt-2 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
};