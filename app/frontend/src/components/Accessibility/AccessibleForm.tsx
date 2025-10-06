import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAccessibility } from './AccessibilityProvider';
import { ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface FormField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'tel' | 'url' | 'textarea' | 'select' | 'checkbox' | 'radio';
  required?: boolean;
  placeholder?: string;
  description?: string;
  options?: Array<{ value: string; label: string }>;
  validation?: (value: string) => string | null;
  autoComplete?: string;
  'aria-describedby'?: string;
}

interface AccessibleFormProps {
  fields: FormField[];
  onSubmit: (data: Record<string, any>) => void;
  title?: string;
  description?: string;
  submitLabel?: string;
  isLoading?: boolean;
  className?: string;
}

export const AccessibleForm: React.FC<AccessibleFormProps> = ({
  fields,
  onSubmit,
  title,
  description,
  submitLabel = 'Submit',
  isLoading = false,
  className = ''
}) => {
  const { announceToScreenReader, manageFocus, accessibilityClasses } = useAccessibility();
  const formRef = useRef<HTMLFormElement>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Initialize form data
  useEffect(() => {
    const initialData: Record<string, any> = {};
    fields.forEach(field => {
      initialData[field.name] = field.type === 'checkbox' ? false : '';
    });
    setFormData(initialData);
  }, [fields]);

  // Focus management
  useEffect(() => {
    if (formRef.current) {
      const firstField = formRef.current.querySelector('input, textarea, select') as HTMLElement;
      if (firstField) {
        manageFocus(firstField);
      }
    }
  }, [manageFocus]);

  const validateField = (field: FormField, value: any): string | null => {
    // Required validation
    if (field.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      return `${field.label} is required`;
    }

    // Type-specific validation
    if (value && typeof value === 'string') {
      switch (field.type) {
        case 'email':
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            return 'Please enter a valid email address';
          }
          break;
        case 'url':
          try {
            new URL(value);
          } catch {
            return 'Please enter a valid URL';
          }
          break;
        case 'tel':
          const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
          if (!phoneRegex.test(value.replace(/\s/g, ''))) {
            return 'Please enter a valid phone number';
          }
          break;
      }
    }

    // Custom validation
    if (field.validation) {
      return field.validation(value);
    }

    return null;
  };

  const handleFieldChange = (field: FormField, value: any) => {
    setFormData(prev => ({ ...prev, [field.name]: value }));
    
    // Clear error when user starts typing
    if (errors[field.name]) {
      setErrors(prev => ({ ...prev, [field.name]: '' }));
    }
  };

  const handleFieldBlur = (field: FormField) => {
    setTouched(prev => ({ ...prev, [field.name]: true }));
    
    const error = validateField(field, formData[field.name]);
    if (error) {
      setErrors(prev => ({ ...prev, [field.name]: error }));
      announceToScreenReader(`Error in ${field.label}: ${error}`, 'assertive');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    const newErrors: Record<string, string> = {};
    let hasErrors = false;
    
    fields.forEach(field => {
      const error = validateField(field, formData[field.name]);
      if (error) {
        newErrors[field.name] = error;
        hasErrors = true;
      }
    });
    
    setErrors(newErrors);
    setTouched(fields.reduce((acc, field) => ({ ...acc, [field.name]: true }), {}));
    
    if (hasErrors) {
      const errorCount = Object.keys(newErrors).length;
      announceToScreenReader(
        `Form has ${errorCount} error${errorCount > 1 ? 's' : ''}. Please review and correct.`,
        'assertive'
      );
      
      // Focus first field with error
      const firstErrorField = fields.find(field => newErrors[field.name]);
      if (firstErrorField) {
        const fieldElement = formRef.current?.querySelector(`[name="${firstErrorField.name}"]`) as HTMLElement;
        if (fieldElement) {
          manageFocus(fieldElement);
        }
      }
      return;
    }
    
    announceToScreenReader('Form submitted successfully', 'polite');
    onSubmit(formData);
  };

  const renderField = (field: FormField) => {
    const fieldId = field.id || field.name;
    const errorId = `${fieldId}-error`;
    const descriptionId = `${fieldId}-description`;
    const hasError = touched[field.name] && errors[field.name];
    
    const commonProps = {
      id: fieldId,
      name: field.name,
      required: field.required,
      'aria-invalid': hasError ? ('true' as const) : ('false' as const),
      'aria-describedby': [
        field.description ? descriptionId : '',
        hasError ? errorId : '',
        field['aria-describedby'] || ''
      ].filter(Boolean).join(' ') || undefined,
      className: `
        w-full px-3 py-2 border rounded-md shadow-sm
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
        ${hasError 
          ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
          : 'border-gray-300 dark:border-gray-600'
        }
        ${accessibilityClasses}
      `,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const value = field.type === 'checkbox' 
          ? (e.target as HTMLInputElement).checked 
          : e.target.value;
        handleFieldChange(field, value);
      },
      onBlur: () => handleFieldBlur(field)
    };

    const fieldElement = (() => {
      switch (field.type) {
        case 'textarea':
          return (
            <textarea
              {...commonProps}
              placeholder={field.placeholder}
              value={formData[field.name] || ''}
              rows={4}
              autoComplete={field.autoComplete}
            />
          );
          
        case 'select':
          return (
            <select
              {...commonProps}
              value={formData[field.name] || ''}
            >
              <option value="">Select an option</option>
              {field.options?.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          );
          
        case 'checkbox':
          return (
            <input
              {...commonProps}
              type="checkbox"
              checked={formData[field.name] || false}
              className={`
                h-4 w-4 text-blue-600 border-gray-300 rounded
                focus:ring-2 focus:ring-blue-500
                ${hasError ? 'border-red-500' : ''}
                ${accessibilityClasses}
              `}
            />
          );
          
        case 'radio':
          return (
            <div role="radiogroup" aria-labelledby={`${fieldId}-label`}>
              {field.options?.map(option => (
                <label key={option.value} className="flex items-center space-x-2 mb-2">
                  <input
                    type="radio"
                    name={field.name}
                    value={option.value}
                    checked={formData[field.name] === option.value}
                    onChange={(e) => handleFieldChange(field, e.target.value)}
                    onBlur={() => handleFieldBlur(field)}
                    className={`
                      h-4 w-4 text-blue-600 border-gray-300
                      focus:ring-2 focus:ring-blue-500
                      ${hasError ? 'border-red-500' : ''}
                      ${accessibilityClasses}
                    `}
                    aria-describedby={commonProps['aria-describedby']}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          );
          
        default:
          return (
            <input
              {...commonProps}
              type={field.type}
              placeholder={field.placeholder}
              value={formData[field.name] || ''}
              autoComplete={field.autoComplete}
            />
          );
      }
    })();

    return (
      <div key={fieldId} className="accessibility-form-field">
        <label 
          htmlFor={field.type === 'radio' ? undefined : fieldId}
          id={field.type === 'radio' ? `${fieldId}-label` : undefined}
          className={`
            block text-sm font-medium mb-1
            ${hasError ? 'text-red-700 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}
          `}
        >
          {field.label}
          {field.required && (
            <span className="text-red-500 ml-1" aria-label="required">*</span>
          )}
        </label>
        
        {field.description && (
          <p id={descriptionId} className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {field.description}
          </p>
        )}
        
        {field.type === 'checkbox' ? (
          <label className="flex items-center space-x-2">
            {fieldElement}
            <span>{field.label}</span>
          </label>
        ) : (
          fieldElement
        )}
        
        {hasError && (
          <motion.div
            id={errorId}
            className="accessibility-form-error flex items-center space-x-1 mt-1"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
            aria-live="polite"
          >
            <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0" />
            <span>{errors[field.name]}</span>
          </motion.div>
        )}
      </div>
    );
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className={`accessibility-form ${accessibilityClasses} ${className}`}
      noValidate
      aria-labelledby={title ? 'form-title' : undefined}
      aria-describedby={description ? 'form-description' : undefined}
    >
      {title && (
        <h2 id="form-title" className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
          {title}
        </h2>
      )}
      
      {description && (
        <p id="form-description" className="text-gray-600 dark:text-gray-400 mb-6">
          {description}
        </p>
      )}
      
      <div className="space-y-6">
        {fields.map(renderField)}
      </div>
      
      <div className="mt-8">
        <motion.button
          type="submit"
          disabled={isLoading}
          className={`
            w-full flex items-center justify-center space-x-2 px-4 py-2
            bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400
            text-white font-medium rounded-md
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            transition-colors duration-200
            ${accessibilityClasses}
          `}
          whileTap={{ scale: 0.98 }}
          aria-describedby={isLoading ? 'submit-loading' : undefined}
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              <span>Submitting...</span>
              <span id="submit-loading" className="sr-only">
                Form is being submitted, please wait
              </span>
            </>
          ) : (
            <>
              <CheckCircleIcon className="w-5 h-5" />
              <span>{submitLabel}</span>
            </>
          )}
        </motion.button>
      </div>
    </form>
  );
};

export default AccessibleForm;