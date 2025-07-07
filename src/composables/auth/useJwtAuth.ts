import { computed } from 'vue'

import { useJwtAuthStore } from '@/stores/jwtAuthStore'

/**
 * Composable for JWT authentication
 */
export const useJwtAuth = () => {
  const jwtAuthStore = useJwtAuthStore()

  // Computed properties for reactive access
  const isAuthenticated = computed(() => jwtAuthStore.isAuthenticated)
  const isInitialized = computed(() => jwtAuthStore.isInitialized)
  const loading = computed(() => jwtAuthStore.loading)
  const currentUser = computed(() => jwtAuthStore.currentUser)
  const userEmail = computed(() => jwtAuthStore.userEmail)
  const userId = computed(() => jwtAuthStore.userId)
  const username = computed(() => jwtAuthStore.username)
  const userRole = computed(() => jwtAuthStore.userRole)
  const userPermissions = computed(() => jwtAuthStore.userPermissions)

  // Provider information for display
  const providerName = computed(() => 'SoDesign.AI')
  const providerIcon = computed(() => 'pi pi-shield')

  /**
   * Initialize JWT authentication
   */
  const initialize = async (): Promise<boolean> => {
    return await jwtAuthStore.initialize()
  }

  /**
   * Logout user
   */
  const logout = async (): Promise<void> => {
    await jwtAuthStore.logout()
  }

  /**
   * Check if user has specific permission
   */
  const hasPermission = (permission: string): boolean => {
    return jwtAuthStore.hasPermission(permission)
  }

  /**
   * Check if user has specific role
   */
  const hasRole = (role: string): boolean => {
    return jwtAuthStore.hasRole(role)
  }

  /**
   * Get authentication header for API requests
   */
  const getAuthHeader = (): Record<string, string> | null => {
    return jwtAuthStore.getAuthHeader()
  }

  /**
   * Make authenticated fetch request
   */
  const authenticatedFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    return await jwtAuthStore.authenticatedFetch(url, options)
  }

  /**
   * Refresh token verification
   */
  const refreshVerification = async (): Promise<boolean> => {
    return await jwtAuthStore.refreshVerification()
  }

  return {
    // State
    isAuthenticated,
    isInitialized,
    loading,
    currentUser,
    userEmail,
    userId,
    username,
    userRole,
    userPermissions,
    providerName,
    providerIcon,

    // Actions
    initialize,
    logout,
    hasPermission,
    hasRole,
    getAuthHeader,
    authenticatedFetch,
    refreshVerification
  }
}
