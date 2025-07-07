import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { useToastStore } from '@/stores/toastStore'
import type { JwtPayload, JwtUser } from '@/utils/jwtUtil'
import {
  extractTokenFromUrl,
  extractUserFromPayload,
  getStoredToken,
  isTokenExpired,
  parseJwtPayload,
  removeStoredToken,
  storeToken,
  validateTokenStructure
} from '@/utils/jwtUtil'

export interface JwtVerifyResponse {
  authenticated: boolean
  user?: {
    user_id: string
    username: string
    email: string
    role: string
    permissions: string[]
  }
  message?: string
  error?: string
  code?: string
}

export const useJwtAuthStore = defineStore('jwtAuth', () => {
  // State
  const loading = ref(false)
  const currentUser = ref<JwtUser | null>(null)
  const currentToken = ref<string | null>(null)
  const isInitialized = ref(false)
  const lastVerificationTime = ref<Date | null>(null)

  // Configuration
  const apiBaseUrl = ref('http://192.168.1.17:5000')
  const verifyEndpoint = ref('/api/comfyui/verify_token')
  const loginRedirectUrl = ref('http://192.168.1.17:5000/login.html')

  // Getters
  const isAuthenticated = computed(() => !!currentUser.value && !!currentToken.value)
  const userEmail = computed(() => currentUser.value?.email)
  const userId = computed(() => currentUser.value?.user_id)
  const username = computed(() => currentUser.value?.username)
  const userRole = computed(() => currentUser.value?.role)
  const userPermissions = computed(() => currentUser.value?.permissions || [])

  /**
   * Verify JWT token with the server
   */
  const verifyToken = async (token: string): Promise<JwtVerifyResponse> => {
    try {
      const response = await fetch(`${apiBaseUrl.value}${verifyEndpoint.value}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token })
      })

      const result = await response.json() as JwtVerifyResponse

      if (!response.ok) {
        throw new Error(result.error || 'Token verification failed')
      }

      return result
    } catch (error) {
      console.error('Token verification error:', error)

      // Handle specific error types
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.warn('JWT verification server not available. In development mode, this is expected.')
        return {
          authenticated: false,
          error: 'Authentication server not available',
          code: 'SERVER_UNAVAILABLE'
        }
      }

      return {
        authenticated: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'VERIFICATION_FAILED'
      }
    }
  }

  /**
   * Initialize JWT authentication
   */
  const initialize = async (): Promise<boolean> => {
    if (isInitialized.value) {
      return isAuthenticated.value
    }

    loading.value = true

    try {
      // First, try to get token from URL
      let token = extractTokenFromUrl()
      
      // If no token in URL, try to get from storage
      if (!token) {
        token = getStoredToken()
      }

      if (!token) {
        console.log('No JWT token found')
        isInitialized.value = true
        return false
      }

      // Parse token payload for basic validation
      const payload = parseJwtPayload(token)
      if (!payload) {
        console.error('Invalid JWT token format')
        removeStoredToken()
        isInitialized.value = true
        return false
      }

      // Check token structure
      if (!validateTokenStructure(payload)) {
        console.error('Invalid JWT token structure')
        removeStoredToken()
        isInitialized.value = true
        return false
      }

      // Check if token is expired
      if (isTokenExpired(payload)) {
        console.error('JWT token is expired')
        removeStoredToken()
        isInitialized.value = true
        return false
      }

      // Verify token with server
      const verifyResult = await verifyToken(token)

      if (verifyResult.authenticated && verifyResult.user) {
        // Store token and user info
        storeToken(token)
        currentToken.value = token
        currentUser.value = verifyResult.user
        lastVerificationTime.value = new Date()

        console.log('JWT authentication successful:', verifyResult.user)
        isInitialized.value = true
        return true
      } else {
        console.error('JWT token verification failed:', verifyResult.error)

        // 在开发环境中，如果服务器不可用，尝试本地解析令牌
        // 但仍然要求令牌格式正确且未过期
        const isDevelopment = import.meta.env.DEV
        if (isDevelopment && verifyResult.code === 'SERVER_UNAVAILABLE') {
          console.warn('开发模式：服务器不可用，尝试本地令牌解析...')

          // 重新解析令牌载荷用于开发模式
          const devPayload = parseJwtPayload(token)
          if (devPayload && validateTokenStructure(devPayload) && !isTokenExpired(devPayload)) {
            const userFromPayload = extractUserFromPayload(devPayload)
            if (userFromPayload) {
              storeToken(token)
              currentToken.value = token
              currentUser.value = userFromPayload
              lastVerificationTime.value = new Date()

              console.log('JWT认证成功 (开发模式 - 本地验证):', userFromPayload)
              isInitialized.value = true
              return true
            }
          } else {
            console.error('开发模式：令牌验证失败 - 令牌无效或已过期')
          }
        }

        removeStoredToken()
        currentToken.value = null
        currentUser.value = null
        isInitialized.value = true
        return false
      }
    } catch (error) {
      console.error('JWT initialization error:', error)
      removeStoredToken()
      currentToken.value = null
      currentUser.value = null
      isInitialized.value = true
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * Logout and clear JWT authentication
   */
  const logout = async (): Promise<void> => {
    removeStoredToken()
    currentToken.value = null
    currentUser.value = null
    lastVerificationTime.value = null

    // Redirect to access denied page
    window.location.href = loginRedirectUrl.value
  }

  /**
   * Check if user has specific permission
   */
  const hasPermission = (permission: string): boolean => {
    return currentUser.value?.permissions.includes(permission) || false
  }

  /**
   * Check if user has specific role
   */
  const hasRole = (role: string): boolean => {
    return currentUser.value?.role === role || false
  }

  /**
   * Get authentication header for API requests
   */
  const getAuthHeader = (): Record<string, string> | null => {
    if (!currentToken.value) {
      return null
    }
    
    return {
      'Authorization': `Bearer ${currentToken.value}`
    }
  }

  /**
   * Make authenticated fetch request
   */
  const authenticatedFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const authHeader = getAuthHeader()
    if (!authHeader) {
      throw new Error('No authentication token available')
    }

    const headers = {
      ...options.headers,
      ...authHeader
    }

    return fetch(url, {
      ...options,
      headers
    })
  }

  /**
   * Refresh token verification (optional, for periodic checks)
   */
  const refreshVerification = async (): Promise<boolean> => {
    if (!currentToken.value) {
      return false
    }

    const verifyResult = await verifyToken(currentToken.value)
    
    if (verifyResult.authenticated && verifyResult.user) {
      currentUser.value = verifyResult.user
      lastVerificationTime.value = new Date()
      return true
    } else {
      await logout()
      return false
    }
  }

  return {
    // State
    loading,
    currentUser,
    currentToken,
    isInitialized,
    lastVerificationTime,
    apiBaseUrl,
    verifyEndpoint,
    loginRedirectUrl,

    // Getters
    isAuthenticated,
    userEmail,
    userId,
    username,
    userRole,
    userPermissions,

    // Actions
    initialize,
    logout,
    hasPermission,
    hasRole,
    getAuthHeader,
    authenticatedFetch,
    refreshVerification,
    verifyToken
  }
})
