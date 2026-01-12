/**
 * Transaction Simulation UI Component
 * Displays transaction simulation results and warnings
 */

import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Info, ChevronDown, ChevronUp, RefreshCw, Play } from 'lucide-react';
import { simulateTransaction } from '@/services/transactionSimulator';
import { detectPhishing } from '@/security/phishingDetector';
import { validateTransaction, validateGasParameters } from '@/security/transactionValidator';
import { PublicClient, formatEther } from 'viem';

interface TransactionSimulationUIProps {
  to: string;
  value: bigint;
  data: string;
  gasLimit?: bigint;
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  chainId: number;
  publicClient: PublicClient;
  onConfirm?: () => void;
  onCancel?: () => void;
  className?: string;
}

interface SimulationResult {
  success: boolean;
  gasUsed?: bigint;
  gasCost?: bigint;
  revertReason?: string;
  stateChanges?: Array<{ address: string; key: string; value: string }>;
  logs?: Array<{ address: string; topics: string[]; data: string }>;
}

export const TransactionSimulationUI: React.FC<TransactionSimulationUIProps> = ({
  to,
  value,
  data,
  gasLimit,
  gasPrice,
  maxFeePerGas,
  maxPriorityFeePerGas,
  chainId,
  publicClient,
  onConfirm,
  onCancel,
  className = '',
}) => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [hasSimulated, setHasSimulated] = useState(false);

  useEffect(() => {
    if (hasSimulated) {
      runSimulation();
    }
  }, [to, value, data, gasLimit, gasPrice, maxFeePerGas, maxPriorityFeePerGas]);

  const runSimulation = async () => {
    setIsSimulating(true);
    setHasSimulated(true);

    try {
      // Run transaction simulation
      const simResult = await simulateTransaction(to, data, value, publicClient);
      setSimulationResult(simResult);

      // Collect warnings
      const allWarnings: string[] = [];

      // Phishing detection
      const phishingCheck = detectPhishing(to, value, data);
      if (phishingCheck.isSuspicious) {
        allWarnings.push(...phishingCheck.warnings);
      }

      // Transaction validation
      const txValidation = validateTransaction({ to, value, data });
      if (!txValidation.valid) {
        setErrors(txValidation.errors);
      }
      allWarnings.push(...txValidation.warnings);

      // Gas validation
      const gasValidation = validateGasParameters({
        gasLimit,
        gasPrice,
        maxFeePerGas,
        maxPriorityFeePerGas,
      });
      if (!gasValidation.valid) {
        setErrors((prev) => [...prev, ...gasValidation.errors]);
      }
      allWarnings.push(...gasValidation.warnings);

      // Simulation warnings
      if (!simResult.success && simResult.revertReason) {
        allWarnings.push(`Transaction would revert: ${simResult.revertReason}`);
      }

      setWarnings(allWarnings);
    } catch (error: any) {
      setErrors([error.message || 'Simulation failed']);
    } finally {
      setIsSimulating(false);
    }
  };

  const canConfirm = errors.length === 0 && simulationResult?.success;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-xl ${className}`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Play className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Transaction Simulation
            </h3>
          </div>
          <button
            onClick={runSimulation}
            disabled={isSimulating}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${isSimulating ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Loading State */}
        {isSimulating && (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-gray-600 dark:text-gray-400">
              Simulating transaction...
            </span>
          </div>
        )}

        {/* Results */}
        {!isSimulating && simulationResult && (
          <div className="space-y-4">
            {/* Status */}
            <div
              className={`p-4 rounded-xl ${
                simulationResult.success
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              }`}
            >
              <div className="flex items-start space-x-3">
                {simulationResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <p
                    className={`font-medium ${
                      simulationResult.success
                        ? 'text-green-800 dark:text-green-200'
                        : 'text-red-800 dark:text-red-200'
                    }`}
                  >
                    {simulationResult.success
                      ? 'Transaction Simulation Successful'
                      : 'Transaction Would Fail'}
                  </p>
                  {simulationResult.revertReason && (
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                      {simulationResult.revertReason}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Gas Information */}
            {simulationResult.gasUsed && (
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Estimated Gas Used
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {simulationResult.gasUsed.toString()}
                    </p>
                  </div>
                  {simulationResult.gasCost && (
                    <div className="text-right">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Estimated Cost
                      </p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formatEther(simulationResult.gasCost)} ETH
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Warnings */}
            {warnings.length > 0 && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                      Warnings
                    </p>
                    <ul className="space-y-1">
                      {warnings.map((warning, index) => (
                        <li
                          key={index}
                          className="text-sm text-yellow-700 dark:text-yellow-300"
                        >
                          • {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Errors */}
            {errors.length > 0 && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-red-800 dark:text-red-200 mb-2">
                      Errors
                    </p>
                    <ul className="space-y-1">
                      {errors.map((error, index) => (
                        <li
                          key={index}
                          className="text-sm text-red-700 dark:text-red-300"
                        >
                          • {error}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Details */}
            {(simulationResult.stateChanges || simulationResult.logs) && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="w-full p-4 flex items-center justify-between bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <Info className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <span className="font-medium text-gray-900 dark:text-white">
                      Simulation Details
                    </span>
                  </div>
                  {showDetails ? (
                    <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  )}
                </button>

                {showDetails && (
                  <div className="p-4 space-y-4">
                    {simulationResult.stateChanges && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          State Changes
                        </p>
                        <div className="space-y-1">
                          {simulationResult.stateChanges.map((change, index) => (
                            <div
                              key={index}
                              className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm"
                            >
                              <p className="font-mono text-gray-900 dark:text-white">
                                {change.address}
                              </p>
                              <p className="text-gray-600 dark:text-gray-400">
                                {change.key}: {change.value}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {simulationResult.logs && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Event Logs
                        </p>
                        <div className="space-y-1">
                          {simulationResult.logs.map((log, index) => (
                            <div
                              key={index}
                              className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm"
                            >
                              <p className="font-mono text-gray-900 dark:text-white">
                                {log.address}
                              </p>
                              <p className="text-gray-600 dark:text-gray-400">
                                Topics: {log.topics.join(', ')}
                              </p>
                              <p className="text-gray-600 dark:text-gray-400">
                                Data: {log.data}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex space-x-3">
          {onCancel && (
            <button
              onClick={onCancel}
              className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
            >
              Cancel
            </button>
          )}
          {onConfirm && (
            <button
              onClick={onConfirm}
              disabled={!canConfirm || isSimulating}
              className="flex-1 py-3 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm Transaction
            </button>
          )}
        </div>
      </div>
    </div>
  );
};