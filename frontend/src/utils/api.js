// API Configuration and Utility Functions

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// ─── In-memory cache with stale-while-revalidate ─────────────────────────────
const _cache = new Map();
const DEFAULT_TTL = 60_000; // 60 seconds – fresh window

/**
 * Same as apiRequest but returns cached data instantly when available.
 * In-flight requests are deduplicated – two simultaneous calls for the same
 * endpoint share a single network request.
 * Stale data is returned immediately while a background refresh runs.
 *
 * @param {string} endpoint
 * @param {Object} options  – fetch options (cache only applies to GET requests)
 * @param {number} ttl      – ms before an entry is considered stale
 */
export const cachedApiRequest = async (endpoint, options = {}, ttl = DEFAULT_TTL) => {
    const method = (options.method || 'GET').toUpperCase();
    if (method !== 'GET') {
        return apiRequest(endpoint, options);
    }

    const now = Date.now();
    const entry = _cache.get(endpoint);

    if (entry) {
        // In-flight deduplication: return the shared promise
        if (entry.promise) return entry.promise;

        const isStale = now - entry.timestamp > ttl;
        if (!isStale) {
            return entry.data; // Fresh hit – instant return
        }
        // Stale: return existing data immediately, refresh in background
        _backgroundRefresh(endpoint, options);
        return entry.data;
    }

    // No cache yet – fire network request and store the promise so concurrent
    // callers join it instead of creating duplicate requests.
    const promise = apiRequest(endpoint, options)
        .then(data => {
            _cache.set(endpoint, { data, timestamp: Date.now() });
            return data;
        })
        .catch(err => {
            _cache.delete(endpoint); // Don't cache errors
            throw err;
        });

    _cache.set(endpoint, { promise });
    return promise;
};

/** Silently refresh a cache entry in the background */
const _backgroundRefresh = (endpoint, options) => {
    const refresh = apiRequest(endpoint, options)
        .then(data => _cache.set(endpoint, { data, timestamp: Date.now() }))
        .catch(() => { /* swallow – stale data is still usable */ });

    // Store as in-flight so any concurrent request joins it
    const current = _cache.get(endpoint);
    if (current) _cache.set(endpoint, { ...current, promise: refresh });
};

/**
 * Invalidate one or all cache entries.
 * Call after mutations (sync, reply updates, etc.) so the next read
 * fetches fresh data.
 *
 * @param {string} [endpoint] – omit to clear the entire cache
 */
export const invalidateCache = (endpoint) => {
    if (endpoint) {
        _cache.delete(endpoint);
    } else {
        _cache.clear();
    }
};
// ─────────────────────────────────────────────────────────────────────────────

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
    cachedApiRequest,
    invalidateCache,
    isAuthenticated,
    getUserRole,
    logout
};
