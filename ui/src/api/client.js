import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

// Helper to get current admin token from localStorage
const getAdminToken = () => {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem('adminToken')
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add admin token to all requests if available
    const token = getAdminToken()
    if (token) {
      config.headers['X-Admin-Token'] = token
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response) {
      // Server responded with error
      return Promise.reject({
        status: error.response.status,
        message: error.response.data?.message || error.message,
        data: error.response.data,
      })
    }
    return Promise.reject({
      status: 0,
      message: error.message || 'Network error',
      data: null,
    })
  }
)

export default apiClient
