/**
 * 测试用的JWT token工具
 */

// 根据记忆中的信息，这是一个测试用的JWT token
// 用户名: maxwell, 邮箱: 3158918082@qq.com, 用户ID: 681a2fdaa26dcfaabd36cf61, 角色: user
export const TEST_JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNjgxYTJmZGFhMjZkY2ZhYWJkMzZjZjYxIiwidXNlcm5hbWUiOiJtYXh3ZWxsIiwiZW1haWwiOiIzMTU4OTE4MDgyQHFxLmNvbSIsInJvbGUiOiJ1c2VyIiwicGVybWlzc2lvbnMiOltdLCJpYXQiOjE3MzU3MjE2MDAsImV4cCI6MTczNTgwODAwMH0.test_signature'

/**
 * 设置测试JWT token到localStorage
 */
export const setTestToken = () => {
  localStorage.setItem('jwt_token', TEST_JWT_TOKEN)
  console.log('✅ 测试JWT token已设置到localStorage')
  console.log('🔑 Token:', TEST_JWT_TOKEN)
}

/**
 * 清除JWT token
 */
export const clearToken = () => {
  localStorage.removeItem('jwt_token')
  console.log('🗑️ JWT token已从localStorage清除')
}

/**
 * 获取当前token
 */
export const getCurrentToken = () => {
  return localStorage.getItem('jwt_token')
}

/**
 * 检查是否有token
 */
export const hasToken = () => {
  return !!getCurrentToken()
}

/**
 * 在URL中设置token参数（用于测试）
 */
export const setTokenInUrl = () => {
  const url = new URL(window.location.href)
  url.searchParams.set('token', TEST_JWT_TOKEN)
  window.history.replaceState({}, '', url.toString())
  console.log('✅ 测试JWT token已设置到URL参数')
}

/**
 * 从URL中移除token参数
 */
export const removeTokenFromUrl = () => {
  const url = new URL(window.location.href)
  url.searchParams.delete('token')
  window.history.replaceState({}, '', url.toString())
  console.log('🗑️ JWT token已从URL参数移除')
}

// 在开发环境下自动设置测试token
if (import.meta.env.DEV) {
  // 检查是否已经有token
  if (!hasToken()) {
    console.log('🧪 开发环境：自动设置测试JWT token')
    setTestToken()
  } else {
    console.log('🔑 开发环境：已存在JWT token')
  }
}
