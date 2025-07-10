# ComfyUI 图片下载功能

## 功能概述

为ComfyUI生图历史添加了右键下载图片功能，用户可以通过右键菜单或图片画廊中的下载按钮来下载生成的图片。

## 实现的功能

### 1. 右键菜单下载
- **位置**: 生图历史侧边栏中的图片
- **触发方式**: 右键点击图片
- **菜单项**: "下载图片" (带下载图标)
- **功能**: 下载当前右键点击的图片

### 2. 图片画廊下载
- **位置**: 全屏图片画廊中
- **触发方式**: 点击右上角的下载按钮
- **按钮样式**: 半透明背景的圆形下载按钮
- **功能**: 下载当前显示的图片

## 修改的文件

### 1. QueueSidebarTab.vue
**修改内容:**
- 在右键菜单中添加"下载图片"选项
- 实现`downloadImage`函数处理图片下载逻辑
- 添加下载状态提示（开始、成功、失败）

**关键代码:**
```typescript
// 添加下载图片选项到右键菜单
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

// 下载图片函数
const downloadImage = async (imageUrl: string, filename: string) => {
  // 获取图片数据、创建下载链接、触发下载
}
```

### 2. ResultGallery.vue
**修改内容:**
- 在画廊头部添加下载按钮
- 实现`downloadCurrentImage`函数
- 添加按钮样式和响应式设计

**关键代码:**
```vue
<!-- 添加下载按钮到画廊头部 -->
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
```

## 下载功能特性

### 1. 智能文件名处理
- 保持原始文件名
- 自动添加正确的文件扩展名（如果缺失）
- 根据图片MIME类型确定扩展名

### 2. 用户体验优化
- **加载提示**: 下载开始时显示"正在下载"提示
- **成功反馈**: 下载完成后显示成功消息和文件名
- **错误处理**: 下载失败时显示详细错误信息
- **视觉反馈**: 按钮hover效果和工具提示

### 3. 兼容性
- 支持所有现代浏览器
- 使用标准的HTML5下载API
- 自动清理临时URL对象，避免内存泄漏

## 样式设计

### 右键菜单
- 使用PrimeVue的标准菜单样式
- 下载图标：`pi pi-download`
- 与其他菜单项保持一致的视觉风格

### 画廊下载按钮
- **位置**: 右上角，关闭按钮左侧
- **样式**: 半透明黑色背景，白色图标
- **交互**: hover时背景变深
- **响应式**: 在移动设备上保持可用性

```css
.gallery-header {
  position: absolute;
  top: 1rem;
  right: 4rem;
  z-index: 2;
}

.download-button {
  background-color: rgba(0, 0, 0, 0.5) !important;
  color: white !important;
}
```

## 测试页面

创建了`test-download.html`测试页面，包含：
- 基础下载功能测试
- 从URL下载图片测试
- 错误处理验证
- 文件名处理测试

## 使用方法

### 方法1: 右键菜单下载
1. 在生图历史侧边栏中找到要下载的图片
2. 右键点击图片
3. 选择"下载图片"菜单项
4. 图片将自动下载到浏览器默认下载文件夹

### 方法2: 画廊下载
1. 点击图片进入全屏画廊模式
2. 点击右上角的下载按钮（下载图标）
3. 当前显示的图片将自动下载

## 技术实现细节

### 下载流程
1. **获取图片数据**: 使用fetch API获取图片blob
2. **创建下载链接**: 使用URL.createObjectURL创建临时URL
3. **触发下载**: 创建隐藏的`<a>`标签并模拟点击
4. **清理资源**: 下载完成后清理临时URL

### 错误处理
- 网络错误处理
- 文件类型验证
- 用户友好的错误消息
- 控制台详细日志记录

### 性能优化
- 异步下载，不阻塞UI
- 及时清理内存资源
- 最小化DOM操作

## 未来扩展

可以考虑添加的功能：
1. **批量下载**: 选择多张图片一次性下载
2. **下载格式选择**: 支持不同格式导出
3. **下载进度显示**: 大文件下载时显示进度条
4. **自定义文件名**: 允许用户重命名下载文件
5. **下载历史**: 记录下载过的图片

## 总结

成功为ComfyUI添加了完整的图片下载功能，提供了两种便捷的下载方式，具有良好的用户体验和错误处理机制。功能已集成到现有的UI中，保持了界面的一致性和易用性。
