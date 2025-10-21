import React, { useState, useRef, useEffect } from 'react';
import { useMobileOptimization } from '../../../../hooks/useMobileOptimization';
import { TouchOptimizedButton } from './TouchOptimizedButton';

interface FormField {
  id: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'textarea' | 'select' | 'file' | 'toggle';
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  validation?: (value: any) => string | null;
  autoComplete?: string;
  inputMode?: 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url';
}

interface MobileOptimizedFormProps {
  fields: FormField[];
  onSubmit: (data: Record<string, any>) => void;
  submitLabel?: string;
  isLoading?: boolean;
  initialData?: Record<string, any>;
  className?: string;
}

export const MobileOptimizedForm: React.FC<MobileOptimizedFormProps> = ({
  fields,
  onSubmit,
  submitLabel = 'Submit',
  isLoading = false,
  initialData = {},
  className = '',
}) => {
  const { isMobile, getOptimalFontSize, screenSize } = useMobileOptimization();
  const [formData, setFormData] = useState<Record<string, any>>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Auto-scroll to focused field on mobile
  useEffect(() => {
    if (focusedField && isMobile) {
      const fieldElement = document.getElementById(focusedField);
      if (fieldElement) {
        setTimeout(() => {
          fieldElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }, 300); // Wait for keyboard to appear
      }
    }
  }, [focusedField, isMobile]);

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    
    // Clear error when user starts typing
    if (errors[fieldId]) {
      setErrors(prev => ({ ...prev, [fieldId]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    fields.forEach(field => {
      const value = formData[field.id];
      
      // Required field validation
      if (field.required && (!value || value.toString().trim() === '')) {
        newErrors[field.id] = `${field.label} is required`;
        return;
      }

      // Custom validation
      if (field.validation && value) {
        const error = field.validation(value);
        if (error) {
          newErrors[field.id] = error;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    if (validateForm()) {
      onSubmit(formData);
    } else {
      // Focus first error field
      const firstErrorField = Object.keys(errors)[0];
      if (firstErrorField) {
        const element = document.getElementById(firstErrorField);
        element?.focus();
      }
    }
  };

  const renderField = (field: FormField) => {
    const value = formData[field.id] || '';
    const error = errors[field.id];
    const isFocused = focusedField === field.id;

    const commonProps = {
      id: field.id,
      name: field.id,
      value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => 
        handleFieldChange(field.id, e.target.value),
      onFocus: () => setFocusedField(field.id),
      onBlur: () => setFocusedField(null),
      className: `form-input ${error ? 'error' : ''} ${isFocused ? 'focused' : ''}`,
      style: {
        fontSize: getOptimalFontSize(16), // Prevent zoom on iOS
        minHeight: isMobile ? '44px' : '36px', // Touch-friendly height
      },
    };

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            {...commonProps}
            placeholder={field.placeholder}
            rows={isMobile ? 4 : 3}
            autoComplete={field.autoComplete}
          />
        );

      case 'select':
        return (
          <select {...commonProps}>
            <option value="">{field.placeholder || `Select ${field.label}`}</option>
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'file':
        return (
          <input
            {...commonProps}
            type="file"
            accept="image/*"
            capture={isMobile ? "environment" : undefined}
            onChange={(e) => {
              const file = e.target.files?.[0];
              handleFieldChange(field.id, file);
            }}
          />
        );

      case 'toggle':
        return (
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => handleFieldChange(field.id, e.target.checked)}
              className="toggle-input"
            />
            <span className="toggle-slider"></span>
          </label>
        );

      default:
        return (
          <input
            {...commonProps}
            type={field.type}
            placeholder={field.placeholder}
            autoComplete={field.autoComplete}
            inputMode={field.inputMode}
          />
        );
    }
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className={`mobile-optimized-form ${className}`}
    >
      {fields.map(field => (
        <div key={field.id} className="form-field">
          <label htmlFor={field.id} className="form-label">
            {field.label}
            {field.required && <span className="required-indicator">*</span>}
          </label>
          
          {renderField(field)}
          
          {errors[field.id] && (
            <div className="error-message">
              {errors[field.id]}
            </div>
          )}
        </div>
      ))}

      <div className="form-actions">
        <TouchOptimizedButton
          variant="primary"
          size="large"
          onClick={handleSubmit}
          loading={isLoading}
          disabled={isLoading}
          className="submit-button"
        >
          {submitLabel}
        </TouchOptimizedButton>
      </div>

      <style jsx>{`
        .mobile-optimized-form {
          display: flex;
          flex-direction: column;
          gap: ${isMobile ? '20px' : '16px'};
          padding: ${isMobile ? '16px' : '20px'};
          background: white;
          border-radius: 12px;
        }

        .form-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-label {
          font-weight: 600;
          color: #212529;
          font-size: ${getOptimalFontSize(14)}px;
        }

        .required-indicator {
          color: #dc3545;
          margin-left: 4px;
        }

        .form-input {
          padding: ${isMobile ? '12px 16px' : '10px 12px'};
          border: 2px solid #e9ecef;
          border-radius: 8px;
          background: white;
          color: #212529;
          transition: all 0.2s ease;
          outline: none;
          -webkit-appearance: none;
          appearance: none;
        }

        .form-input:focus,
        .form-input.focused {
          border-color: #007bff;
          box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
        }

        .form-input.error {
          border-color: #dc3545;
        }

        .form-input.error:focus {
          box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.1);
        }

        /* Specific input type styles */
        input[type="file"] {
          padding: ${isMobile ? '16px' : '12px'};
          background: #f8f9fa;
          cursor: pointer;
        }

        select {
          cursor: pointer;
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
          background-position: right 12px center;
          background-repeat: no-repeat;
          background-size: 16px;
          padding-right: 40px;
        }

        textarea {
          resize: vertical;
          min-height: ${isMobile ? '100px' : '80px'};
          font-family: inherit;
        }

        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 60px;
          height: 34px;
        }

        .toggle-input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          transition: 0.4s;
          border-radius: 34px;
        }

        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 26px;
          width: 26px;
          left: 4px;
          bottom: 4px;
          background-color: white;
          transition: 0.4s;
          border-radius: 50%;
        }

        .toggle-input:checked + .toggle-slider {
          background-color: #007bff;
        }

        .toggle-input:checked + .toggle-slider:before {
          transform: translateX(26px);
        }

        .error-message {
          color: #dc3545;
          font-size: ${getOptimalFontSize(12)}px;
          margin-top: 4px;
        }

        .form-actions {
          margin-top: ${isMobile ? '24px' : '20px'};
          padding-top: ${isMobile ? '20px' : '16px'};
          border-top: 1px solid #e9ecef;
        }

        .submit-button {
          width: 100%;
        }

        /* Mobile-specific optimizations */
        @media (max-width: 480px) {
          .mobile-optimized-form {
            padding: 12px;
            gap: 16px;
          }

          .form-input {
            font-size: 16px !important; /* Prevent zoom on iOS */
          }

          /* Adjust viewport when keyboard appears */
          .form-field:focus-within {
            transform: translateY(-10px);
            transition: transform 0.3s ease;
          }
        }

        /* Accessibility improvements */
        @media (prefers-reduced-motion: reduce) {
          .form-input,
          .toggle-slider,
          .toggle-slider:before {
            transition: none;
          }
        }

        /* High contrast mode support */
        @media (prefers-contrast: high) {
          .form-input {
            border-width: 3px;
          }
          
          .form-input:focus {
            border-color: #000;
          }
        }
      `}</style>
    </form>
  );
};

export default MobileOptimizedForm;