import axios from 'axios';

// In-memory access token store (never stored in localStorage)
let accessToken = null;
let onAuthFailureCallback = null;

export const setAccessToken = (token) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

export const setOnAuthFailure = (callback) => {
  onAuthFailureCallback = callback;
};

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Single-flight refresh token queue
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// ── Request Interceptor ────────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    if (accessToken && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor ───────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't attempt refresh if the failed request WAS the refresh request or login
      if (
        originalRequest.url?.includes('/api/auth/refresh') ||
        originalRequest.url?.includes('/api/auth/login')
      ) {
        setAccessToken(null);
        if (onAuthFailureCallback) onAuthFailureCallback();
        return Promise.reject(normalizeApiError(error));
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(normalizeApiError(err)));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await api.post('/api/auth/refresh');
        const newToken = data.accessToken;
        setAccessToken(newToken);

        api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;

        processQueue(null, newToken);
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        setAccessToken(null);
        if (onAuthFailureCallback) onAuthFailureCallback();
        return Promise.reject(normalizeApiError(refreshErr));
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(normalizeApiError(error));
  }
);

/**
 * Normalizes backend error response shape:
 * Backend shape: { error: { code: '...', message: '...', field: '...' } }
 * @param {object} error - Axios error object
 * @returns {object} Normalized error object
 */
export function normalizeApiError(error) {
  if (error.response && error.response.data && error.response.data.error) {
    const { code, message, field } = error.response.data.error;
    return {
      code: code || 'UNKNOWN_ERROR',
      message: message || 'An unexpected error occurred.',
      field: field || null,
      status: error.response.status,
      isApiError: true,
    };
  }

  return {
    code: 'NETWORK_ERROR',
    message: error.message || 'Network error or server unreachable.',
    field: null,
    status: error.response?.status || 500,
    isApiError: true,
  };
}

export default api;
