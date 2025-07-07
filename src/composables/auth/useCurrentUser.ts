import { computed } from 'vue'

import { useApiKeyAuthStore } from '@/stores/apiKeyAuthStore'
import { useCommandStore } from '@/stores/commandStore'
import { useFirebaseAuthStore } from '@/stores/firebaseAuthStore'
import { useJwtAuth } from '@/composables/auth/useJwtAuth'

export const useCurrentUser = () => {
  const authStore = useFirebaseAuthStore()
  const commandStore = useCommandStore()
  const apiKeyStore = useApiKeyAuthStore()
  const jwtAuth = useJwtAuth()

  const firebaseUser = computed(() => authStore.currentUser)
  const isApiKeyLogin = computed(() => apiKeyStore.isAuthenticated)
  const isJwtLogin = computed(() => jwtAuth.isAuthenticated.value)
  const isLoggedIn = computed(
    () => !!isApiKeyLogin.value || firebaseUser.value !== null || isJwtLogin.value
  )

  const userDisplayName = computed(() => {
    if (isJwtLogin.value) {
      return jwtAuth.username.value
    }
    if (isApiKeyLogin.value) {
      return apiKeyStore.currentUser?.name
    }
    return firebaseUser.value?.displayName
  })

  const userEmail = computed(() => {
    if (isJwtLogin.value) {
      return jwtAuth.userEmail.value
    }
    if (isApiKeyLogin.value) {
      return apiKeyStore.currentUser?.email
    }
    return firebaseUser.value?.email
  })

  const providerName = computed(() => {
    if (isJwtLogin.value) {
      return jwtAuth.providerName.value
    }
    if (isApiKeyLogin.value) {
      return 'Comfy API Key'
    }

    const providerId = firebaseUser.value?.providerData[0]?.providerId
    if (providerId?.includes('google')) {
      return 'Google'
    }
    if (providerId?.includes('github')) {
      return 'GitHub'
    }
    return providerId
  })

  const providerIcon = computed(() => {
    if (isJwtLogin.value) {
      return jwtAuth.providerIcon.value
    }
    if (isApiKeyLogin.value) {
      return 'pi pi-key'
    }

    const providerId = firebaseUser.value?.providerData[0]?.providerId
    if (providerId?.includes('google')) {
      return 'pi pi-google'
    }
    if (providerId?.includes('github')) {
      return 'pi pi-github'
    }
    return 'pi pi-user'
  })

  const isEmailProvider = computed(() => {
    if (isJwtLogin.value || isApiKeyLogin.value) {
      return false
    }

    const providerId = firebaseUser.value?.providerData[0]?.providerId
    return providerId === 'password'
  })

  const userPhotoUrl = computed(() => {
    if (isJwtLogin.value || isApiKeyLogin.value) return null
    return firebaseUser.value?.photoURL
  })

  // 简化的处理函数 - 项目不需要登出功能
  const handleSignOut = async () => {
    // JWT用户不需要登出功能，保持登录状态
    console.log('JWT用户保持登录状态')
  }

  const handleSignIn = async () => {
    // JWT用户通过URL参数自动登录，不需要手动登录
    console.log('JWT用户通过URL参数自动登录')
  }

  return {
    loading: authStore.loading,
    isLoggedIn,
    isApiKeyLogin,
    isJwtLogin,
    isEmailProvider,
    userDisplayName,
    userEmail,
    userPhotoUrl,
    providerName,
    providerIcon,
    handleSignOut,
    handleSignIn,
    // JWT specific properties
    jwtAuth
  }
}
