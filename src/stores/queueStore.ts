import _ from 'lodash'
import { defineStore } from 'pinia'
import { computed, ref, toRaw } from 'vue'

import type {
  ResultItem,
  StatusWsMessageStatus,
  TaskOutput,
  TaskPrompt,
  TaskStatus,
  TaskType
} from '@/schemas/apiSchema'
import type { ComfyWorkflowJSON, NodeId } from '@/schemas/comfyWorkflowSchema'
import { api } from '@/scripts/api'
import type { ComfyApp } from '@/scripts/app'
import { useUserImageService, type UserImage } from '@/services/userImageService'

// Task type used in the API.
export type APITaskType = 'queue' | 'history'

export enum TaskItemDisplayStatus {
  Running = 'Running',
  Pending = 'Pending',
  Completed = 'Completed',
  Failed = 'Failed',
  Cancelled = 'Cancelled'
}

export class ResultItemImpl {
  filename: string
  subfolder: string
  type: string

  nodeId: NodeId
  // 'audio' | 'images' | ...
  mediaType: string

  // VHS output specific fields
  format?: string
  frame_rate?: number

  // 历史图像特有字段
  imageUrl?: string
  thumbnailUrl?: string

  constructor(obj: Record<string, any>) {
    this.filename = obj.filename ?? ''
    this.subfolder = obj.subfolder ?? ''
    this.type = obj.type ?? ''

    this.nodeId = obj.nodeId
    this.mediaType = obj.mediaType

    this.format = obj.format
    this.frame_rate = obj.frame_rate

    // 历史图像URL
    this.imageUrl = obj.imageUrl
    this.thumbnailUrl = obj.thumbnailUrl
  }

  get urlParams(): URLSearchParams {
    const params = new URLSearchParams()
    params.set('filename', this.filename)
    params.set('type', this.type)
    params.set('subfolder', this.subfolder)

    if (this.format) {
      params.set('format', this.format)
    }
    if (this.frame_rate) {
      params.set('frame_rate', this.frame_rate.toString())
    }
    return params
  }

  /**
   * VHS advanced preview URL. `/viewvideo` endpoint is provided by VHS node.
   *
   * `/viewvideo` always returns a webm file.
   */
  get vhsAdvancedPreviewUrl(): string {
    return api.apiURL('/viewvideo?' + this.urlParams)
  }

  get url(): string {
    // 如果有历史图像URL，优先使用
    if (this.imageUrl) {
      return this.imageUrl
    }
    return api.apiURL('/view?' + this.urlParams)
  }

  get urlWithTimestamp(): string {
    return `${this.url}&t=${+new Date()}`
  }

  get isVhsFormat(): boolean {
    return !!this.format && !!this.frame_rate
  }

  get htmlVideoType(): string | undefined {
    if (this.isWebm) {
      return 'video/webm'
    }
    if (this.isMp4) {
      return 'video/mp4'
    }

    if (this.isVhsFormat) {
      if (this.format?.endsWith('webm')) {
        return 'video/webm'
      }
      if (this.format?.endsWith('mp4')) {
        return 'video/mp4'
      }
    }
    return undefined
  }

  get htmlAudioType(): string | undefined {
    if (this.isMp3) {
      return 'audio/mpeg'
    }
    if (this.isWav) {
      return 'audio/wav'
    }
    if (this.isOgg) {
      return 'audio/ogg'
    }
    if (this.isFlac) {
      return 'audio/flac'
    }
    return undefined
  }

  get isGif(): boolean {
    return this.filename.endsWith('.gif')
  }

  get isWebp(): boolean {
    return this.filename.endsWith('.webp')
  }

  get isWebm(): boolean {
    return this.filename.endsWith('.webm')
  }

  get isMp4(): boolean {
    return this.filename.endsWith('.mp4')
  }

  get isVideoBySuffix(): boolean {
    return this.isWebm || this.isMp4
  }

  get isImageBySuffix(): boolean {
    return this.isGif || this.isWebp
  }

  get isMp3(): boolean {
    return this.filename.endsWith('.mp3')
  }

  get isWav(): boolean {
    return this.filename.endsWith('.wav')
  }

  get isOgg(): boolean {
    return this.filename.endsWith('.ogg')
  }

  get isFlac(): boolean {
    return this.filename.endsWith('.flac')
  }

  get isAudioBySuffix(): boolean {
    return this.isMp3 || this.isWav || this.isOgg || this.isFlac
  }

