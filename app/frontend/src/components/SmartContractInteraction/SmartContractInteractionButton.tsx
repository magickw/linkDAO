import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { web3ErrorHandler } from '../../utils/web3ErrorHandling';
import { useBlockchainData } from './BlockchainDataProvider';

interface ContractMethod {
  name: string;
  inputs: ContractInput[];
  outputs?: ContractOutput[];
  stateMutability: 'pure' | 'view' | 'nonpayable' | 'payable';
  description?: string;
}

interface ContractInput {
  name: string;
  type: string;
  description?: string;
  placeholder?: string;
  validation?: (value: any) => boolean;
}

interface ContractOutput {
  name: string;
  type: string;
  description?: string;
}

interface SmartContractInteractionButtonProps {
  contractAddress: string;
  method: ContractMethod;
  chainId?: number;
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
  className?: string;
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
  onTransactionSubmitted?: (txHash: string) => void;
}

const SIZE_CONFIGS = {
  small: {
    button: 'px-3 py-1.5 text-sm',
    modal: 'max-w-md',
    input: 'px-3 py-2 text-sm'
  },
  medium: {
    button: 'px-4 py-2 text-base',
    modal: 'max-w-lg',
    input: 'px-4 py-3 text-base'
  },
  large: {
    button: 'px-6 py-3 text-lg',
    modal: 'max-w-xl',
    input: 'px-4 py-3 text-lg'
  }
};

const VARIANT_CONFIGS = {
  primary: 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white',
  secondary: 'bg-gray-700 hover:bg-gray-600 text-white',
  outline: 'border-2 border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white'
};

