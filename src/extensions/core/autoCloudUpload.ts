import { app } from '@/scripts/app'
import { api } from '@/scripts/api'
import { cloudImageUploadService, type ImageMetadata } from '@/services/cloudImageUploadService'
import type { ExecutedWsMessage } from '@/schemas/apiSchema'
import { useJwtAuthStore } from '@/stores/jwtAuthStore'
import { debugJwtAuth } from '@/utils/debugJwtAuth'

/**
 * 自动云端上传扩展
 * 监听图像生成完成事件，自动上传到云端存储
 */

// 跟踪已处理的输出，避免重复上传
const processedOutputs = new Set<string>()

/**
 * 检查输出是否为图像类型
 */
function isImageOutput(output: any): boolean {
  if (!output || typeof output !== 'object') return false
  
  // 检查是否有images字段
  if (output.images && Array.isArray(output.images)) {
    return output.images.length > 0
  }
  
  return false
}

/**
 * 获取JWT令牌
 */
function getJwtToken(): string | null {
  // 从JWT认证存储中获取令牌
  const jwtAuthStore = useJwtAuthStore()
  return jwtAuthStore.currentToken
}

/**
 * 从工作流中提取元数据
 */
function extractMetadataFromWorkflow(nodeId: string | number, promptId: string): ImageMetadata {
  try {
    // 获取当前工作流和节点信息
    const workflow = app.graph?.serialize()
    const allNodes = app.graph?.nodes || []

    console.log(`🔍 开始提取工作流元数据，节点ID: ${nodeId}`)

    const metadata: ImageMetadata = {
      workflowId: promptId,
      workflowName: String(workflow?.extra?.title || workflow?.extra?.name || '图像生成'),
      prompt: '',
      negativePrompt: '',
      seed: Math.floor(Math.random() * 1000000),
      steps: 20,
      cfgScale: 7.5,
      samplerName: 'euler',
      scheduler: 'normal',
      denoise: 1.0,
      checkpointName: 'unknown.safetensors',
      vaeName: 'default_vae.safetensors',
      clipSkip: 1,
      batchSize: 1,
      filenamePrefix: 'ComfyUI',
      generationTime: 0,
      pointsCost: 1,
      tags: ['comfyui', 'generated'],
      parameters: {}
    }

    // 遍历所有节点，提取关键参数
    for (const node of allNodes) {
      const nodeType = node.type || node.constructor?.name || ''

      // 提取文本提示词
      if (nodeType.includes('CLIPTextEncode') || nodeType.includes('PromptNode') || nodeType.includes('TextInput')) {
        if (node.widgets) {
          for (const widget of node.widgets) {
            if (widget.name === 'text' && widget.value) {
              const text = String(widget.value).trim()
              if (text) {
                // 判断是正面还是负面提示词（简单启发式）
                if (text.toLowerCase().includes('bad') || text.toLowerCase().includes('worst') ||
                    text.toLowerCase().includes('low quality') || text.toLowerCase().includes('blurry')) {
                  metadata.negativePrompt = text
                } else if (!metadata.prompt || text.length > metadata.prompt.length) {
                  metadata.prompt = text
                }
              }
            }
          }
        }
      }

      // 提取KSampler参数
      if (nodeType.includes('KSampler')) {
        if (node.widgets) {
          for (const widget of node.widgets) {
            switch (widget.name) {
              case 'seed':
                metadata.seed = Number(widget.value) || metadata.seed
                break
              case 'steps':
                metadata.steps = Number(widget.value) || metadata.steps
                break
              case 'cfg':
                metadata.cfgScale = Number(widget.value) || metadata.cfgScale
                break
              case 'sampler_name':
                metadata.samplerName = String(widget.value) || metadata.samplerName
                break
              case 'scheduler':
                metadata.scheduler = String(widget.value) || metadata.scheduler
                break
              case 'denoise':
                metadata.denoise = Number(widget.value) || metadata.denoise
                break
            }
          }
        }
      }

      // 提取模型信息
      if (nodeType.includes('CheckpointLoader') || nodeType.includes('ModelLoader')) {
        if (node.widgets) {
          for (const widget of node.widgets) {
            if (widget.name === 'ckpt_name' || widget.name === 'model_name') {
              metadata.checkpointName = String(widget.value) || metadata.checkpointName
            }
          }
        }
      }

      // 提取VAE信息
      if (nodeType.includes('VAELoader')) {
        if (node.widgets) {
          for (const widget of node.widgets) {
            if (widget.name === 'vae_name') {
              metadata.vaeName = String(widget.value) || metadata.vaeName
            }
          }
        }
      }

      // 提取批次大小
      if (nodeType.includes('EmptyLatentImage') || nodeType.includes('LatentImage')) {
        if (node.widgets) {
          for (const widget of node.widgets) {
            if (widget.name === 'batch_size') {
              metadata.batchSize = Number(widget.value) || metadata.batchSize
            }
          }
        }
      }

      // 提取保存前缀
      if (nodeType.includes('SaveImage') || nodeType.includes('PreviewImage')) {
        if (node.widgets) {
          for (const widget of node.widgets) {
            if (widget.name === 'filename_prefix') {
              metadata.filenamePrefix = String(widget.value) || metadata.filenamePrefix
            }
          }
        }
      }
    }

    // 根据提取的信息生成更智能的标签
    const tags = ['comfyui', 'generated']
    if (metadata.prompt) {
      if (metadata.prompt.toLowerCase().includes('portrait')) tags.push('portrait')
      if (metadata.prompt.toLowerCase().includes('landscape')) tags.push('landscape')
      if (metadata.prompt.toLowerCase().includes('anime')) tags.push('anime')
      if (metadata.prompt.toLowerCase().includes('realistic')) tags.push('realistic')
      if (metadata.prompt.toLowerCase().includes('art')) tags.push('art')
    }
    metadata.tags = tags

    // 存储额外参数
    metadata.parameters = {
      nodeCount: allNodes.length,
      workflowComplexity: allNodes.length > 10 ? 'complex' : allNodes.length > 5 ? 'medium' : 'simple',
      hasControlNet: allNodes.some(n => n.type?.includes('ControlNet')),
      hasLora: allNodes.some(n => n.type?.includes('LoRA')),
      hasUpscaler: allNodes.some(n => n.type?.includes('Upscale'))
    }

    console.log('📊 提取的元数据:', {
      prompt: metadata.prompt?.substring(0, 50) + '...',
      negativePrompt: metadata.negativePrompt?.substring(0, 30) + '...',
      seed: metadata.seed,
      steps: metadata.steps,
      cfgScale: metadata.cfgScale,
      samplerName: metadata.samplerName,
      checkpointName: metadata.checkpointName,
      tags: metadata.tags
    })

    return metadata
  } catch (error) {
    console.warn('提取工作流元数据失败:', error)
    return {
      workflowId: promptId,
      workflowName: '图像生成',
      tags: ['comfyui', 'generated'],
      parameters: { extractionError: String(error) }
    }
  }
}

