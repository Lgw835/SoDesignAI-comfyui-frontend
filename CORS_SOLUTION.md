# ComfyUI CORS 问题解决方案

## 问题描述

在开发环境中，前端应用（运行在 `http://localhost:5173`）尝试直接访问后端API（`http://192.168.1.17:5000`）时遇到CORS错误：

```
Access to fetch at 'http://192.168.1.17:5000/api/comfyui/images?limit=64&status=completed' 
from origin 'http://localhost:5173' has been blocked by CORS policy: 
Response to preflight request doesn't pass access control check: No 
'Access-Control-Allow-Origin' header is present on the requested resource.
```

## 解决方案

### 1. 利用 Vite 开发服务器代理

在 `vite.config.mts` 中已经配置了代理规则：

```typescript
server: {
  proxy: {
    '/api/comfyui': {
      target: DEV_SERVER_MONGODB_API_URL, // http://192.168.1.17:5000
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api\/comfyui/, '/api/comfyui')
    }
  }
}
```

### 2. 修改API调用方式

**之前（会产生CORS错误）：**
```typescript
const baseUrl = 'http://192.168.1.17:5000'
const url = `${baseUrl}/api/comfyui/images?${queryParams.toString()}`
```

**修改后（使用代理，避免CORS）：**
```typescript
// 使用相对路径，利用vite代理避免CORS问题
const url = `/api/comfyui/images?${queryParams.toString()}`
```

### 3. 修改的文件

1. **src/services/userImageService.ts**
   - `getUserImages` 函数中的URL构建
   - `getUserImagesWithPagination` 函数中的URL构建

2. **src/components/debug/ApiTestPage.vue**
   - API测试中的URL构建

### 4. 工作原理

1. 前端代码使用相对路径 `/api/comfyui/images`
2. Vite开发服务器拦截这些请求
3. 代理将请求转发到 `http://192.168.1.17:5000/api/comfyui/images`
4. 后端响应通过代理返回给前端
5. 由于请求看起来来自同一个域（localhost:5174），不会触发CORS限制

### 5. 其他已经正确使用代理的服务

以下服务已经正确使用了相对路径，因此没有CORS问题：

- **cloudImageUploadService.ts** - MongoDB图像保存
- **autoCloudUpload.ts** - 积分扣除API调用

这些服务使用如下方式调用API：
```typescript
const response = await fetch('/api/comfyui/deduct_points', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${currentToken}`
  },
  body: JSON.stringify(deductRequest)
})
```

### 6. 测试验证

创建了两个测试页面来验证解决方案：

1. **test-api.html** - 简单的HTML测试页面
   - 可以测试直接API调用（会失败）
   - 可以测试代理API调用（应该成功）

2. **src/components/debug/ApiTestPage.vue** - Vue组件测试页面
   - 集成了JWT认证
   - 可以测试用户图像历史获取
   - 访问路径：`http://localhost:5174/api-test`

### 7. 生产环境注意事项

在生产环境中，需要确保：

1. 前端和后端部署在同一个域下，或者
2. 后端正确配置CORS头，允许前端域的访问
3. 如果使用反向代理（如Nginx），配置相应的代理规则

### 8. 调试技巧

如果遇到类似问题，可以：

1. 检查浏览器开发者工具的Network标签
2. 查看请求的实际URL和响应头
3. 确认vite.config.mts中的代理配置
4. 使用测试页面验证API连接

## 总结

通过使用Vite开发服务器的代理功能，我们成功解决了CORS问题，无需修改后端服务器的CORS配置。这种方法在开发环境中非常有效，并且保持了代码的简洁性。
