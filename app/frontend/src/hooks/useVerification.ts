import { useState, useCallback, useEffect } from 'react';
import { VerificationService } from '../services/verificationService';
import { CreateVerificationRequestInput, VerificationRequest } from '../models/Verification';
import { useAuth } from './useAuth';

export function useVerification() {
    const { isAuthenticated } = useAuth();
    const [requests, setRequests] = useState<VerificationRequest[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchRequests = useCallback(async () => {
        if (!isAuthenticated) return;

        setIsLoading(true);
        setError(null);
        try {
            const data = await VerificationService.getMyRequests();
            setRequests(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated]);

    const submitRequest = async (data: CreateVerificationRequestInput) => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await VerificationService.submitRequest(data);
            setRequests(prev => [result, ...prev]);
            return result;
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            fetchRequests();
        }
    }, [isAuthenticated, fetchRequests]);

    return {
        requests,
        submitRequest,
        isLoading,
        error,
        refetch: fetchRequests
    };
}
