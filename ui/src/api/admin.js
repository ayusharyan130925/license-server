import apiClient from './client'

// Auth
export const loginAdmin = (email, password) => {
  return apiClient.post('/admin/login', { email, password })
}

// App Versions
export const getAppVersions = (filters = {}) => {
  return apiClient.get('/admin/versions', { params: filters })
}

export const createAppVersion = (versionData) => {
  return apiClient.post('/admin/versions', versionData)
}

export const updateAppVersion = (id, updateData) => {
  return apiClient.patch(`/admin/versions/${id}`, updateData)
}

// Users (custom admin endpoints - we'll need to create these)
export const getUsers = () => {
  return apiClient.get('/admin/users')
}

export const getUser = (id) => {
  return apiClient.get(`/admin/users/${id}`)
}

export const getUserDevices = (userId) => {
  return apiClient.get(`/admin/users/${userId}/devices`)
}

export const getUserSubscriptions = (userId) => {
  return apiClient.get(`/admin/users/${userId}/subscriptions`)
}

// Devices
export const getDevices = (filters = {}) => {
  return apiClient.get('/admin/devices', { params: filters })
}

export const getDevice = (id) => {
  return apiClient.get(`/admin/devices/${id}`)
}

// Subscriptions
export const getSubscriptions = (filters = {}) => {
  return apiClient.get('/admin/subscriptions', { params: filters })
}

// Statistics
export const getStats = () => {
  return apiClient.get('/admin/stats')
}
