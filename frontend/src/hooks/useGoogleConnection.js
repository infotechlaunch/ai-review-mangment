import { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';

/**
 * Custom hook to check Google Business connection status
 * @returns {object} { isConnected, isLoading, error, checkConnection, connectionData }
 */
export const useGoogleConnection = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [connectionData, setConnectionData] = useState(null);

    const checkConnection = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await apiRequest('/api/google-oauth/status', {
                method: 'GET'
            });

            if (response.success) {
                setIsConnected(response.isConnected);
                setConnectionData(response.data || null);
            } else {
                setIsConnected(false);
                setConnectionData(null);
            }
        } catch (err) {
            console.error('Error checking Google connection:', err);
            setError(err.message);
            setIsConnected(false);
            setConnectionData(null);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // Only check if user is logged in
        const token = localStorage.getItem('token');
        if (token) {
            checkConnection();
        } else {
            setIsLoading(false);
        }
    }, []);

    return {
        isConnected,
        isLoading,
        error,
        checkConnection,
        connectionData
    };
};
