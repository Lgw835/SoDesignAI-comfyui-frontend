# ComfyUI JWT Authentication Integration

本文档描述了ComfyUI前端的JWT令牌验证集成功能。

## 🚀 功能概述

ComfyUI前端现在**强制要求**JWT令牌验证，只允许通过SoDesign.AI系统认证的用户访问。主要功能包括：

- **强制JWT认证** - 禁止无令牌访问
- 从URL参数自动提取JWT令牌
- 服务器端令牌验证（生产环境）/ 本地验证（开发环境）
- 用户信息获取和显示
- 认证状态管理
- 未认证用户自动重定向到访问拒绝页面
- 在"设置->用户"中显示JWT用户信息
- 简化的用户界面（无积分功能、无登出按钮）

## 🔧 使用流程

### 1. 用户访问流程
1. 用户登录SoDesign.AI系统
2. 访问"创建工作流"页面 (`/create_workflow.html`)
3. 系统生成JWT访问令牌
4. iframe嵌入ComfyUI前端，URL包含token参数：
   ```
   http://localhost:5173/?token=<JWT_ACCESS_TOKEN>
   ```

### 2. ComfyUI前端验证流程
1. ComfyUI前端从URL参数中提取JWT令牌
2. 调用验证API验证令牌有效性
3. 获取用户信息和权限
4. 根据认证状态显示相应界面

## 🔑 JWT令牌格式

### 访问令牌载荷
```json
{
  "iss": "SoDesign.AI",
  "aud": "sodesign-users",
  "sub": "用户ID",
  "iat": 1234567890,
  "exp": 1234569690,
  "type": "access",
  "user_id": "用户ID",
  "username": "用户名",
  "email": "用户邮箱",
  "role": "用户角色",
  "permissions": ["权限列表"]
}
```

## 🛠 API端点

### JWT令牌验证API
**端点**: `POST /api/comfyui/verify_token`

**请求**:
```json
{
  "token": "<JWT_TOKEN>"
}
```

**成功响应** (200):
```json
{
  "authenticated": true,
  "user": {
    "user_id": "用户ID",
    "username": "用户名",
    "email": "用户邮箱",
    "role": "用户角色",
    "permissions": ["权限列表"]
  },
  "message": "Authentication successful"
}
```

**失败响应** (401):
```json
{
  "authenticated": false,
  "error": "Token expired",
  "code": "TOKEN_EXPIRED",
  "message": "Authentication failed"
}
```

## 💻 前端集成

### 1. 自动初始化
ComfyUI前端会自动：
- 从URL参数提取JWT令牌
- 验证令牌有效性
- 初始化用户会话
- 在认证失败时重定向到登录页面

### 2. 用户信息显示
在"设置->用户"面板中，JWT认证用户会看到：
- 用户名
- 邮箱地址
- 认证提供商 (SoDesign.AI)
- 用户角色
- 权限列表

### 3. 认证状态检查
```javascript
// 检查是否已认证
const { isJwtLogin, jwtAuth } = useCurrentUser()

if (isJwtLogin.value) {
    const user = jwtAuth.currentUser.value
    console.log('当前JWT用户:', user)
    
    // 检查权限
    if (jwtAuth.hasPermission('workflow_create')) {
        // 显示创建工作流功能
    }
    
    // 检查角色
    if (jwtAuth.hasRole('admin')) {
        // 显示管理员功能
    }
}
```

### 4. 发送认证请求
```javascript
// 使用认证头发送请求
try {
    const response = await jwtAuth.authenticatedFetch('/api/some-endpoint', {
        method: 'POST',
        body: JSON.stringify({ data: 'example' })
    })
    
    const result = await response.json()
    console.log('请求结果:', result)
} catch (error) {
    console.error('请求失败:', error)
}
```

## 🔧 配置选项

JWT认证系统支持以下配置选项（在 `src/stores/jwtAuthStore.ts` 中）：

```typescript
const apiBaseUrl = 'http://192.168.1.17:5000'
const verifyEndpoint = '/api/comfyui/verify_token'
const loginRedirectUrl = 'http://192.168.1.17:5000/login.html'
```

## 🚨 安全注意事项

1. **令牌存储**: JWT令牌存储在sessionStorage中，页面关闭后自动清除
2. **令牌验证**: 所有令牌都会在服务器端进行验证
3. **过期处理**: 过期令牌会自动清除并重定向到登录页面
4. **HTTPS**: 生产环境建议使用HTTPS传输令牌

## 🐛 调试

### 开发环境
在开发环境中，JWT认证不会强制重定向，允许开发者测试功能。

### 日志输出
JWT认证系统会输出详细的日志信息：
```javascript
console.log('JWT Authentication Status:', {
  isAuthenticated: isJwtAuthenticated,
  hasToken: !!jwtAuthStore.currentToken,
  user: jwtAuthStore.currentUser
})
```

### 测试URL
可以使用以下URL格式进行测试：
```
http://localhost:5173/?token=<TEST_JWT_TOKEN>
```

## 📁 文件结构

JWT认证相关的文件：
```
src/
├── stores/jwtAuthStore.ts          # JWT认证状态管理
├── composables/auth/useJwtAuth.ts  # JWT认证组合器
├── composables/auth/useCurrentUser.ts  # 扩展的用户管理
├── utils/jwtUtil.ts                # JWT工具函数
└── components/dialog/content/setting/UserPanel.vue  # 用户设置面板

public/
└── comfyui_auth.js                 # 认证客户端脚本
```

## 🔄 与现有认证系统的集成

JWT认证系统与现有的Firebase和API Key认证系统并行工作：
- `useCurrentUser()` 组合器统一管理所有认证方式
- 用户界面会根据认证类型显示相应的信息
- 登出功能会根据认证类型执行相应的操作

## 🚨 强制认证说明

### 访问控制
- **禁止直接访问**: `http://localhost:5173/` 将显示访问拒绝信息
- **必须带令牌**: 只有 `http://localhost:5173/?token=<JWT_TOKEN>` 格式的URL才能访问
- **全局路由守卫**: 所有路由都需要JWT认证
- **开发环境也强制**: 开发环境同样要求JWT令牌（但允许本地验证）

### 访问拒绝处理
当用户尝试无令牌访问时，应用将：
- 阻止应用初始化
- 显示友好的访问拒绝信息
- 提供前往SoDesign.AI登录的链接
- 不加载任何ComfyUI功能

### 测试工具
- `test-jwt-enforcement.html` - 强制认证测试页面
- `jwt-status-simple.html` - 简化状态检查页面
- `debug-status.html` - 综合调试页面

### 测试URL
- **有效访问**: `http://localhost:5173/?token=<VALID_JWT_TOKEN>`
- **无效访问**: `http://localhost:5173/` (将显示访问拒绝信息)

## 📞 支持

如有问题或需要帮助，请联系开发团队。
