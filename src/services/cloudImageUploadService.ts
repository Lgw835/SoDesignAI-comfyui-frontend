import { api } from '@/scripts/api'

/**
 * 云端图像上传服务
 * 自动将生成的图像上传到云端存储并存储到MongoDB
 */
export class CloudImageUploadService {
  private baseUrl = 'https://store.20250131.xyz'
  private apiUrl = `${this.baseUrl}/api/upload`
  private mongoApiUrl = '/api/comfyui/images'  // 使用相对路径，通过Vite代理
  private jwtToken: string | null = null

  /**
   * 设置JWT认证令牌
   */
  setJwtToken(token: string): void {
    this.jwtToken = token
  }

  /**
   * 上传图像到云端存储并保存到MongoDB
   */
  async uploadImage(filename: string, subfolder: string = '', type: string, imageMetadata?: ImageMetadata): Promise<void> {
    try {
      console.log(`🚀 开始上传图像: ${filename}`)

      // 从8188后端获取图像文件
      const imageBlob = await this.fetchImageFromBackend(filename, subfolder, type)

      // 尝试表单上传
      const result = await this.uploadViaFormData(imageBlob, filename)
      if (result.success && result.url) {
        await this.saveToMongoDB(filename, result.url, imageBlob, imageMetadata)
        this.logUploadSuccess(filename, result.url)
        return
      }

      // 如果表单上传失败，尝试JSON API上传
      const jsonResult = await this.uploadViaJsonApi(imageBlob, filename)
      if (jsonResult.success && jsonResult.url) {
        await this.saveToMongoDB(filename, jsonResult.url, imageBlob, imageMetadata)
        this.logUploadSuccess(filename, jsonResult.url)
      } else {
        this.logUploadError(filename, jsonResult.error || '上传失败')
      }
    } catch (error) {
      this.logUploadError(filename, String(error))
    }
  }

  /**
   * 从8188后端获取图像文件
   */
  private async fetchImageFromBackend(filename: string, subfolder: string, type: string): Promise<Blob> {
    const params = new URLSearchParams({
      filename,
      type,
      subfolder
    })
    
    const response = await fetch(api.apiURL(`/view?${params.toString()}`))
    if (!response.ok) {
      throw new Error(`获取图像失败: ${response.status} ${response.statusText}`)
    }
    
    return await response.blob()
  }

