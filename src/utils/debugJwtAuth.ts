import { useJwtAuthStore } from '@/stores/jwtAuthStore'

/**
 * 调试JWT认证状态的工具函数
 */
export function debugJwtAuth() {
  const jwtAuthStore = useJwtAuthStore()
  
  console.log('🔍 JWT认证调试信息:')
  console.log('─'.repeat(50))
  console.log('🔑 当前令牌:', jwtAuthStore.currentToken ? '已设置' : '未设置')
  console.log('👤 用户信息:', jwtAuthStore.currentUser)
  console.log('✅ 认证状态:', jwtAuthStore.isAuthenticated ? '已认证' : '未认证')
  console.log('🌐 API基础URL:', jwtAuthStore.apiBaseUrl)
  
  if (jwtAuthStore.currentToken) {
    console.log('🎯 令牌长度:', jwtAuthStore.currentToken.length)
    console.log('🎯 令牌前缀:', jwtAuthStore.currentToken.substring(0, 20) + '...')
  }
  
  // 检查sessionStorage
  const sessionToken = sessionStorage.getItem('jwt_token')
  console.log('💾 SessionStorage令牌:', sessionToken ? '已存储' : '未存储')
  
  // 检查URL参数
  const urlParams = new URLSearchParams(window.location.search)
  const urlToken = urlParams.get('token')
  console.log('🔗 URL参数令牌:', urlToken ? '存在' : '不存在')
  
  console.log('─'.repeat(50))
  
  return {
    hasToken: !!jwtAuthStore.currentToken,
    isAuthenticated: jwtAuthStore.isAuthenticated,
    userInfo: jwtAuthStore.currentUser,
    tokenLength: jwtAuthStore.currentToken?.length || 0
  }
}

// 在开发环境下暴露调试函数
if (import.meta.env.DEV) {
  // @ts-ignore
  window.debugJwtAuth = debugJwtAuth
  console.log('🔧 开发模式：可以在控制台运行 debugJwtAuth() 来查看JWT认证状态')
}
