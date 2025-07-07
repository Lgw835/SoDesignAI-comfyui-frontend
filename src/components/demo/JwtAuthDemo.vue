<template>
  <div class="jwt-auth-demo p-4">
    <h2 class="text-2xl font-bold mb-4">JWT Authentication Demo</h2>
    
    <!-- Authentication Status -->
    <div class="mb-6">
      <h3 class="text-lg font-semibold mb-2">Authentication Status</h3>
      <div class="bg-gray-100 p-4 rounded">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <strong>Is Authenticated:</strong> 
            <span :class="jwtAuth.isAuthenticated.value ? 'text-green-600' : 'text-red-600'">
              {{ jwtAuth.isAuthenticated.value ? 'Yes' : 'No' }}
            </span>
          </div>
          <div>
            <strong>Is Initialized:</strong> 
            <span :class="jwtAuth.isInitialized.value ? 'text-green-600' : 'text-red-600'">
              {{ jwtAuth.isInitialized.value ? 'Yes' : 'No' }}
            </span>
          </div>
          <div>
            <strong>Loading:</strong> 
            <span>{{ jwtAuth.loading.value ? 'Yes' : 'No' }}</span>
          </div>
          <div>
            <strong>Has Token:</strong> 
            <span>{{ !!jwtAuthStore.currentToken ? 'Yes' : 'No' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- User Information -->
    <div v-if="jwtAuth.isAuthenticated.value" class="mb-6">
      <h3 class="text-lg font-semibold mb-2">User Information</h3>
      <div class="bg-blue-50 p-4 rounded">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <strong>User ID:</strong> {{ jwtAuth.userId.value }}
          </div>
          <div>
            <strong>Username:</strong> {{ jwtAuth.username.value }}
          </div>
          <div>
            <strong>Email:</strong> {{ jwtAuth.userEmail.value }}
          </div>
          <div>
            <strong>Role:</strong> {{ jwtAuth.userRole.value }}
          </div>
        </div>
        
        <div class="mt-4">
          <strong>Permissions:</strong>
          <div class="flex flex-wrap gap-2 mt-2">
            <span
              v-for="permission in jwtAuth.userPermissions.value"
              :key="permission"
              class="bg-blue-200 text-blue-800 px-2 py-1 rounded text-sm"
            >
              {{ permission }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Permission Tests -->
    <div v-if="jwtAuth.isAuthenticated.value" class="mb-6">
      <h3 class="text-lg font-semibold mb-2">Permission Tests</h3>
      <div class="bg-yellow-50 p-4 rounded">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <strong>Can Create Workflow:</strong>
            <span :class="jwtAuth.hasPermission('workflow_create') ? 'text-green-600' : 'text-red-600'">
              {{ jwtAuth.hasPermission('workflow_create') ? 'Yes' : 'No' }}
            </span>
          </div>
          <div>
            <strong>Can Edit Workflow:</strong>
            <span :class="jwtAuth.hasPermission('workflow_edit') ? 'text-green-600' : 'text-red-600'">
              {{ jwtAuth.hasPermission('workflow_edit') ? 'Yes' : 'No' }}
            </span>
          </div>
          <div>
            <strong>Can View Workflow:</strong>
            <span :class="jwtAuth.hasPermission('workflow_view') ? 'text-green-600' : 'text-red-600'">
              {{ jwtAuth.hasPermission('workflow_view') ? 'Yes' : 'No' }}
            </span>
          </div>
          <div>
            <strong>Is Admin:</strong>
            <span :class="jwtAuth.hasRole('admin') ? 'text-green-600' : 'text-red-600'">
              {{ jwtAuth.hasRole('admin') ? 'Yes' : 'No' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="mb-6">
      <h3 class="text-lg font-semibold mb-2">Actions</h3>
      <div class="flex gap-2">
        <Button
          label="Initialize Auth"
          icon="pi pi-refresh"
          @click="initializeAuth"
          :loading="jwtAuth.loading.value"
        />
        <Button
          v-if="jwtAuth.isAuthenticated.value"
          label="Refresh Verification"
          icon="pi pi-sync"
          severity="secondary"
          @click="refreshVerification"
        />
        <Button
          v-if="jwtAuth.isAuthenticated.value"
          label="Test API Call"
          icon="pi pi-send"
          severity="info"
          @click="testApiCall"
        />
        <Button
          v-if="jwtAuth.isAuthenticated.value"
          label="Logout"
          icon="pi pi-sign-out"
          severity="danger"
          @click="logout"
        />
      </div>
    </div>

    <!-- API Test Results -->
    <div v-if="apiTestResult" class="mb-6">
      <h3 class="text-lg font-semibold mb-2">API Test Result</h3>
      <div class="bg-gray-100 p-4 rounded">
        <pre>{{ apiTestResult }}</pre>
      </div>
    </div>

    <!-- Raw Token Information -->
    <div v-if="jwtAuthStore.currentToken" class="mb-6">
      <h3 class="text-lg font-semibold mb-2">Raw Token Information</h3>
      <div class="bg-gray-100 p-4 rounded">
        <div class="mb-2">
          <strong>Token (first 50 chars):</strong>
          <code class="block mt-1 text-sm">{{ jwtAuthStore.currentToken.substring(0, 50) }}...</code>
        </div>
        <div>
          <strong>Full User Object:</strong>
          <pre class="text-sm mt-1">{{ JSON.stringify(jwtAuth.currentUser.value, null, 2) }}</pre>
        </div>
      </div>
    </div>

    <!-- Not Authenticated Message -->
    <div v-if="!jwtAuth.isAuthenticated.value" class="mb-6">
      <div class="bg-red-50 border border-red-200 p-4 rounded">
        <h3 class="text-lg font-semibold text-red-800 mb-2">Not Authenticated</h3>
        <p class="text-red-700">
          No valid JWT token found. To test JWT authentication:
        </p>
        <ol class="list-decimal list-inside mt-2 text-red-700">
          <li>Open the test page: <code>test-jwt.html</code></li>
          <li>Generate a test token</li>
          <li>Open ComfyUI with the token parameter</li>
        </ol>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button'
import { ref } from 'vue'

import { useJwtAuth } from '@/composables/auth/useJwtAuth'
import { useJwtAuthStore } from '@/stores/jwtAuthStore'

const jwtAuth = useJwtAuth()
const jwtAuthStore = useJwtAuthStore()
const apiTestResult = ref<string | null>(null)

const initializeAuth = async () => {
  try {
    const result = await jwtAuth.initialize()
    console.log('JWT initialization result:', result)
  } catch (error) {
    console.error('JWT initialization error:', error)
  }
}

const refreshVerification = async () => {
  try {
    const result = await jwtAuth.refreshVerification()
    console.log('JWT refresh result:', result)
  } catch (error) {
    console.error('JWT refresh error:', error)
  }
}

const testApiCall = async () => {
  try {
    // Test making an authenticated API call
    const response = await jwtAuth.authenticatedFetch('/api/test', {
      method: 'GET'
    })
    
    apiTestResult.value = `Status: ${response.status}\nHeaders: ${JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2)}`
  } catch (error) {
    apiTestResult.value = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
  }
}

const logout = async () => {
  try {
    await jwtAuth.logout()
  } catch (error) {
    console.error('Logout error:', error)
  }
}
</script>

<style scoped>
.jwt-auth-demo {
  max-width: 800px;
  margin: 0 auto;
}

code {
  background-color: #f1f5f9;
  padding: 2px 4px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
}

pre {
  background-color: #f8fafc;
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
  font-size: 12px;
  line-height: 1.4;
}
</style>