  get isVideo(): boolean {
    const isVideoByType =
      this.mediaType === 'video' || !!this.format?.startsWith('video/')
    return (
      this.isVideoBySuffix ||
      (isVideoByType && !this.isImageBySuffix && !this.isAudioBySuffix)
    )
  }

  get isImage(): boolean {
    return (
      this.isImageBySuffix ||
      (this.mediaType === 'images' &&
        !this.isVideoBySuffix &&
        !this.isAudioBySuffix)
    )
  }

  get isAudio(): boolean {
    const isAudioByType =
      this.mediaType === 'audio' || !!this.format?.startsWith('audio/')
    return (
      this.isAudioBySuffix ||
      (isAudioByType && !this.isImageBySuffix && !this.isVideoBySuffix)
    )
  }

  get supportsPreview(): boolean {
    return this.isImage || this.isVideo || this.isAudio
  }
}

export class TaskItemImpl {
  readonly taskType: TaskType
  readonly prompt: TaskPrompt
  readonly status?: TaskStatus
  readonly outputs: TaskOutput
  readonly flatOutputs: ReadonlyArray<ResultItemImpl>

  constructor(
    taskType: TaskType,
    prompt: TaskPrompt,
    status?: TaskStatus,
    outputs?: TaskOutput,
    flatOutputs?: ReadonlyArray<ResultItemImpl>
  ) {
    this.taskType = taskType
    this.prompt = prompt
    this.status = status
    // Remove animated outputs from the outputs object
    // outputs.animated is an array of boolean values that indicates if the images
    // array in the result are animated or not.
    // The queueStore does not use this information.
    // It is part of the legacy API response. We should redesign the backend API.
    // https://github.com/Comfy-Org/ComfyUI_frontend/issues/2739
    this.outputs = _.mapValues(outputs ?? {}, (nodeOutputs) =>
      _.omit(nodeOutputs, 'animated')
    )
    this.flatOutputs = flatOutputs ?? this.calculateFlatOutputs()
  }

  calculateFlatOutputs(): ReadonlyArray<ResultItemImpl> {
    if (!this.outputs) {
      return []
    }
    return Object.entries(this.outputs).flatMap(([nodeId, nodeOutputs]) =>
      Object.entries(nodeOutputs).flatMap(([mediaType, items]) =>
        (items as ResultItem[]).map(
          (item: ResultItem) =>
            new ResultItemImpl({
              ...item,
              nodeId,
              mediaType
            })
        )
      )
    )
  }

  get previewOutput(): ResultItemImpl | undefined {
    return (
      this.flatOutputs.find(
        // Prefer saved media files over the temp previews
        (output) => output.type === 'output' && output.supportsPreview
      ) ?? this.flatOutputs.find((output) => output.supportsPreview)
    )
  }

  get apiTaskType(): APITaskType {
    switch (this.taskType) {
      case 'Running':
      case 'Pending':
        return 'queue'
      case 'History':
        return 'history'
    }
  }

  get key() {
    return this.promptId + this.displayStatus
  }

  get queueIndex() {
    return this.prompt[0]
  }

  get promptId() {
    return this.prompt[1]
  }

  get promptInputs() {
    return this.prompt[2]
  }

  get extraData() {
    return this.prompt[3]
  }

  get outputsToExecute() {
    return this.prompt[4]
  }

  get extraPngInfo() {
    return this.extraData.extra_pnginfo
  }

  get clientId() {
    return this.extraData.client_id
  }

  get workflow(): ComfyWorkflowJSON | undefined {
    return this.extraPngInfo?.workflow
  }

  get messages() {
    return this.status?.messages || []
  }

  get interrupted() {
    return _.some(
      this.messages,
      (message) => message[0] === 'execution_interrupted'
    )
  }

  get isHistory() {
    return this.taskType === 'History'
  }

  get isRunning() {
    return this.taskType === 'Running'
  }

  get displayStatus(): TaskItemDisplayStatus {
    switch (this.taskType) {
      case 'Running':
        return TaskItemDisplayStatus.Running
      case 'Pending':
        return TaskItemDisplayStatus.Pending
      case 'History':
        if (this.interrupted) return TaskItemDisplayStatus.Cancelled

        switch (this.status!.status_str) {
          case 'success':
            return TaskItemDisplayStatus.Completed
          case 'error':
            return TaskItemDisplayStatus.Failed
        }
    }
  }

  get executionStartTimestamp() {
    const message = this.messages.find(
      (message) => message[0] === 'execution_start'
    )
    return message ? message[1].timestamp : undefined
  }

