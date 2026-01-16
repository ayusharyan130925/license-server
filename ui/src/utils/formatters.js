import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns'

/**
 * Format date to readable string
 * @param {string|Date} date - Date to format
 * @param {string} formatStr - Format string (default: 'MMM dd, yyyy')
 * @returns {string} Formatted date string
 */
export function formatDate(date, formatStr = 'MMM dd, yyyy') {
  if (!date) return '-'
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(dateObj)) return '-'
    return format(dateObj, formatStr)
  } catch (error) {
    return '-'
  }
}

/**
 * Format date with time
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string with time
 */
export function formatDateTime(date) {
  return formatDate(date, 'MMM dd, yyyy HH:mm')
}

/**
 * Format relative time (e.g., "2 hours ago")
 * @param {string|Date} date - Date to format
 * @returns {string} Relative time string
 */
export function formatRelativeTime(date) {
  if (!date) return '-'
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(dateObj)) return '-'
    return formatDistanceToNow(dateObj, { addSuffix: true })
  } catch (error) {
    return '-'
  }
}

/**
 * Format currency
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: 'USD')
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, currency = 'USD') {
  if (amount === null || amount === undefined) return '-'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}

/**
 * Format number with commas
 * @param {number} num - Number to format
 * @returns {string} Formatted number string
 */
export function formatNumber(num) {
  if (num === null || num === undefined) return '-'
  return new Intl.NumberFormat('en-US').format(num)
}

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export function truncateText(text, maxLength = 50) {
  if (!text) return '-'
  if (text.length <= maxLength) return text
  return `${text.substring(0, maxLength)}...`
}

/**
 * Format file size
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted file size
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}
