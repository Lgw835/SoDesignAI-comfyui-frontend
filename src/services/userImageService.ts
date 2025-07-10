import { ref } from 'vue'
import { useJwtAuth } from '@/composables/auth/useJwtAuth'

/**
 * 用户图像接口响应类型
 */
export interface UserImage {
  _id: string
  user_id: string
  username: string
  image_path: string
  image_url: string
  thumbnail_url: string
  workflow_id: string
  workflow_name: string
  prompt: string
  negative_prompt: string
  parameters: {
    model: string
    scheduler: string
    [key: string]: any
  }
  width: number
  height: number
  file_size: number
  format: string
  seed: number
  steps: number
  cfg_scale: number
  sampler: string
  model: string
  generation_time: number
  points_cost: number
  status: 'completed' | 'processing' | 'failed'
  tags: string[]
  is_public: boolean
  likes_count: number
  downloads_count: number
  created_at: number
  updated_at: number
}

export interface UserImagesResponse {
  success: boolean
  data: {
    images: UserImage[]
    pagination: {
      current_page: number
      total_pages: number
      total_count: number
      page_size: number
      has_next: boolean
      has_prev: boolean
    }
  }
}

export interface GetUserImagesParams {
  page?: number
  limit?: number
  status?: 'completed' | 'processing' | 'failed'
  start_time?: number
  end_time?: number
}

/**
 * 用户图像服务
 */
