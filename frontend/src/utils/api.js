// API Configuration and Utility Functions

const API_BASE_URL = 'http://localhost:4000';

/**
 * Get authentication headers with JWT token
 * @returns {Object} Headers object with Authorization token
 */
export const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
    };
};

/**
 * Make authenticated API request
 * @param {string} endpoint - API endpoint (e.g., '/api/admin/dashboard')
 * @param {Object} options - Fetch options
 * @returns {Promise} Response data
 */
export const apiRequest = async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
        ...options,
        headers: {
            ...getAuthHeaders(),
            ...options.headers
        }
    };

    try {
        const response = await fetch(url, config);
        const data = await response.json();

        if (!response.ok) {
            if (response.status === 401) {
                // Token expired or invalid
                localStorage.removeItem('token');
                localStorage.removeItem('userRole');
                localStorage.removeItem('userEmail');
                localStorage.removeItem('userName');
                window.location.href = '/login';
                throw new Error('Session expired. Please login again.');
            }
            throw new Error(data.message || 'API request failed');
        }

        return data;
    } catch (error) {
        console.error('API Request Error:', error);
        throw error;
    }
};

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
export const isAuthenticated = () => {
    return !!localStorage.getItem('token');
};

/**
 * Get current user role
 * @returns {string|null}
 */
export const getUserRole = () => {
    return localStorage.getItem('userRole');
};

/**
 * Logout user
 */
export const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    window.location.href = '/login';
};

export default {
    API_BASE_URL,
    getAuthHeaders,
    apiRequest,
    isAuthenticated,
    getUserRole,
    logout
};
