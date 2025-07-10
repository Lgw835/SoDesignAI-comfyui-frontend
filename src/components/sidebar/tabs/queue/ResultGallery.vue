<template>
  <Galleria
    v-model:visible="galleryVisible"
    :active-index="activeIndex"
    :value="allGalleryItems"
    :show-indicators="false"
    change-item-on-indicator-hover
    show-item-navigators
    full-screen
    circular
    :show-thumbnails="false"
    :pt="{
      mask: {
        onMousedown: onMaskMouseDown,
        onMouseup: onMaskMouseUp,
        'data-mask': true
      },
      prevButton: {
        style: 'position: fixed !important'
      },
      nextButton: {
        style: 'position: fixed !important'
      }
    }"
    @update:visible="handleVisibilityChange"
    @update:active-index="handleActiveIndexChange"
  >
    <!-- 添加下载按钮 -->
    <template #header>
      <div class="gallery-header">
        <Button
          v-if="currentItem && currentItem.isImage"
          icon="pi pi-download"
          text
          rounded
          severity="secondary"
          class="download-button"
          v-tooltip.bottom="'下载图片'"
          @click="downloadCurrentImage"
        />
      </div>
    </template>
    <template #item="{ item }">
      <ComfyImage
        v-if="item.isImage"
        :key="item.url"
        :src="item.url"
        :contain="false"
        :alt="item.filename"
        class="galleria-image"
      />
      <ResultVideo v-else-if="item.isVideo" :result="item" />
      <ResultAudio v-else-if="item.isAudio" :result="item" />
    </template>
  </Galleria>
</template>

<script setup lang="ts">
import Button from 'primevue/button'
import Galleria from 'primevue/galleria'
import { useToast } from 'primevue/usetoast'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

import ComfyImage from '@/components/common/ComfyImage.vue'
import { ResultItemImpl } from '@/stores/queueStore'

import ResultAudio from './ResultAudio.vue'
import ResultVideo from './ResultVideo.vue'

const galleryVisible = ref(false)
const toast = useToast()

const emit = defineEmits<{
  (e: 'update:activeIndex', value: number): void
}>()

const props = defineProps<{
  allGalleryItems: ResultItemImpl[]
  activeIndex: number
}>()

// 计算当前显示的图片项
const currentItem = computed(() => {
  if (props.activeIndex >= 0 && props.activeIndex < props.allGalleryItems.length) {
    return props.allGalleryItems[props.activeIndex]
  }
  return null
})

let maskMouseDownTarget: EventTarget | null = null

const onMaskMouseDown = (event: MouseEvent) => {
  maskMouseDownTarget = event.target
}

const onMaskMouseUp = (event: MouseEvent) => {
  const maskEl = document.querySelector('[data-mask]')
  if (
    galleryVisible.value &&
    maskMouseDownTarget === event.target &&
    maskMouseDownTarget === maskEl
  ) {
    galleryVisible.value = false
    handleVisibilityChange(false)
  }
}

watch(
  () => props.activeIndex,
  (index) => {
    if (index !== -1) {
      galleryVisible.value = true
    }
  }
)

const handleVisibilityChange = (visible: boolean) => {
  if (!visible) {
    emit('update:activeIndex', -1)
  }
}

const handleActiveIndexChange = (index: number) => {
  emit('update:activeIndex', index)
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (!galleryVisible.value) return

  switch (event.key) {
    case 'ArrowLeft':
      navigateImage(-1)
      break
    case 'ArrowRight':
      navigateImage(1)
      break
    case 'Escape':
      galleryVisible.value = false
      handleVisibilityChange(false)
      break
  }
}

const navigateImage = (direction: number) => {
  const newIndex =
    (props.activeIndex + direction + props.allGalleryItems.length) %
    props.allGalleryItems.length
  emit('update:activeIndex', newIndex)
}

/**
 * 下载当前显示的图片
 */
const downloadCurrentImage = async () => {
  const item = currentItem.value
  if (!item || !item.isImage) {
    return
  }

  try {
    console.log('🔽 开始下载图片:', item.filename)

    // 显示下载开始的提示
    toast.add({
      severity: 'info',
      summary: '开始下载',
      detail: `正在下载图片: ${item.filename}`,
      life: 2000
    })

    // 获取图片数据
    const response = await fetch(item.url, {
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
    let downloadFilename = item.filename
    if (!downloadFilename.includes('.')) {
      // 如果文件名没有扩展名，根据blob类型添加
      const extension = blob.type.split('/')[1] || 'png'
      downloadFilename = `${item.filename}.${extension}`
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

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<style>
/* PrimeVue's galleria teleports the fullscreen gallery out of subtree so we
cannot use scoped style here. */
img.galleria-image {
  max-width: 100vw;
  max-height: 100vh;
  object-fit: contain;
}

.p-galleria-close-button {
  /* Set z-index so the close button doesn't get hidden behind the image when image is large */
  z-index: 1;
}

.gallery-header {
  position: absolute;
  top: 1rem;
  right: 4rem;
  z-index: 2;
  display: flex;
  gap: 0.5rem;
}

.download-button {
  background-color: rgba(0, 0, 0, 0.5) !important;
  color: white !important;
  border: none !important;
}

.download-button:hover {
  background-color: rgba(0, 0, 0, 0.7) !important;
}

/* Mobile/tablet specific fixes */
@media screen and (max-width: 768px) {
  .p-galleria-prev-button,
  .p-galleria-next-button {
    z-index: 2;
  }
}
</style>