export const useUserImageService = () => {
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const jwtAuth = useJwtAuth()

  /**
   * 获取用户图像列表
   */
  const getUserImages = async (params: GetUserImagesParams = {}): Promise<UserImage[]> => {
    isLoading.value = true
    error.value = null

    console.log('🚀 开始获取用户图像历史...')
    console.log('📋 请求参数:', params)

    try {
      // 检查JWT认证
      if (!jwtAuth.isAuthenticated.value) {
        console.error('❌ JWT认证失败: 用户未认证')
        throw new Error('用户未认证')
      }
      console.log('✅ JWT认证通过')

      // 构建查询参数
      const queryParams = new URLSearchParams()
      if (params.page) queryParams.append('page', params.page.toString())
      if (params.limit) queryParams.append('limit', params.limit.toString())
      if (params.status) queryParams.append('status', params.status)
      if (params.start_time) queryParams.append('start_time', params.start_time.toString())
      if (params.end_time) queryParams.append('end_time', params.end_time.toString())

      // 使用相对路径，利用vite代理避免CORS问题
      const url = `/api/comfyui/images?${queryParams.toString()}`
      console.log('🌐 请求URL (使用代理):', url)

      // 获取认证头
      const authHeader = jwtAuth.getAuthHeader()
      if (!authHeader) {
        console.error('❌ 无法获取JWT认证头')
        throw new Error('无法获取认证头')
      }
      console.log('🔑 认证头已获取:', Object.keys(authHeader))

      console.log('📡 发送API请求...')

      // 发送请求
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader
        }
      })

      console.log('📨 收到响应:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ API请求失败:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        })
        throw new Error(`请求失败: ${response.status} ${response.statusText}`)
      }

      const result: UserImagesResponse = await response.json()

      // 打印完整的API响应数据
      console.log('📦 完整API响应数据:', JSON.stringify(result, null, 2))
      console.log('📊 API响应概览:', {
        success: result.success,
        imageCount: result.data?.images?.length || 0,
        pagination: result.data?.pagination
      })

      if (!result.success) {
        console.error('❌ API返回失败状态:', result)
        throw new Error('API返回失败状态')
      }

      // 详细打印每个图像的数据，特别是image_url字段
      if (result.data.images && result.data.images.length > 0) {
        console.log('🖼️ 详细图像数据:')
        result.data.images.forEach((image, index) => {
          console.log(`📸 图像 ${index + 1}:`, {
            _id: image._id,
            user_id: image.user_id,
            username: image.username,
            image_path: image.image_path,
            image_url: image.image_url, // 重点关注的字段
            thumbnail_url: image.thumbnail_url,
            workflow_id: image.workflow_id,
            workflow_name: image.workflow_name,
            prompt: image.prompt?.substring(0, 100) + (image.prompt?.length > 100 ? '...' : ''),
            negative_prompt: image.negative_prompt?.substring(0, 50) + (image.negative_prompt?.length > 50 ? '...' : ''),
            parameters: image.parameters,
            width: image.width,
            height: image.height,
            file_size: image.file_size,
            format: image.format,
            seed: image.seed,
            steps: image.steps,
            cfg_scale: image.cfg_scale,
            sampler: image.sampler,
            model: image.model,
            generation_time: image.generation_time,
            points_cost: image.points_cost,
            status: image.status,
            tags: image.tags,
            is_public: image.is_public,
            likes_count: image.likes_count,
            downloads_count: image.downloads_count,
            created_at: image.created_at,
            updated_at: image.updated_at
          })

          // 特别强调image_url字段
          console.log(`🔗 图像 ${index + 1} 的 image_url:`, image.image_url)
        })
      }

      console.log('✅ 成功获取用户图像:', result.data.images.length, '张图片')
      return result.data.images
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取用户图像失败'
      error.value = errorMessage

      // 打印完整的错误信息
      console.error('❌ 完整错误信息:', {
        error: err,
        message: errorMessage,
        stack: err instanceof Error ? err.stack : undefined
      })

      // 详细的错误日志
      if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
        console.error('🚫 CORS错误: 无法连接到API服务器')
        console.error('🔍 错误详情:', err)
        console.error('💡 可能的解决方案:')
        console.error('   1. 确保API服务器 http://192.168.1.17:5000 正在运行')
        console.error('   2. 检查API服务器是否配置了CORS允许 http://localhost:5173')
        console.error('   3. 在API服务器响应头中添加:')
        console.error('      Access-Control-Allow-Origin: http://localhost:5173')
        console.error('      Access-Control-Allow-Methods: GET, POST, OPTIONS')
        console.error('      Access-Control-Allow-Headers: Content-Type, Authorization')
        console.error('📋 返回空的历史图像列表，保持生图历史状态')

        // 尝试打印任何可能的响应数据
        console.error('🔍 尝试检查是否有部分响应数据...')
      } else {
        console.error('❌ 获取用户图像失败:', err)
        console.error('🔍 非CORS错误，详细信息:', {
          name: err instanceof Error ? err.name : 'Unknown',
          message: err instanceof Error ? err.message : String(err),
          cause: err instanceof Error ? err.cause : undefined
        })
      }

      // 始终返回空数组，不抛出异常
      console.error('📋 由于错误，返回空的图像数组')
      return []
    } finally {
      isLoading.value = false
      console.log('🏁 用户图像获取流程结束')
    }
  }

  /**
   * 获取用户图像（带分页信息）
   */
  const getUserImagesWithPagination = async (params: GetUserImagesParams = {}): Promise<UserImagesResponse['data'] | null> => {
    isLoading.value = true
    error.value = null

    console.log('🚀 开始获取用户图像历史（带分页）...')

    try {
      // 检查JWT认证
      if (!jwtAuth.isAuthenticated.value) {
        console.error('❌ JWT认证失败: 用户未认证')
        throw new Error('用户未认证')
      }

      // 构建查询参数
      const queryParams = new URLSearchParams()
      if (params.page) queryParams.append('page', params.page.toString())
      if (params.limit) queryParams.append('limit', params.limit.toString())
      if (params.status) queryParams.append('status', params.status)
      if (params.start_time) queryParams.append('start_time', params.start_time.toString())
      if (params.end_time) queryParams.append('end_time', params.end_time.toString())

      // 使用相对路径，利用vite代理避免CORS问题
      const url = `/api/comfyui/images?${queryParams.toString()}`
      console.log('🌐 请求URL (使用代理):', url)

      // 获取认证头
      const authHeader = jwtAuth.getAuthHeader()
      if (!authHeader) {
        console.error('❌ 无法获取JWT认证头')
        throw new Error('无法获取认证头')
      }

      // 发送请求
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader
        }
      })

      if (!response.ok) {
        console.error('❌ API请求失败:', response.status, response.statusText)
        throw new Error(`请求失败: ${response.status} ${response.statusText}`)
      }

      const result: UserImagesResponse = await response.json()

      // 打印完整的API响应数据（带分页）
      console.log('📦 完整API响应数据（带分页）:', JSON.stringify(result, null, 2))
      console.log('📊 API响应概览（带分页）:', {
        success: result.success,
        imageCount: result.data?.images?.length || 0,
        pagination: result.data?.pagination
      })

      if (!result.success) {
        console.error('❌ API返回失败状态:', result)
        throw new Error('API返回失败状态')
      }

      // 详细打印每个图像的数据（带分页）
      if (result.data.images && result.data.images.length > 0) {
        console.log('🖼️ 详细图像数据（带分页）:')
        result.data.images.forEach((image, index) => {
          console.log(`📸 图像 ${index + 1} (带分页):`, {
            _id: image._id,
            image_url: image.image_url, // 重点关注的字段
            thumbnail_url: image.thumbnail_url,
            workflow_name: image.workflow_name,
            status: image.status,
            created_at: image.created_at
          })
          console.log(`🔗 图像 ${index + 1} 的 image_url (带分页):`, image.image_url)
        })
      }

      console.log('✅ 成功获取用户图像（带分页）')
      return result.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取用户图像失败'
      error.value = errorMessage

      if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
        console.error('🚫 CORS错误: 无法连接到API服务器')
        console.error('📋 返回null，保持生图历史状态')
      } else {
        console.error('❌ 获取用户图像失败:', err)
      }

      // 始终返回null，不抛出异常
      return null
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading,
    error,
    getUserImages,
    getUserImagesWithPagination
  }
}
