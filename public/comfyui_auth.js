/**
 * ComfyUI Authentication Client
 * Provides JWT authentication functionality for ComfyUI frontend
 */

class ComfyUIAuth {
  constructor(options = {}) {
    this.apiBaseUrl = options.apiBaseUrl || 'http://192.168.1.17:5000'
    this.verifyEndpoint = options.verifyEndpoint || '/api/comfyui/verify_token'
    this.loginRedirectUrl = options.loginRedirectUrl || 'http://192.168.1.17:5000/login.html'
    
    this.currentUser = null
    this.currentToken = null
    this.isAuthenticated = false
    this.isInitialized = false
    
    // Auto-initialize if token is in URL
    if (this.extractTokenFromUrl()) {
      this.initialize()
    }
  }

  /**
   * Extract JWT token from URL parameters
   */
  extractTokenFromUrl() {
    const urlParams = new URLSearchParams(window.location.search)
    return urlParams.get('token')
  }

  /**
   * Parse JWT token payload without verification
   */
  parseJwtPayload(token) {
    try {
      const parts = token.split('.')
      if (parts.length !== 3) {
        return null
      }

      const payload = parts[1]
      // Add padding if needed
      const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4)
      const decoded = atob(paddedPayload)
      return JSON.parse(decoded)
    } catch (error) {
      console.error('Failed to parse JWT payload:', error)
      return null
    }
  }

  /**
   * Check if JWT token is expired
   */
  isTokenExpired(payload) {
    const now = Math.floor(Date.now() / 1000)
    return payload.exp < now
  }

  /**
   * Validate JWT token structure
   */
  validateTokenStructure(payload) {
    return !!(
      payload.iss === 'SoDesign.AI' &&
      payload.aud === 'sodesign-users' &&
      payload.type === 'access' &&
      payload.user_id &&
      payload.username &&
      payload.email &&
      payload.role &&
      Array.isArray(payload.permissions)
    )
  }

  /**
   * Store JWT token in sessionStorage
   */
  storeToken(token) {
    sessionStorage.setItem('jwt_token', token)
  }

  /**
   * Retrieve JWT token from sessionStorage
   */
  getStoredToken() {
    return sessionStorage.getItem('jwt_token')
  }

  /**
   * Remove JWT token from sessionStorage
   */
  removeStoredToken() {
    sessionStorage.removeItem('jwt_token')
  }

  /**
   * Verify JWT token with the server
   */
  async verifyToken(token) {
    try {
      const response = await fetch(`${this.apiBaseUrl}${this.verifyEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Token verification failed')
      }

      return result
    } catch (error) {
      console.error('Token verification error:', error)
      return {
        authenticated: false,
        error: error.message || 'Unknown error',
        code: 'VERIFICATION_FAILED'
      }
    }
  }

  /**
   * Initialize JWT authentication
   */
  async initialize() {
    if (this.isInitialized) {
      return this.isAuthenticated
    }

    try {
      // First, try to get token from URL
      let token = this.extractTokenFromUrl()
      
      // If no token in URL, try to get from storage
      if (!token) {
        token = this.getStoredToken()
      }

      if (!token) {
        console.log('No JWT token found')
        this.isInitialized = true
        return false
      }

      // Parse token payload for basic validation
      const payload = this.parseJwtPayload(token)
      if (!payload) {
        console.error('Invalid JWT token format')
        this.removeStoredToken()
        this.isInitialized = true
        return false
      }

      // Check token structure
      if (!this.validateTokenStructure(payload)) {
        console.error('Invalid JWT token structure')
        this.removeStoredToken()
        this.isInitialized = true
        return false
      }

      // Check if token is expired
      if (this.isTokenExpired(payload)) {
        console.error('JWT token is expired')
        this.removeStoredToken()
        this.isInitialized = true
        return false
      }

      // Verify token with server
      const verifyResult = await this.verifyToken(token)
      
      if (verifyResult.authenticated && verifyResult.user) {
        // Store token and user info
        this.storeToken(token)
        this.currentToken = token
        this.currentUser = verifyResult.user
        this.isAuthenticated = true
        
        console.log('JWT authentication successful:', verifyResult.user)
        this.isInitialized = true
        return true
      } else {
        console.error('JWT token verification failed:', verifyResult.error)
        this.removeStoredToken()
        this.currentToken = null
        this.currentUser = null
        this.isAuthenticated = false
        this.isInitialized = true
        return false
      }
    } catch (error) {
      console.error('JWT initialization error:', error)
      this.removeStoredToken()
      this.currentToken = null
      this.currentUser = null
      this.isAuthenticated = false
      this.isInitialized = true
      return false
    }
  }

  /**
   * Get current user information
   */
  getCurrentUser() {
    return this.currentUser
  }

  /**
   * Check if user is authenticated
   */
  isUserAuthenticated() {
    return this.isAuthenticated
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(permission) {
    return this.currentUser?.permissions?.includes(permission) || false
  }

  /**
   * Check if user has specific role
   */
  hasRole(role) {
    return this.currentUser?.role === role || false
  }

  /**
   * Get authentication header for API requests
   */
  getAuthHeader() {
    if (!this.currentToken) {
      return null
    }
    
    return {
      'Authorization': `Bearer ${this.currentToken}`
    }
  }

  /**
   * Make authenticated fetch request
   */
  async authenticatedFetch(url, options = {}) {
    const authHeader = this.getAuthHeader()
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
   * Logout and redirect to login page
   */
  logout() {
    this.removeStoredToken()
    this.currentToken = null
    this.currentUser = null
    this.isAuthenticated = false
    
    // Redirect to login page
    window.location.href = this.loginRedirectUrl
  }
}

// Auto-initialize global instance
window.ComfyUIAuth = ComfyUIAuth

// Create global instance if token is present
if (new URLSearchParams(window.location.search).get('token')) {
  window.comfyUIAuth = new ComfyUIAuth()
}
