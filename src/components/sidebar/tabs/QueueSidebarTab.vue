<template>
  <SidebarTabTemplate :title="$t('sideToolbar.queue')">
    <template #tool-buttons>
      <Button
        v-tooltip.bottom="$t(`sideToolbar.queueTab.${imageFit}ImagePreview`)"
        :icon="
          imageFit === 'cover'
            ? 'pi pi-arrow-down-left-and-arrow-up-right-to-center'
            : 'pi pi-arrow-up-right-and-arrow-down-left-from-center'
        "
        text
        severity="secondary"
        class="toggle-expanded-button"
        @click="toggleImageFit"
      />
      <Button
        v-if="isInFolderView"
        v-tooltip.bottom="$t('sideToolbar.queueTab.backToAllTasks')"
        icon="pi pi-arrow-left"
        text
        severity="secondary"
        class="back-button"
        @click="exitFolderView"
      />
      <template v-else>
        <Button
          v-tooltip="$t('sideToolbar.queueTab.showFlatList')"
          :icon="isExpanded ? 'pi pi-images' : 'pi pi-image'"
          text
          severity="secondary"
          class="toggle-expanded-button"
          @click="toggleExpanded"
        />
        <Button
          icon="pi pi-refresh"
          text
          severity="secondary"
          class="refresh-button"
          @click="refreshHistory"
          v-tooltip.bottom="'刷新历史'"
        />
      </template>
    </template>
    <template #body>
      <VirtualGrid
        v-if="allTasks?.length"
        :items="allTasks"
        :grid-style="{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          padding: '0.5rem',
          gap: '0.5rem'
        }"
      >
        <template #item="{ item }">
          <TaskItem
            :task="item"
            :is-flat-task="isExpanded || isInFolderView"
            @contextmenu="handleContextMenu"
            @preview="handlePreview"
            @task-output-length-clicked="enterFolderView($event)"
          />
        </template>
      </VirtualGrid>
      <div v-else-if="queueStore.isLoading">
        <ProgressSpinner
          style="width: 50px; left: 50%; transform: translateX(-50%)"
        />
      </div>
      <div v-else>
        <NoResultsPlaceholder
          icon="pi pi-image"
          title="暂无生图历史"
          message="您还没有生成过图像，开始创作吧！"
        />
      </div>
    </template>
  </SidebarTabTemplate>
  <ConfirmPopup />
  <ContextMenu ref="menu" :model="menuItems" />
  <ResultGallery
    v-model:activeIndex="galleryActiveIndex"
    :all-gallery-items="allGalleryItems"
  />
</template>

<script setup lang="ts">
import Button from 'primevue/button'
import ConfirmPopup from 'primevue/confirmpopup'
import ContextMenu from 'primevue/contextmenu'
import type { MenuItem } from 'primevue/menuitem'
import ProgressSpinner from 'primevue/progressspinner'
import { useToast } from 'primevue/usetoast'
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import NoResultsPlaceholder from '@/components/common/NoResultsPlaceholder.vue'
import VirtualGrid from '@/components/common/VirtualGrid.vue'
import { ComfyNode } from '@/schemas/comfyWorkflowSchema'
import { api } from '@/scripts/api'
import { app } from '@/scripts/app'
import { useLitegraphService } from '@/services/litegraphService'
import {
  ResultItemImpl,
  TaskItemImpl,
  useQueueStore
} from '@/stores/queueStore'
import { useSettingStore } from '@/stores/settingStore'

import SidebarTabTemplate from './SidebarTabTemplate.vue'
import ResultGallery from './queue/ResultGallery.vue'
import TaskItem from './queue/TaskItem.vue'

const IMAGE_FIT = 'Comfy.Queue.ImageFit'
const toast = useToast()
const queueStore = useQueueStore()
const settingStore = useSettingStore()
const { t } = useI18n()

// Expanded view: show all outputs in a flat list.
const isExpanded = ref(false)
const galleryActiveIndex = ref(-1)
const allGalleryItems = shallowRef<ResultItemImpl[]>([])
// Folder view: only show outputs from a single selected task.
const folderTask = ref<TaskItemImpl | null>(null)
const isInFolderView = computed(() => folderTask.value !== null)
const imageFit = computed<string>(() => settingStore.get(IMAGE_FIT))

const allTasks = computed(() =>
  isInFolderView.value
    ? folderTask.value
      ? folderTask.value.flatten()
      : []
    : isExpanded.value
      ? queueStore.flatTasks
      : queueStore.tasks
)
const updateGalleryItems = () => {
  allGalleryItems.value = allTasks.value.flatMap((task: TaskItemImpl) => {
    const previewOutput = task.previewOutput
    return previewOutput ? [previewOutput] : []
  })
}

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
}

const refreshHistory = async () => {
  try {
    await queueStore.update()
    toast.add({
      severity: 'success',
      summary: '刷新成功',
      detail: '历史图像已更新',
      life: 3000
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: '刷新失败',
      detail: '无法获取历史图像',
      life: 3000
    })
  }
}

