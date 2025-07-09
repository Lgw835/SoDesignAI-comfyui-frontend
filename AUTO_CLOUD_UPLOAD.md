# ComfyUI 自动云端上传功能

## ✅ CORS问题已解决

通过Vite代理配置，已经解决了MongoDB API的跨域访问问题：

```typescript
// vite.config.mts
'/api/comfyui': {
  target: 'http://192.168.1.17:5000',
  changeOrigin: true,
  rewrite: (path) => path.replace(/^\/api\/comfyui/, '/api/comfyui')
}
```

## 功能概述

ComfyUI 前端现在支持自动将生成的图像上传到云端存储，并将图像信息保存到MongoDB数据库。每次图像生成完成后，系统会自动：

1. 🚀 上传图像到 `https://store.20250131.xyz/`
2. 💾 保存图像信息到MongoDB (通过代理访问 `http://192.168.1.17:5000/api/comfyui/images`)
3. 📺 在浏览器控制台输出详细日志

## 使用方法

### 1. JWT令牌认证

系统会自动从iframe页面传递的JWT令牌中获取认证信息：

- **自动获取**: 从URL参数 `?token=<JWT_TOKEN>` 中提取
- **自动验证**: 通过代理访问验证API
- **自动存储**: 存储在sessionStorage中供后续使用

**无需手动设置令牌** - 系统会自动处理JWT认证流程。

### 2. 启动服务

1. **启动ComfyUI后端** (8188端口)
2. **启动前端开发服务器** (5173端口)
3. **访问** http://localhost:5173

### 3. 生成图像

正常使用ComfyUI生成图像，系统会自动处理上传。

## 控制台日志示例

### 成功上传和保存（增强版）
```
🚀 自动云端上传扩展已启动
🔍 JWT认证调试信息:
──────────────────────────────────────────────────
🔑 当前令牌: 已设置
👤 用户信息: {username: "maxwell", email: "3158918082@qq.com", ...}
✅ 认证状态: 已认证
🔑 JWT令牌已设置，将保存图像到MongoDB
🔐 令牌来源: iframe页面传递的JWT认证
📡 正在监听图像生成事件...

🎯 检测到节点 123 生成了图像，准备上传...
🔍 开始提取工作流元数据，节点ID: 123
📊 提取的元数据: {
  prompt: "a beautiful woman, portrait, detailed face...",
  negativePrompt: "blurry, low quality...",
  seed: 859425,
  steps: 20,
  cfgScale: 7.5,
  samplerName: "euler",
  checkpointName: "sd_xl_base_1.0.safetensors",
  tags: ["comfyui", "generated", "portrait", "realistic"]
}
🚀 开始上传图像: ComfyUI_00285_.png
💾 开始保存图像信息到MongoDB: ComfyUI_00285_.png
✅ 图像上传成功!
📁 文件名: ComfyUI_00285_.png
🌐 CDN链接: https://cdn.jsdelivr.net/gh/usst-502s/welcome/2025/7/1752027703351-267...
✅ MongoDB保存成功!
📊 保存结果: {"success": true, "message": "成功保存 1 张图像", "image_ids": ["686dd2385663a10c0cc886bb"], "count": 1}
🆔 图像ID: 686dd2385663a10c0cc886bb
📝 提示词: a beautiful woman, portrait, detailed face, high quality, photorealistic...
🎲 种子值: 859425
🔧 参数: 20步, CFG=7.5, euler
🏷️ 标签: comfyui, generated, portrait, realistic
────────────────────────────────────────────────────────────
```

## 技术实现

### 核心文件
- `src/services/cloudImageUploadService.ts` - 云端上传和MongoDB保存服务
- `src/extensions/core/autoCloudUpload.ts` - 自动上传扩展
- `vite.config.mts` - 代理配置解决CORS问题

### 代理配置
```typescript
// 解决MongoDB API的CORS问题
'/api/comfyui': {
  target: 'http://192.168.1.17:5000',
  changeOrigin: true,
  rewrite: (path) => path.replace(/^\/api\/comfyui/, '/api/comfyui')
}
```

### 工作流程
1. 监听 `executed` WebSocket事件
2. 检测图像输出
3. 从8188后端获取图像文件
4. 上传到云端存储
5. 通过代理保存信息到MongoDB
6. 输出日志到控制台

## 故障排除

### 1. JWT令牌问题
- 运行 `debugJwtAuth()` 查看认证状态
- 确保从iframe正确传递令牌

### 2. 网络连接问题
- 确保能访问 `https://store.20250131.xyz/`
- **CORS已解决**: 通过Vite代理自动处理跨域请求

### 3. 8188后端问题
- 确保ComfyUI后端正在运行
- 检查图像是否正确生成

## 📊 增强的数据库字段

现在保存到MongoDB的数据包含更完整的信息：

### 🔍 智能工作流分析
- **自动提取提示词**: 从CLIPTextEncode节点提取正面和负面提示词
- **参数识别**: 自动识别KSampler、模型加载器等节点的参数
- **智能标签**: 根据提示词内容自动生成相关标签
- **工作流复杂度**: 分析节点数量判断工作流复杂程度

### 📋 完整字段列表
```json
{
  // 基本信息
  "_id": "686dd2385663a10c0cc886bb",
  "user_id": "681a35e5f6c99c9f8cb4c022",
  "username": "tomm",
  "workflow_id": "e7d539f4-3980-4951-b58e-8cc279ced30a",
  "workflow_name": "图像生成",

  // 提示词和参数
  "prompt": "a beautiful woman, portrait, detailed face",
  "negative_prompt": "blurry, low quality",
  "seed": 859425,
  "steps": 20,
  "cfg_scale": 7.5,
  "sampler_name": "euler",
  "scheduler": "normal",
  "denoise": 1.0,

  // 高级参数
  "add_noise": true,
  "start_at_step": 0,
  "end_at_step": 10000,
  "return_with_leftover_noise": false,

  // 模型信息
  "checkpoint_name": "sd_xl_base_1.0.safetensors",
  "vae_name": "sdxl_vae.safetensors",
  "clip_skip": 1,

  // 图像信息
  "width": 512,
  "height": 512,
  "batch_size": 1,
  "file_size": 462955,
  "format": "png",
  "filename_prefix": "ComfyUI",

  // 系统信息
  "preview_format": "JPEG",
  "float_precision": "fp16",
  "generation_time": 0,
  "points_cost": 1,

  // 状态和社交
  "status": "completed",
  "is_public": false,
  "likes_count": 0,
  "downloads_count": 0,

  // 智能标签
  "tags": ["comfyui", "generated", "portrait", "realistic"],

  // 扩展参数
  "parameters": {
    "nodeCount": 15,
    "workflowComplexity": "medium",
    "hasControlNet": false,
    "hasLora": true,
    "hasUpscaler": false,
    "extraction_time": "2025-07-09T10:25:04.714Z",
    "frontend_version": "1.24.0",
    "auto_upload": true
  },

  // 时间戳
  "created_at": 1752027704.714497,
  "updated_at": 1752027704.714497,

  // 图像URL
  "image_path": "/ComfyUI_00285_.png",
  "image_url": "https://cdn.jsdelivr.net/gh/usst-502s/welcome/2025/7/1752027703351-267...",
  "thumbnail_url": "https://cdn.jsdelivr.net/gh/usst-502s/welcome/2025/7/1752027703351-267..."
}
```

现在系统应该能够正常工作，不再出现CORS错误！