  get executionEndTimestamp() {
    const messages = this.messages.filter((message) =>
      [
        'execution_success',
        'execution_interrupted',
        'execution_error'
      ].includes(message[0])
    )
    if (!messages.length) {
      return undefined
    }
    return _.max(messages.map((message) => message[1].timestamp))
  }

  get executionTime() {
    if (!this.executionStartTimestamp || !this.executionEndTimestamp) {
      return undefined
    }
    return this.executionEndTimestamp - this.executionStartTimestamp
  }

  get executionTimeInSeconds() {
    return this.executionTime !== undefined
      ? this.executionTime / 1000
      : undefined
  }

  public async loadWorkflow(app: ComfyApp) {
    if (!this.workflow) {
      return
    }
    await app.loadGraphData(toRaw(this.workflow))
    if (this.outputs) {
      app.nodeOutputs = toRaw(this.outputs)
    }
  }

  public flatten(): TaskItemImpl[] {
    if (this.displayStatus !== TaskItemDisplayStatus.Completed) {
      return [this]
    }

    return this.flatOutputs.map(
      (output: ResultItemImpl, i: number) =>
        new TaskItemImpl(
          this.taskType,
          [
            this.queueIndex,
            `${this.promptId}-${i}`,
            this.promptInputs,
            this.extraData,
            this.outputsToExecute
          ],
          this.status,
          {
            [output.nodeId]: {
              [output.mediaType]: [output]
            }
          },
          [output]
        )
    )
  }
}

/**
 * 历史图像任务项类，用于将UserImage转换为TaskItemImpl兼容的格式
 */
export class HistoryImageTaskItem extends TaskItemImpl {
  readonly userImage: UserImage

  constructor(userImage: UserImage) {
    // 创建一个模拟的prompt结构
    const mockPrompt: TaskPrompt = [
      Date.now(), // queueIndex - 使用时间戳
      userImage._id, // promptId - 使用图像ID
      {}, // promptInputs - 空对象
      {
        client_id: userImage.user_id
      }, // extraData
      [] // outputsToExecute
    ]

    // 创建ResultItemImpl
    const resultItem = new ResultItemImpl({
      filename: userImage.image_path.split('/').pop() || '',
      subfolder: '',
      type: 'output' as const,
      nodeId: 'history_image',
      mediaType: 'images',
      imageUrl: userImage.image_url,
      thumbnailUrl: userImage.thumbnail_url
    })

    // 创建模拟的outputs结构
    const mockOutputs: TaskOutput = {
      history_image: {
        images: [{
          filename: userImage.image_path.split('/').pop() || '',
          subfolder: '',
          type: 'output' as const
        }]
      }
    }

    // 创建模拟的status
    const mockStatus: TaskStatus = {
      status_str: userImage.status === 'completed' ? 'success' : 'error',
      completed: userImage.status === 'completed',
      messages: []
    }

    super('History', mockPrompt, mockStatus, mockOutputs, [resultItem])
    this.userImage = userImage
  }

  override get displayStatus(): TaskItemDisplayStatus {
    switch (this.userImage.status) {
      case 'completed':
        return TaskItemDisplayStatus.Completed
      case 'processing':
        return TaskItemDisplayStatus.Running
      case 'failed':
        return TaskItemDisplayStatus.Failed
      default:
        return TaskItemDisplayStatus.Completed
    }
  }

  override get executionTimeInSeconds(): number {
    return this.userImage.generation_time
  }

  override get isHistory(): boolean {
    return true
  }
}