const removeTask = async (task: TaskItemImpl) => {
  if (task.isRunning) {
    await api.interrupt()
  }
  await queueStore.delete(task)
}





const menu = ref<InstanceType<typeof ContextMenu> | null>(null)
const menuTargetTask = ref<TaskItemImpl | null>(null)
const menuTargetNode = ref<ComfyNode | null>(null)
const menuItems = computed<MenuItem[]>(() => {
  const items: MenuItem[] = [
    {
      label: t('g.delete'),
      icon: 'pi pi-trash',
      command: () => menuTargetTask.value && removeTask(menuTargetTask.value),
      disabled: isExpanded.value || isInFolderView.value
    },
    {
      label: t('g.loadWorkflow'),
      icon: 'pi pi-file-export',
      command: () => menuTargetTask.value?.loadWorkflow(app),
      disabled: !menuTargetTask.value?.workflow
    },
    {
      label: t('g.goToNode'),
      icon: 'pi pi-arrow-circle-right',
      command: () => {
        if (!menuTargetNode.value) return
        useLitegraphService().goToNode(menuTargetNode.value.id)
      },
      visible: !!menuTargetNode.value
    }
  ]

  if (menuTargetTask.value?.previewOutput?.mediaType === 'images') {
    items.push({
      label: t('g.setAsBackground'),
      icon: 'pi pi-image',
      command: () => {
        const url = menuTargetTask.value?.previewOutput?.url
        if (url) {
          void settingStore.set('Comfy.Canvas.BackgroundImage', url)
        }
      }
    })

    // 添加下载图片选项
    items.push({
      label: '下载图片',
      icon: 'pi pi-download',
      command: () => {
        const task = menuTargetTask.value
        if (task?.previewOutput?.url) {
          downloadImage(task.previewOutput.url, task.previewOutput.filename)
        }
      }
    })
  }

  return items
})

const handleContextMenu = ({
  task,
  event,
  node
}: {
  task: TaskItemImpl
  event: Event
  node: ComfyNode | null
}) => {
  menuTargetTask.value = task
  menuTargetNode.value = node
  menu.value?.show(event)
}

const handlePreview = (task: TaskItemImpl) => {
  updateGalleryItems()
  galleryActiveIndex.value = allGalleryItems.value.findIndex(
    (item) => item.url === task.previewOutput?.url
  )
}

const enterFolderView = (task: TaskItemImpl) => {
  folderTask.value = task
}

const exitFolderView = () => {
  folderTask.value = null
}

const toggleImageFit = async () => {
  await settingStore.set(
    IMAGE_FIT,
    imageFit.value === 'cover' ? 'contain' : 'cover'
  )
}

/**
 * 下载图片
 */
const downloadImage = async (imageUrl: string, filename: string) => {
  try {
    console.log('🔽 开始下载图片:', filename)

    // 显示下载开始的提示
    toast.add({
      severity: 'info',
      summary: '开始下载',
      detail: `正在下载图片: ${filename}`,
      life: 2000
    })

    // 获取图片数据
    const response = await fetch(imageUrl, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      headers: {
        'Accept': 'image/*'
      }
    })
    if (!response.ok) {
      throw new Error(`下载失败: ${response.status} ${response.statusText}`)
    }

    const blob = await response.blob()

    // 创建下载链接
    const downloadUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl

    // 设置下载文件名，确保有正确的扩展名
    let downloadFilename = filename
    if (!downloadFilename.includes('.')) {
      // 如果文件名没有扩展名，根据blob类型添加
      const extension = blob.type.split('/')[1] || 'png'
      downloadFilename = `${filename}.${extension}`
    }

    link.download = downloadFilename
    link.style.display = 'none'

    // 触发下载
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // 清理URL对象
    URL.revokeObjectURL(downloadUrl)

    console.log('✅ 图片下载完成:', downloadFilename)

    // 显示下载成功的提示
    toast.add({
      severity: 'success',
      summary: '下载成功',
      detail: `图片已保存: ${downloadFilename}`,
      life: 3000
    })

  } catch (error) {
    console.error('❌ 图片下载失败:', error)

    // 显示下载失败的提示
    toast.add({
      severity: 'error',
      summary: '下载失败',
      detail: `无法下载图片: ${error instanceof Error ? error.message : '未知错误'}`,
      life: 5000
    })
  }
}

// 组件挂载时初始化历史图像
onMounted(async () => {
  await queueStore.update()
  updateGalleryItems()
})

watch(allTasks, () => {
  const isGalleryOpen = galleryActiveIndex.value !== -1
  if (!isGalleryOpen) return

  const prevLength = allGalleryItems.value.length
  updateGalleryItems()
  const lengthChange = allGalleryItems.value.length - prevLength
  if (!lengthChange) return

  const newIndex = galleryActiveIndex.value + lengthChange
  galleryActiveIndex.value = Math.max(0, newIndex)
})
</script>