  /**
   * 表单上传方式
   */
  private async uploadViaFormData(imageBlob: Blob, filename: string): Promise<UploadResult> {
    const formData = new FormData()
    formData.append('file', imageBlob, filename)

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      headers: {
        'Accept': 'application/json'
      },
      body: formData
    })

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      }
    }

    const data = await response.json()
    return {
      success: data.success || false,
      url: data.url || '',
      error: data.error
    }
  }

  /**
   * JSON API上传方式
   */
  private async uploadViaJsonApi(imageBlob: Blob, filename: string): Promise<UploadResult> {
    // 将Blob转换为base64
    const base64Content = await this.blobToBase64(imageBlob)
    
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        fileName: filename,
        fileContent: base64Content
      })
    })

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      }
    }

    const data = await response.json()
    return {
      success: data.success || false,
      url: data.url || '',
      error: data.error
    }
  }

  /**
   * 将Blob转换为base64字符串
   */
  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // 移除data:image/xxx;base64,前缀
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  /**
   * 在终端输出上传成功信息
   */
  private logUploadSuccess(filename: string, cdnUrl: string): void {
    console.log(`✅ 图像上传成功!`)
    console.log(`📁 文件名: ${filename}`)
    console.log(`🌐 CDN链接: ${cdnUrl}`)
    console.log(`⏰ 上传时间: ${new Date().toLocaleString()}`)
    console.log('─'.repeat(60))
  }

  /**
   * 动态获取最新的JWT令牌
   */
  private getCurrentJwtToken(): string | null {
    // 如果已设置令牌，直接返回
    if (this.jwtToken) {
      return this.jwtToken
    }

    // 尝试从JWT认证存储中获取最新令牌
    try {
      // 动态导入以避免循环依赖
      const { useJwtAuthStore } = require('@/stores/jwtAuthStore')
      const jwtAuthStore = useJwtAuthStore()
      const token = jwtAuthStore.currentToken

      if (token) {
        this.jwtToken = token
        console.log('🔄 动态获取到JWT令牌')
      }

      return token
    } catch (error) {
      console.warn('获取JWT令牌失败:', error)
      return null
    }
  }

  /**
   * 保存图像信息到MongoDB
   */
  private async saveToMongoDB(filename: string, cdnUrl: string, imageBlob: Blob, metadata?: ImageMetadata): Promise<void> {
    const currentToken = this.getCurrentJwtToken()

    if (!currentToken) {
      console.warn('⚠️ 未设置JWT令牌，跳过MongoDB保存')
      console.warn('💡 请确保从iframe页面正确传递了JWT令牌')
      return
    }

    try {
      console.log(`💾 开始保存图像信息到MongoDB: ${filename}`)

      // 获取图像尺寸
      const { width, height } = await this.getImageDimensions(imageBlob)

      // 获取当前时间戳
      const now = Date.now() / 1000 // Unix时间戳（秒）

      const imageData: MongoImageData = {
        workflow_id: metadata?.workflowId || `workflow_${Date.now()}`,
        workflow_name: metadata?.workflowName || '图像生成',
        prompt: metadata?.prompt || '',
        negative_prompt: metadata?.negativePrompt || '',

        // 图像基本信息
        width,
        height,
        batch_size: metadata?.batchSize || 1,
        file_size: imageBlob.size,
        format: this.getImageFormat(filename),
        filename_prefix: metadata?.filenamePrefix || 'ComfyUI',

        // KSampler核心参数
        seed: metadata?.seed || Math.floor(Math.random() * 1000000),
        steps: metadata?.steps || 20,
        cfg_scale: metadata?.cfgScale || 7.5,
        sampler_name: metadata?.samplerName || 'euler',
        scheduler: metadata?.scheduler || 'normal',
        denoise: metadata?.denoise || 1.0,

        // KSamplerAdvanced参数
        add_noise: true,
        start_at_step: 0,
        end_at_step: 10000,
        return_with_leftover_noise: false,

        // 模型相关参数
        checkpoint_name: metadata?.checkpointName || 'unknown.safetensors',
        vae_name: metadata?.vaeName || 'default_vae.safetensors',
        clip_skip: metadata?.clipSkip || 1,

        // 系统参数
        preview_format: 'JPEG',
        float_precision: 'fp16',

        // 扩展参数
        parameters: {
          ...metadata?.parameters || {},
          extraction_time: new Date().toISOString(),
          frontend_version: '1.24.0',
          auto_upload: true
        },
        generation_time: metadata?.generationTime || 0,
        points_cost: metadata?.pointsCost || 1,

        // 状态和标签
        status: 'completed',
        tags: metadata?.tags || ['comfyui', 'generated'],
        is_public: false,
        likes_count: 0,
        downloads_count: 0,

        // 时间戳
        created_at: now,
        updated_at: now,

        // 图像URL信息
        image_path: `/${filename}`,
        image_url: cdnUrl,
        thumbnail_url: cdnUrl, // 使用相同URL作为缩略图

        // 保持向后兼容的images数组格式
        images: [{
          image_path: `/${filename}`,
          image_url: cdnUrl,
          thumbnail_url: cdnUrl,
          width,
          height,
          file_size: imageBlob.size,
          format: this.getImageFormat(filename)
        }]
      }

      const response = await fetch(this.mongoApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify(imageData)
      })

      if (response.ok) {
        const result = await response.json()
        console.log(`✅ MongoDB保存成功!`)
        console.log(`📊 保存结果:`, result)
        console.log(`🆔 图像ID: ${result.image_ids?.[0] || 'unknown'}`)
        console.log(`📝 提示词: ${imageData.prompt?.substring(0, 100)}${imageData.prompt?.length > 100 ? '...' : ''}`)
        console.log(`🎲 种子值: ${imageData.seed}`)
        console.log(`🔧 参数: ${imageData.steps}步, CFG=${imageData.cfg_scale}, ${imageData.sampler_name}`)
        console.log(`🏷️ 标签: ${imageData.tags.join(', ')}`)

        // 图像保存成功后，扣除用户积分
        await this.deductPoints(metadata)
      } else {
        const errorText = await response.text()
        console.error(`❌ MongoDB保存失败: ${response.status} ${response.statusText}`)
        console.error(`💥 错误详情: ${errorText}`)
      }
    } catch (error) {
      console.error(`❌ MongoDB保存异常:`, error)
    }
  }

  /**
   * 获取图像尺寸
   */
  private async getImageDimensions(imageBlob: Blob): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        resolve({ width: img.width, height: img.height })
      }
      img.onerror = () => {
        resolve({ width: 1024, height: 1024 }) // 默认尺寸
      }
      img.src = URL.createObjectURL(imageBlob)
    })
  }

  /**
   * 获取图像格式
   */
  private getImageFormat(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase()
    return ext || 'png'
  }

  /**
   * 扣除用户积分
   */
  private async deductPoints(metadata?: ImageMetadata): Promise<void> {
    const currentToken = this.getCurrentJwtToken()

    if (!currentToken) {
      console.warn('⚠️ 未设置JWT令牌，跳过积分扣除')
      return
    }

    try {
      console.log('💰 开始扣除用户积分...')

      // 生成动态的扣除原因
      const modelName = metadata?.checkpointName || 'unknown'
      const reason = `ComfyUI图像生成 - ${modelName}`

      const deductRequest: DeductPointsRequest = {
        points: 5,
        reason: reason
      }

      const response = await fetch('/api/comfyui/deduct_points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify(deductRequest)
      })

      if (response.ok) {
        const result = await response.json() as DeductPointsSuccessResponse
        console.log('✅ 积分扣除成功!')
        console.log(`💰 扣除积分: ${result.deducted_points}`)
        console.log(`💳 剩余积分: ${result.remaining_points}`)
        console.log(`📝 扣除原因: ${result.reason}`)
        console.log(`💬 系统消息: ${result.message}`)
      } else {
        const errorResult = await response.json() as DeductPointsErrorResponse
        console.error('❌ 积分扣除失败!')
        console.error(`💥 错误信息: ${errorResult.error}`)
        console.error(`💳 当前积分: ${errorResult.current_points}`)
        console.error(`💰 需要积分: ${errorResult.required_points}`)
        console.error('💡 提示: 请充值积分后继续使用')
      }
    } catch (error) {
      console.error('❌ 积分扣除异常:', error)
      console.error('💡 提示: 请检查网络连接或联系管理员')
    }
  }

  /**
   * 在终端输出上传失败信息
   */
  private logUploadError(filename: string, error: string): void {
    console.error(`❌ 图像上传失败!`)
    console.error(`📁 文件名: ${filename}`)
    console.error(`💥 错误信息: ${error}`)
    console.error(`⏰ 失败时间: ${new Date().toLocaleString()}`)
    console.error('─'.repeat(60))
  }
}

