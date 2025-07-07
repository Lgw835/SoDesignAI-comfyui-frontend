/**
 * JWT utility functions for token handling and validation
 */

export interface JwtPayload {
  iss: string
  aud: string
  sub: string
  iat: number
  exp: number
  type: string
  user_id: string
  username: string
  email: string
  role: string
  permissions: string[]
}

export interface JwtUser {
  user_id: string
  username: string
  email: string
  role: string
  permissions: string[]
}

/**
 * Extract JWT token from URL parameters
 */
export function extractTokenFromUrl(): string | null {
  const urlParams = new URLSearchParams(window.location.search)
  return urlParams.get('token')
}

/**
 * Parse JWT token payload without verification
 * Note: This is for client-side parsing only, server verification is required
 */
export function parseJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }

    const payload = parts[1]
    // Add padding if needed
    const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4)
    const decoded = atob(paddedPayload)
    return JSON.parse(decoded) as JwtPayload
  } catch (error) {
    console.error('Failed to parse JWT payload:', error)
    return null
  }
}

/**
 * Check if JWT token is expired
 */
export function isTokenExpired(payload: JwtPayload): boolean {
  const now = Math.floor(Date.now() / 1000)
  return payload.exp < now
}

/**
 * Validate JWT token structure and basic claims
 */
export function validateTokenStructure(payload: JwtPayload): boolean {
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
 * Extract user information from JWT payload
 */
export function extractUserFromPayload(payload: JwtPayload): JwtUser {
  return {
    user_id: payload.user_id,
    username: payload.username,
    email: payload.email,
    role: payload.role,
    permissions: payload.permissions
  }
}

/**
 * Store JWT token in sessionStorage
 */
export function storeToken(token: string): void {
  sessionStorage.setItem('jwt_token', token)
}

/**
 * Retrieve JWT token from sessionStorage
 */
export function getStoredToken(): string | null {
  return sessionStorage.getItem('jwt_token')
}

/**
 * Remove JWT token from sessionStorage
 */
export function removeStoredToken(): void {
  sessionStorage.removeItem('jwt_token')
}

/**
 * Check if user has specific permission
 */
export function hasPermission(user: JwtUser, permission: string): boolean {
  return user.permissions.includes(permission)
}

/**
 * Check if user has specific role
 */
export function hasRole(user: JwtUser, role: string): boolean {
  return user.role === role
}