export const SmartContractInteractionButton: React.FC<SmartContractInteractionButtonProps> = ({
  contractAddress,
  method,
  chainId = 1,
  size = 'medium',
  variant = 'primary',
  disabled = false,
  className = '',
  onSuccess,
  onError,
  onTransactionSubmitted
}) => {
  const [showModal, setShowModal] = useState(false);
  const [inputValues, setInputValues] = useState<Record<string, any>>({});
  const [isExecuting, setIsExecuting] = useState(false);
  const [gasEstimate, setGasEstimate] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const { watchTransaction } = useBlockchainData();
  const sizeConfig = SIZE_CONFIGS[size];
  const variantConfig = VARIANT_CONFIGS[variant];

  const isReadOnly = method.stateMutability === 'view' || method.stateMutability === 'pure';
  const requiresPayment = method.stateMutability === 'payable';

  useEffect(() => {
    if (showModal && !isReadOnly) {
      estimateGas();
    }
  }, [inputValues, showModal]);

  const estimateGas = async () => {
    try {
      // This would estimate gas for the contract call
      const estimate = await estimateContractGas(contractAddress, method, inputValues);
      setGasEstimate(estimate);
    } catch (error) {
      console.error('Failed to estimate gas:', error);
      setGasEstimate(null);
    }
  };

  const validateInputs = (): boolean => {
    const errors: Record<string, string> = {};
    
    method.inputs.forEach(input => {
      const value = inputValues[input.name];
      
      if (!value && value !== 0) {
        errors[input.name] = `${input.name} is required`;
        return;
      }
      
      if (input.validation && !input.validation(value)) {
        errors[input.name] = `Invalid ${input.name}`;
        return;
      }
      
      // Type validation
      if (input.type.includes('uint') && (isNaN(value) || value < 0)) {
        errors[input.name] = `${input.name} must be a positive number`;
      } else if (input.type === 'address' && !isValidAddress(value)) {
        errors[input.name] = `${input.name} must be a valid address`;
      }
    });
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const executeContract = async () => {
    if (!validateInputs() || isExecuting) return;
    
    setIsExecuting(true);
    setResult(null);
    
    try {
      if (isReadOnly) {
        // Call view/pure function
        const result = await callContractMethod(contractAddress, method, inputValues);
        setResult(result);
        onSuccess?.(result);
      } else {
        // Send transaction
        const txHash = await sendContractTransaction(contractAddress, method, inputValues);
        
        // Watch transaction for confirmation
        watchTransaction(txHash);
        onTransactionSubmitted?.(txHash);
        
        setShowModal(false);
        setInputValues({});
      }
    } catch (error) {
      const errorMessage = web3ErrorHandler.handleError(error as Error, {
        action: 'executeContract',
        component: 'SmartContractInteractionButton'
      }).message;
      
      onError?.(errorMessage);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleInputChange = (inputName: string, value: any) => {
    setInputValues(prev => ({ ...prev, [inputName]: value }));
    
    // Clear validation error for this field
    if (validationErrors[inputName]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[inputName];
        return newErrors;
      });
    }
  };

  const renderInput = (input: ContractInput) => {
    const value = inputValues[input.name] || '';
    const hasError = !!validationErrors[input.name];
    
    const getInputType = () => {
      if (input.type.includes('uint') || input.type.includes('int')) return 'number';
      if (input.type === 'bool') return 'checkbox';
      return 'text';
    };
    
    if (input.type === 'bool') {
      return (
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => handleInputChange(input.name, e.target.checked)}
            className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
          />
          <span className="text-white">{input.description || input.name}</span>
        </label>
      );
    }
    
    return (
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          {input.description || input.name}
          <span className="text-gray-400 ml-1">({input.type})</span>
        </label>
        <input
          type={getInputType()}
          value={value}
          onChange={(e) => handleInputChange(input.name, e.target.value)}
          placeholder={input.placeholder || `Enter ${input.name}`}
          className={`
            w-full rounded-lg bg-gray-800 border text-white placeholder-gray-400
            focus:ring-2 focus:ring-blue-500 focus:border-transparent
            ${sizeConfig.input}
            ${hasError ? 'border-red-500' : 'border-gray-600'}
          `}
        />
        {hasError && (
          <p className="text-red-400 text-sm mt-1">{validationErrors[input.name]}</p>
        )}
      </div>
    );
  };

  const getMethodIcon = () => {
    if (isReadOnly) return '👁️';
    if (requiresPayment) return '💰';
    return '⚡';
  };

  return (
    <>
      <motion.button
        onClick={() => setShowModal(true)}
        disabled={disabled}
        className={`
          inline-flex items-center space-x-2 rounded-lg font-medium transition-all duration-200
          ${sizeConfig.button} ${variantConfig} ${className}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg'}
        `}
        whileHover={!disabled ? { scale: 1.02 } : {}}
        whileTap={!disabled ? { scale: 0.98 } : {}}
      >
        <span>{getMethodIcon()}</span>
        <span>{method.name}</span>
      </motion.button>

      {/* Interaction Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`
                bg-gray-900/95 backdrop-blur-sm border border-white/10 rounded-xl p-6
                ${sizeConfig.modal} w-full max-h-[80vh] overflow-y-auto
              `}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-white flex items-center space-x-2">
                    <span>{getMethodIcon()}</span>
                    <span>{method.name}</span>
                  </h3>
                  {method.description && (
                    <p className="text-gray-400 text-sm mt-1">{method.description}</p>
                  )}
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Contract Info */}
              <div className="mb-6 p-4 bg-gray-800/50 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Contract:</span>
                  <code className="text-gray-300">
                    {contractAddress.slice(0, 10)}...{contractAddress.slice(-8)}
                  </code>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-gray-400">Method Type:</span>
                  <span className="text-gray-300 capitalize">{method.stateMutability}</span>
                </div>
              </div>

              {/* Input Fields */}
              {method.inputs.length > 0 && (
                <div className="space-y-4 mb-6">
                  <h4 className="text-lg font-medium text-white">Parameters</h4>
                  {method.inputs.map((input, index) => (
                    <div key={index}>
                      {renderInput(input)}
                    </div>
                  ))}
                </div>
              )}

              {/* Gas Estimate */}
              {!isReadOnly && gasEstimate && (
                <div className="mb-6 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <span className="text-blue-400">⛽</span>
                    <span className="text-sm text-blue-300">
                      Estimated Gas Fee: {gasEstimate}
                    </span>
                  </div>
                </div>
              )}

              {/* Result Display */}
              {result && (
                <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <h5 className="text-green-400 font-medium mb-2">Result:</h5>
                  <pre className="text-sm text-gray-300 overflow-x-auto">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={executeContract}
                  disabled={isExecuting || (method.inputs.length > 0 && Object.keys(inputValues).length === 0)}
                  className={`
                    flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-200
                    ${!isExecuting && (method.inputs.length === 0 || Object.keys(inputValues).length > 0)
                      ? `${variantConfig} hover:shadow-lg`
                      : 'bg-gray-600 text-gray-300 cursor-not-allowed'
                    }
                  `}
                >
                  {isExecuting ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{isReadOnly ? 'Calling...' : 'Sending...'}</span>
                    </div>
                  ) : (
                    <span>{isReadOnly ? 'Call Function' : 'Send Transaction'}</span>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// Helper functions (these would be implemented with actual Web3 libraries)
const estimateContractGas = async (address: string, method: ContractMethod, inputs: Record<string, any>): Promise<string> => {
  // Mock implementation
  return '0.002 ETH';
};

const callContractMethod = async (address: string, method: ContractMethod, inputs: Record<string, any>): Promise<any> => {
  // Mock implementation
  return { success: true, data: 'Mock result' };
};

const sendContractTransaction = async (address: string, method: ContractMethod, inputs: Record<string, any>): Promise<string> => {
  // Mock implementation
  return '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
};

const isValidAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};