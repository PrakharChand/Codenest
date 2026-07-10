// Centralized Axios instance — convention: ALL API calls use this, never raw fetch.
// Automatically attaches Bearer token and handles 401 refresh (Phase 7 wires full interceptors).
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor — attach access token from AuthContext (wired in Phase 7)
api.interceptors.request.use(
  (config) => {
    // Token injection wired in Phase 7 via AuthContext
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor — handle 401 token refresh (completed in Phase 7)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Full refresh-token logic added in Phase 7
    return Promise.reject(error)
  }
)

export default api
