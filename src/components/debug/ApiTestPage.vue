<template>
  <div class="api-test-page">
    <h2>API 连接测试页面</h2>
    
    <div class="test-section">
      <h3>JWT 认证状态</h3>
      <div class="status-info">
        <p><strong>认证状态:</strong> {{ isAuthenticated ? '已认证' : '未认证' }}</p>
        <p><strong>用户名:</strong> {{ username || '未知' }}</p>
        <p><strong>用户ID:</strong> {{ userId || '未知' }}</p>
        <p><strong>邮箱:</strong> {{ userEmail || '未知' }}</p>
      </div>

      <div class="token-controls">
        <button @click="setTestToken" class="test-button">设置测试Token</button>
        <button @click="clearToken" class="test-button">清除Token</button>
        <button @click="refreshAuth" class="test-button">刷新认证状态</button>
      </div>
    </div>

    <div class="test-section">
      <h3>API 测试</h3>
      <button @click="testApiConnection" :disabled="isLoading" class="test-button">
        {{ isLoading ? '测试中...' : '测试 API 连接' }}
      </button>
      
      <div v-if="testResult" class="test-result">
        <h4>测试结果:</h4>
        <pre>{{ testResult }}</pre>
      </div>
      
      <div v-if="errorMessage" class="error-message">
        <h4>错误信息:</h4>
        <pre>{{ errorMessage }}</pre>
      </div>
    </div>

    <div class="test-section">
      <h3>获取用户图像历史</h3>
      <button @click="testGetUserImages" :disabled="isLoading" class="test-button">
        {{ isLoading ? '获取中...' : '获取用户图像历史' }}
      </button>
      
      <div v-if="userImages.length > 0" class="images-result">
        <h4>获取到的图像数据 ({{ userImages.length }} 张):</h4>
        <div v-for="(image, index) in userImages" :key="image._id" class="image-item">
          <h5>图像 {{ index + 1 }}</h5>
          <div class="image-details">
            <p><strong>ID:</strong> {{ image._id }}</p>
            <p><strong>用户名:</strong> {{ image.username }}</p>
            <p><strong>图像URL:</strong> <a :href="image.image_url" target="_blank">{{ image.image_url }}</a></p>
            <p><strong>缩略图URL:</strong> <a :href="image.thumbnail_url" target="_blank">{{ image.thumbnail_url }}</a></p>
            <p><strong>工作流名称:</strong> {{ image.workflow_name }}</p>
            <p><strong>状态:</strong> {{ image.status }}</p>
            <p><strong>尺寸:</strong> {{ image.width }} x {{ image.height }}</p>
            <p><strong>创建时间:</strong> {{ new Date(image.created_at * 1000).toLocaleString() }}</p>
            <p><strong>积分消耗:</strong> {{ image.points_cost }}</p>
          </div>
          
          <div v-if="image.image_url" class="image-preview">
            <img :src="image.image_url" :alt="`图像 ${index + 1}`" style="max-width: 200px; max-height: 200px;" />
          </div>
        </div>
      </div>
    </div>

    <div class="console-section">
      <h3>控制台日志</h3>
      <p>请打开浏览器开发者工具的控制台查看详细的API调用日志。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useJwtAuth } from '@/composables/auth/useJwtAuth'
import { useUserImageService, type UserImage } from '@/services/userImageService'
import { setTestToken as setTestTokenUtil, clearToken as clearTokenUtil } from '@/utils/testToken'
import { useJwtAuthStore } from '@/stores/jwtAuthStore'

const jwtAuth = useJwtAuth()
const jwtAuthStore = useJwtAuthStore()
const userImageService = useUserImageService()

const isLoading = ref(false)
const testResult = ref('')
const errorMessage = ref('')
const userImages = ref<UserImage[]>([])

// JWT 认证状态
const { isAuthenticated, username, userId, userEmail } = jwtAuth

// Token 管理函数
const setTestToken = async () => {
  setTestTokenUtil()
  await jwtAuthStore.initialize()
  console.log('🔄 认证状态已刷新')
}

const clearToken = async () => {
  clearTokenUtil()
  await jwtAuthStore.logout()
  console.log('🔄 认证状态已清除')
}

const refreshAuth = async () => {
  await jwtAuthStore.initialize()
  console.log('🔄 认证状态已刷新')
}

const testApiConnection = async () => {
  isLoading.value = true
  testResult.value = ''
  errorMessage.value = ''
  
  console.log('🧪 开始API连接测试...')
  
  try {
    // 检查JWT认证
    if (!isAuthenticated.value) {
      throw new Error('用户未认证')
    }
    
    // 获取认证头
    const authHeader = jwtAuth.getAuthHeader()
    if (!authHeader) {
      throw new Error('无法获取认证头')
    }
    
    console.log('🔑 认证头:', authHeader)
    
    // 测试API连接 - 使用相对路径利用vite代理
    const url = `/api/comfyui/images?limit=1&status=completed`
    
    console.log('🌐 测试URL:', url)
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader
      }
    })
    
    console.log('📨 响应状态:', response.status, response.statusText)
    console.log('📨 响应头:', Object.fromEntries(response.headers.entries()))
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ API响应错误:', errorText)
      throw new Error(`API请求失败: ${response.status} ${response.statusText}\n${errorText}`)
    }
    
    const result = await response.json()
    console.log('📦 API响应数据:', result)
    
    testResult.value = JSON.stringify(result, null, 2)
    
  } catch (error) {
    console.error('❌ API测试失败:', error)
    errorMessage.value = error instanceof Error ? error.message : String(error)
  } finally {
    isLoading.value = false
  }
}

const testGetUserImages = async () => {
  isLoading.value = true
  userImages.value = []
  errorMessage.value = ''
  
  console.log('🖼️ 开始获取用户图像历史测试...')
  
  try {
    const images = await userImageService.getUserImages({
      limit: 10,
      status: 'completed'
    })
    
    console.log('✅ 获取到图像数据:', images)
    userImages.value = images
    
  } catch (error) {
    console.error('❌ 获取用户图像失败:', error)
    errorMessage.value = error instanceof Error ? error.message : String(error)
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.api-test-page {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.test-section {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: #f9f9f9;
}

.status-info p {
  margin: 5px 0;
}

.token-controls {
  margin-top: 15px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.test-button {
  padding: 10px 20px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.test-button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.test-button:hover:not(:disabled) {
  background-color: #0056b3;
}

.test-result, .error-message {
  margin-top: 15px;
  padding: 15px;
  border-radius: 4px;
}

.test-result {
  background-color: #d4edda;
  border: 1px solid #c3e6cb;
}

.error-message {
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
}

.test-result pre, .error-message pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 0;
  font-size: 12px;
}

.images-result {
  margin-top: 15px;
}

.image-item {
  margin-bottom: 20px;
  padding: 15px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: white;
}

.image-details p {
  margin: 5px 0;
  font-size: 14px;
}

.image-details a {
  color: #007bff;
  text-decoration: none;
  word-break: break-all;
}

.image-details a:hover {
  text-decoration: underline;
}

.image-preview {
  margin-top: 10px;
}

.image-preview img {
  border: 1px solid #ddd;
  border-radius: 4px;
}

.console-section {
  background-color: #fff3cd;
  border: 1px solid #ffeaa7;
  color: #856404;
}
</style>
