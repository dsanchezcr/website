/**
 * Custom hook for consistent API calls with standardized error handling and loading state.
 * Provides a unified pattern for all API interactions across components.
 */
import { useState, useCallback } from 'react';
import { config } from '../config/environment';

/**
 * Hook for making API calls with consistent state management.
 * 
 * @returns {Object} API utilities: { fetchApi, isLoading, error, clearError }
 */
export function useApi() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Makes an API call with standardized error handling.
   * 
   * @param {string} endpoint - API endpoint (e.g., '/api/weather')
   * @param {Object} options - Fetch options (method, body, headers, etc.)
   * @returns {Promise<{data: any, error: Error|null}>}
   */
  const fetchApi = useCallback(async (endpoint, options = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      const apiEndpoint = config.getApiEndpoint();
      const url = `${apiEndpoint}${endpoint}`;
      
      const defaultHeaders = {
        'Accept': 'application/json',
        ...(options.body && { 'Content-Type': 'application/json' }),
      };

      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }

      const data = await response.json();
      return { data, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      return { data: null, error: err };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { fetchApi, isLoading, error, clearError, setError };
}

export default useApi;