export const useQueueStore = defineStore('queue', () => {
  const runningTasks = ref<TaskItemImpl[]>([])
  const pendingTasks = ref<TaskItemImpl[]>([])
  const historyTasks = ref<TaskItemImpl[]>([])
  const maxHistoryItems = ref(64)
  const isLoading = ref(false)

  const tasks = computed<TaskItemImpl[]>(
    () =>
      [
        ...pendingTasks.value,
        ...runningTasks.value,
        ...historyTasks.value
      ] as TaskItemImpl[]
  )

  const flatTasks = computed<TaskItemImpl[]>(() =>
    tasks.value.flatMap((task: TaskItemImpl) => task.flatten())
  )

  const lastHistoryQueueIndex = computed<number>(() =>
    historyTasks.value.length ? historyTasks.value[0].queueIndex : -1
  )

  const hasPendingTasks = computed<boolean>(() => pendingTasks.value.length > 0)

  const update = async () => {
    isLoading.value = true
    console.log('🔄 开始更新生图历史数据...')

    // 始终清空队列数据，只显示历史图像
    runningTasks.value = []
    pendingTasks.value = []

    try {
      console.log('📸 尝试获取用户历史图像...')
      // 获取用户历史图像
      const userImageService = useUserImageService()
      const userImages = await userImageService.getUserImages({
        limit: maxHistoryItems.value,
        status: 'completed'
      })

      if (userImages.length > 0) {
        console.log('✅ 成功获取历史图像，数量:', userImages.length)

        // 详细打印接收到的用户图像数据
        console.log('📋 queueStore接收到的用户图像数据:')
        userImages.forEach((userImage, index) => {
          console.log(`🖼️ 历史图像 ${index + 1}:`, {
            _id: userImage._id,
            username: userImage.username,
            image_url: userImage.image_url, // 重点关注的字段
            thumbnail_url: userImage.thumbnail_url,
            workflow_name: userImage.workflow_name,
            prompt: userImage.prompt?.substring(0, 50) + (userImage.prompt?.length > 50 ? '...' : ''),
            width: userImage.width,
            height: userImage.height,
            status: userImage.status,
            created_at: userImage.created_at,
            points_cost: userImage.points_cost
          })
          console.log(`🔗 历史图像 ${index + 1} 的 image_url:`, userImage.image_url)
        })

        // 将用户图像转换为TaskItemImpl格式
        const historyImageTasks = userImages.map((userImage, index) => {
          const historyTask = new HistoryImageTaskItem(userImage)
          console.log(`🔄 转换历史图像 ${index + 1}:`, {
            原始_id: userImage._id,
            原始image_url: userImage.image_url,
            转换后promptId: historyTask.promptId,
            转换后previewOutput: historyTask.previewOutput,
            转换后flatOutputs: historyTask.flatOutputs.map(output => ({
              filename: output.filename,
              imageUrl: output.imageUrl,
              thumbnailUrl: output.thumbnailUrl,
              url: output.url
            }))
          })
          return historyTask
        })

        // 显示历史图像
        historyTasks.value = historyImageTasks.sort((a, b) =>
          new Date(b.userImage.created_at * 1000).getTime() - new Date(a.userImage.created_at * 1000).getTime()
        )

        console.log('✅ 历史图像数据已更新到队列')
        console.log('📊 转换后的历史任务数量:', historyTasks.value.length)
      } else {
        console.warn('⚠️ 未获取到历史图像数据，显示空的历史状态')
        historyTasks.value = []
      }
    } catch (error) {
      console.error('❌ 获取历史图像失败:', error)

      // 检查是否是CORS错误
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.error('🚫 检测到CORS错误，这通常是因为:')
        console.error('   1. API服务器未运行在 http://192.168.1.17:5000')
        console.error('   2. API服务器未配置CORS允许前端域名')
        console.error('   3. 网络连接问题')
        console.error('💡 建议检查API服务器状态和CORS配置')
        console.error('📋 当前显示空的生图历史状态，不会回退到队列数据')
      }

      // 不回退到原有队列逻辑，保持空的历史状态
      historyTasks.value = []
      console.log('📝 保持空的生图历史状态')
    } finally {
      isLoading.value = false
      console.log('🏁 生图历史数据更新完成')
    }
  }

  const clear = async (
    targets: ('queue' | 'history')[] = ['queue', 'history']
  ) => {
    if (targets.length === 0) {
      return
    }
    await Promise.all(targets.map((type) => api.clearItems(type)))
    await update()
  }

  const deleteTask = async (task: TaskItemImpl) => {
    await api.deleteItem(task.apiTaskType, task.promptId)
    await update()
  }

  return {
    runningTasks,
    pendingTasks,
    historyTasks,
    maxHistoryItems,
    isLoading,

    tasks,
    flatTasks,
    lastHistoryQueueIndex,
    hasPendingTasks,

    update,
    clear,
    delete: deleteTask
  }
})

export const useQueuePendingTaskCountStore = defineStore(
  'queuePendingTaskCount',
  {
    state: () => ({
      count: 0
    }),
    actions: {
      update(e: CustomEvent<StatusWsMessageStatus>) {
        this.count = e.detail?.exec_info?.queue_remaining || 0
      }
    }
  }
)

export type AutoQueueMode = 'disabled' | 'instant' | 'change'

export const useQueueSettingsStore = defineStore('queueSettingsStore', {
  state: () => ({
    mode: 'disabled' as AutoQueueMode,
    batchCount: 1
  })
})
