<div align="center">

# SoDesignAI ComfyUI 前端

**基于 [ComfyUI](https://github.com/comfyanonymous/ComfyUI) 的增强版前端实现，集成了 SoDesign.AI 系统的完整功能。**

[![GitHub](https://img.shields.io/badge/GitHub-181717?style=flat&logo=github&logoColor=white)](https://github.com/Lgw835/SoDesignAI-comfyui-frontend)
[![Vue.js](https://img.shields.io/badge/Vue.js-4FC08D?style=flat&logo=vue.js&logoColor=white)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)

</div>

## 🚀 项目简介

SoDesignAI ComfyUI 前端是一个功能强大的 AI 图像生成工作流编辑器，基于官方 ComfyUI 前端进行深度定制和增强。本项目专为 SoDesign.AI 平台设计，提供了完整的用户认证、云端存储、积分系统等企业级功能。

### ✨ 核心特性

- 🔐 **JWT 认证系统** - 与 SoDesign.AI 平台无缝集成的安全认证
- ☁️ **自动云端上传** - 生成的图像自动上传到云端存储并获取 CDN 链接
- 📊 **用户图片历史** - 完整的图片生成历史记录和管理功能
- 💰 **积分扣除系统** - 每次生成图像自动扣除用户积分
- 🌐 **跨域支持** - 完善的 CORS 配置，支持 iframe 嵌入
- 🎨 **现代化界面** - 基于 Vue 3 + TypeScript 的响应式设计
- 🔄 **实时同步** - 与后端数据库实时同步用户数据

## 🔧 技术架构

### 前端技术栈
- **框架**: Vue 3 + TypeScript
- **构建工具**: Vite
- **状态管理**: Pinia
- **UI 组件**: PrimeVue + TailwindCSS
- **图形编辑**: litegraph.js
- **国际化**: vue-i18n
- **数据验证**: zod

### 后端集成
- **认证服务**: JWT 令牌验证 (http://192.168.1.17:5000)
- **云端存储**: https://store.20250131.xyz
- **数据库**: MongoDB (用户数据、图片历史)
- **ComfyUI 后端**: localhost:8188

## 🛠️ 快速开始

### 环境要求
- Node.js 16+
- npm 或 yarn
- Git
- 运行中的 ComfyUI 后端实例

### 安装步骤

1. **克隆项目**
   ```bash
   git clone https://github.com/Lgw835/SoDesignAI-comfyui-frontend.git
   cd SoDesignAI-comfyui-frontend
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **配置环境变量**
   ```bash
   cp .env.example .env
   # 根据需要修改 .env 文件中的配置
   ```

4. **启动开发服务器**
   ```bash
   npm run dev
   ```

5. **访问应用**
   - 开发服务器: http://localhost:5173
   - 确保 ComfyUI 后端运行在 localhost:8188

## 🎯 核心功能详解

### 🔐 JWT 认证系统
- **自动令牌提取**: 从 URL 参数自动获取 JWT 令牌
- **服务器验证**: 与 SoDesign.AI 认证服务实时验证
- **用户信息管理**: 自动获取并显示用户信息
- **访问控制**: 未认证用户自动重定向到登录页面

### ☁️ 自动云端上传
- **实时上传**: 图像生成完成后自动上传到云端存储
- **CDN 加速**: 获取 fastly.jsdelivr.net CDN 链接
- **MongoDB 存储**: 图像元数据自动保存到数据库
- **智能分析**: 自动提取工作流参数和提示词

### 📊 用户图片历史
- **历史记录**: 完整的图片生成历史查看
- **分页浏览**: 支持分页和筛选功能
- **下载功能**: 支持图片下载和全屏查看
- **元数据显示**: 显示生成参数、模型信息等

### 💰 积分系统
- **自动扣费**: 每次生成图像自动扣除 5 积分
- **余额查询**: 实时显示用户积分余额
- **扣费记录**: 详细的积分使用记录

### 🌐 跨域支持
- **CORS 配置**: 完善的跨域资源共享配置
- **iframe 嵌入**: 支持在 SoDesign.AI 平台中嵌入使用
- **代理转发**: 自动处理 API 请求的跨域问题

## 📋 使用说明

### 认证流程
1. 用户在 SoDesign.AI 平台登录
2. 访问"创建工作流"页面
3. 系统自动生成 JWT 访问令牌
4. iframe 嵌入 ComfyUI 前端，URL 包含 token 参数
5. 前端自动验证令牌并获取用户信息

### 图像生成流程
1. 在工作流编辑器中设计图像生成流程
2. 点击"Queue Prompt"开始生成
3. 系统自动扣除 5 积分
4. 图像生成完成后自动上传到云端
5. 在历史记录中查看生成的图像

### 访问方式
- **开发环境**: http://localhost:5173/?token=YOUR_JWT_TOKEN
- **生产环境**: 通过 SoDesign.AI 平台的 iframe 嵌入访问
- **网络访问**: 支持内网和公网 IP 访问

## 🔧 开发指南
### 环境变量配置
```env
# .env 文件示例
VITE_REMOTE_DEV=true  # 启用远程访问
VITE_API_BASE_URL=http://192.168.1.17:5000  # 后端 API 地址
```

### 代理配置
项目已配置 Vite 代理来解决跨域问题：
```typescript
'/api/comfyui': {
  target: 'http://192.168.1.17:5000',
  changeOrigin: true
}
```


## 🗂️ 项目结构

```
src/
├── components/          # Vue 组件
│   ├── dialog/         # 对话框组件
│   ├── sidebar/        # 侧边栏组件
│   └── debug/          # 调试组件
├── composables/        # Vue 组合式函数
│   └── auth/          # 认证相关组合函数
├── extensions/         # ComfyUI 扩展
│   └── core/          # 核心扩展
├── services/           # 服务层
│   ├── cloudImageUploadService.ts  # 云端上传服务
│   └── userImageService.ts        # 用户图片服务
├── stores/             # Pinia 状态管理
│   ├── jwtAuthStore.ts # JWT 认证状态
│   └── queueStore.ts   # 队列状态
├── utils/              # 工具函数
│   ├── jwtUtil.ts      # JWT 工具
│   └── debugJwtAuth.ts # 认证调试工具
├── locales/            # 国际化文件
└── main.ts             # 应用入口
```

## 🔍 调试工具

### JWT 认证调试
在浏览器控制台中运行：
```javascript
// 查看认证状态
debugJwtAuth()

// 获取当前令牌
getJwtToken()

// 查看用户信息
useJwtAuthStore().currentUser
```

## 📄 API 文档

### JWT 认证 API
```typescript
// 令牌验证
POST /api/comfyui/verify_token
{
  "token": "JWT_TOKEN"
}

// 响应
{
  "authenticated": true,
  "user": {
    "user_id": "用户ID",
    "username": "用户名",
    "email": "邮箱",
    "role": "角色",
    "permissions": []
  }
}
```

### 图片管理 API
```typescript
// 获取用户图片历史
GET /api/comfyui/images?page=1&limit=20

// 保存图片信息
POST /api/comfyui/images
{
  "filename": "图片文件名",
  "cdn_url": "CDN链接",
  "file_size": 1024000,
  "metadata": { /* 工作流元数据 */ }
}
```

### 积分系统 API
```typescript
// 查询用户积分
GET /api/comfyui/user/points

// 扣除积分
POST /api/comfyui/deduct_points
{
  "points": 5,
  "reason": "ComfyUI图像生成"
}
```