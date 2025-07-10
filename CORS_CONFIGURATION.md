# ComfyUI 跨域支持配置

## 概述

为ComfyUI前端应用添加了完整的跨域（CORS）支持，确保所有外部API调用都能正确处理跨域请求。

## 修改的文件和配置

### 1. cloudImageUploadService.ts

**修改内容:**
- 为云端图像上传添加CORS配置
- 支持表单上传和JSON API上传两种方式

**表单上传配置:**
```typescript
const response = await fetch(this.baseUrl, {
  method: 'POST',
  mode: 'cors',
  credentials: 'omit',
  headers: {
    'Accept': 'application/json'
  },
  body: formData
})
```

**JSON API上传配置:**
```typescript
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
```

### 2. QueueSidebarTab.vue

**修改内容:**
- 为图片下载功能添加CORS配置

**下载配置:**
```typescript
const response = await fetch(imageUrl, {
  method: 'GET',
  mode: 'cors',
  credentials: 'omit',
  headers: {
    'Accept': 'image/*'
  }
})
```

### 3. ResultGallery.vue

**修改内容:**
- 为画廊下载功能添加CORS配置

**下载配置:**
```typescript
const response = await fetch(item.url, {
  method: 'GET',
  mode: 'cors',
  credentials: 'omit',
  headers: {
    'Accept': 'image/*'
  }
})
```

## CORS配置说明

### 核心配置参数

1. **mode: 'cors'**
   - 明确指定使用CORS模式
   - 允许跨域请求

2. **credentials: 'omit'**
   - 不发送认证信息（cookies、authorization headers等）
   - 适用于公开API调用

3. **headers配置**
   - `Accept`: 指定期望的响应类型
   - `Content-Type`: 指定请求内容类型

### 不同类型请求的配置

#### 图片上传请求
- **目标**: `https://store.20250131.xyz`
- **方法**: POST
- **内容**: FormData 或 JSON
- **Accept**: `application/json`

#### 图片下载请求
- **目标**: CDN URLs (如 `fastl.jsdelivr.net`)
- **方法**: GET
- **Accept**: `image/*`

#### MongoDB API请求
- **目标**: 通过Vite代理到 `http://192.168.1.17:5000`
- **方法**: GET/POST
- **认证**: Bearer Token
- **不需要CORS配置**（使用代理）

## 代理 vs 直接CORS

### 使用代理的API（无需CORS配置）
- MongoDB图像保存: `/api/comfyui/images`
- 积分扣除: `/api/comfyui/deduct_points`
- 用户图像历史: `/api/comfyui/images`

### 直接跨域的API（需要CORS配置）
- 云端图像上传: `https://store.20250131.xyz`
- CDN图像下载: `https://fastl.jsdelivr.net`

## 错误处理

### 常见CORS错误
1. **No 'Access-Control-Allow-Origin' header**
   - 服务器未配置CORS
   - 解决方案: 添加mode: 'cors'配置

2. **CORS policy blocks request**
   - 预检请求失败
   - 解决方案: 确保服务器支持OPTIONS请求

3. **Credentials not allowed**
   - 服务器不允许发送认证信息
   - 解决方案: 使用credentials: 'omit'

### 调试技巧
1. 检查浏览器开发者工具的Network标签
2. 查看预检请求（OPTIONS）是否成功
3. 确认响应头中包含正确的CORS头

## 测试验证

### 测试方法
1. **云端上传测试**
   - 生成图像，观察上传日志
   - 检查是否有CORS错误

2. **图片下载测试**
   - 右键下载图片
   - 检查下载是否成功

3. **API连接测试**
   - 使用`test-api.html`页面
   - 测试代理API和直接API

### 预期结果
- 所有外部API调用成功
- 无CORS相关错误
- 图片上传和下载正常工作

## 生产环境注意事项

### 服务器端配置
确保目标服务器正确配置CORS头：

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Accept, Authorization
```

### 安全考虑
1. **credentials: 'omit'**: 不发送敏感认证信息
2. **明确的Accept头**: 限制响应类型
3. **最小权限原则**: 只请求必要的权限

## 故障排除

### 如果仍有CORS问题
1. 检查服务器CORS配置
2. 确认请求URL正确
3. 验证请求方法和头部
4. 考虑使用代理替代直接跨域

### 日志和调试
- 所有fetch请求都有详细的错误日志
- 使用浏览器开发者工具监控网络请求
- 检查控制台错误信息

## 总结

通过添加适当的CORS配置，ComfyUI现在可以：
1. 成功上传图片到云端存储
2. 从CDN下载图片
3. 处理各种跨域场景
4. 提供详细的错误信息和调试支持

所有配置都遵循最佳实践，确保安全性和兼容性。