/**
 * 上传结果接口
 */
interface UploadResult {
  success: boolean
  url?: string
  error?: string
}

/**
 * 图像元数据接口
 */
export interface ImageMetadata {
  workflowId?: string
  workflowName?: string
  prompt?: string
  negativePrompt?: string
  seed?: number
  steps?: number
  cfgScale?: number
  samplerName?: string
  scheduler?: string
  denoise?: number
  checkpointName?: string
  vaeName?: string
  clipSkip?: number
  batchSize?: number
  filenamePrefix?: string
  parameters?: Record<string, any>
  generationTime?: number
  pointsCost?: number
  tags?: string[]
}

/**
 * 积分扣除请求接口
 */
interface DeductPointsRequest {
  points: number
  reason: string
}

/**
 * 积分扣除成功响应接口
 */
interface DeductPointsSuccessResponse {
  success: true
  message: string
  deducted_points: number
  remaining_points: number
  reason: string
}

/**
 * 积分扣除错误响应接口
 */
interface DeductPointsErrorResponse {
  error: string
  current_points: number
  required_points: number
}

/**
 * MongoDB图像数据接口
 */
interface MongoImageData {
  // 工作流信息
  workflow_id: string
  workflow_name: string
  prompt: string
  negative_prompt: string

  // 图像基本信息
  width: number
  height: number
  batch_size: number
  file_size: number
  format: string
  filename_prefix: string

  // KSampler核心参数
  seed: number
  steps: number
  cfg_scale: number
  sampler_name: string
  scheduler: string
  denoise: number

  // KSamplerAdvanced参数
  add_noise: boolean
  start_at_step: number
  end_at_step: number
  return_with_leftover_noise: boolean

  // 模型相关参数
  checkpoint_name: string
  vae_name: string
  clip_skip: number

  // 系统参数
  preview_format: string
  float_precision: string

  // 扩展参数
  parameters: Record<string, any>
  generation_time: number
  points_cost: number

  // 状态和标签
  status: string
  tags: string[]
  is_public: boolean
  likes_count: number
  downloads_count: number

  // 时间戳
  created_at: number
  updated_at: number

  // 图像URL信息
  image_path: string
  image_url: string
  thumbnail_url: string

  // 向后兼容的images数组
  images: Array<{
    image_path: string
    image_url: string
    thumbnail_url: string
    width: number
    height: number
    file_size: number
    format: string
  }>
}

// 导出单例实例
export const cloudImageUploadService = new CloudImageUploadService()
