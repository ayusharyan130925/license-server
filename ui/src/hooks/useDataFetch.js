import { useState, useEffect, useCallback } from 'react'
import { useToast } from '../components/ToastContext'

/**
 * Custom hook for fetching data with loading and error states
 * @param {Function} fetchFn - Function that returns a promise
 * @param {Array} dependencies - Dependencies array for useEffect
 * @param {Object} options - Options object
 * @returns {Object} { data, loading, error, refetch }
 */
export function useDataFetch(fetchFn, dependencies = [], options = {}) {
  const { showToast = true, errorMessage = 'Failed to load data' } = options
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { showToast: toast } = useToast()

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await fetchFn()
      setData(result)
      return result
    } catch (err) {
      console.error('Data fetch error:', err)
      setError(err)
      if (showToast) {
        toast(errorMessage, 'error')
      }
      throw err
    } finally {
      setLoading(false)
    }
  }, [fetchFn, showToast, errorMessage, toast])

  useEffect(() => {
    fetchData()
  }, dependencies)

  return { data, loading, error, refetch: fetchData }
}