/**
 * 处理节点执行完成事件
 */
async function handleNodeExecuted(event: CustomEvent<ExecutedWsMessage>) {
  const { node, output, prompt_id } = event.detail

  if (!output || !isImageOutput(output)) {
    return
  }

  console.log(`🎯 检测到节点 ${node} 生成了图像，准备上传...`)

  // 提取工作流元数据
  const metadata = extractMetadataFromWorkflow(node, prompt_id)

  // 处理图像输出
  if (output.images && Array.isArray(output.images)) {
    for (const image of output.images) {
      const { filename, subfolder = '', type = 'output' } = image

      // 检查filename是否存在
      if (!filename) {
        console.warn('图像文件名为空，跳过上传')
        continue
      }

      // 生成唯一标识符，避免重复上传
      const outputId = `${prompt_id}-${node}-${filename}`
      if (processedOutputs.has(outputId)) {
        continue
      }

      // 标记为已处理
      processedOutputs.add(outputId)

      // 异步上传图像
      cloudImageUploadService.uploadImage(filename, subfolder, type, metadata).catch(error => {
        console.error(`上传图像 ${filename} 失败:`, error)
        // 如果上传失败，从已处理集合中移除，允许重试
        processedOutputs.delete(outputId)
      })
    }
  }
}

/**
 * 清理过期的已处理记录
 */
function cleanupProcessedOutputs() {
  // 每10分钟清理一次，保持集合大小合理
  setInterval(() => {
    if (processedOutputs.size > 1000) {
      console.log('🧹 清理已处理的输出记录...')
      processedOutputs.clear()
    }
  }, 10 * 60 * 1000) // 10分钟
}

app.registerExtension({
  name: 'Comfy.AutoCloudUpload',

  init() {
    console.log('🚀 自动云端上传扩展已启动')

    // 等待JWT认证初始化完成后设置令牌
    const setupJwtToken = () => {
      // 输出调试信息
      const debugInfo = debugJwtAuth()

      const jwtToken = getJwtToken()
      if (jwtToken) {
        cloudImageUploadService.setJwtToken(jwtToken)
        console.log('🔑 JWT令牌已设置，将保存图像到MongoDB')
        console.log('🔐 令牌来源: iframe页面传递的JWT认证')
        console.log('📊 认证状态:', debugInfo.isAuthenticated ? '已认证' : '未认证')
      } else {
        console.warn('⚠️ 未找到JWT令牌，将跳过MongoDB保存')
        console.warn('💡 请确保从iframe页面正确传递了JWT令牌')
        console.warn('🔍 调试信息: 运行 debugJwtAuth() 查看详细状态')
      }
    }

    // 立即尝试设置令牌
    setupJwtToken()

    // 如果初始设置失败，等待一段时间后重试（JWT认证可能还在初始化）
    if (!getJwtToken()) {
      setTimeout(() => {
        console.log('🔄 重试获取JWT令牌...')
        setupJwtToken()
      }, 1000)
    }

    // 监听节点执行完成事件
    api.addEventListener('executed', handleNodeExecuted)

    // 启动清理任务
    cleanupProcessedOutputs()

    console.log('📡 正在监听图像生成事件...')
  },

  beforeRegisterNodeDef() {
    // 可以在这里添加节点定义前的处理逻辑
  },

  async nodeCreated() {
    // 可以在这里添加节点创建时的处理逻辑
  }
})
