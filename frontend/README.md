# 项目管理工具前端

基于 React + TailwindCSS + react-beautiful-dnd 开发的团队协作项目管理工具前端，提供类似 Trello 的看板功能。

## 功能特性

- 🔐 用户认证与授权（JWT + RBAC）
- 📋 项目管理（创建、编辑、删除、搜索）
- 🎯 任务管理（创建、编辑、删除、拖拽）
- 👥 用户角色管理（管理员、项目负责人、普通成员）
- 🔒 基于角色的权限控制
- 📱 响应式设计，支持移动端
- 🎨 Apple风格UI设计

## 技术栈

- **前端框架**: React 18
- **样式框架**: TailwindCSS
- **拖拽库**: react-beautiful-dnd
- **路由**: React Router v6
- **HTTP客户端**: Axios
- **图标**: Lucide React
- **构建工具**: Vite

## 项目结构

```
src/
├── components/          # 可复用组件
│   ├── Layout.jsx      # 主布局组件
│   ├── CreateProjectModal.jsx
│   ├── EditProjectModal.jsx
│   ├── CreateTaskModal.jsx
│   ├── EditTaskModal.jsx
│   └── CreateStageModal.jsx
├── contexts/           # React上下文
│   └── AuthContext.jsx # 认证上下文
├── pages/              # 页面组件
│   ├── Login.jsx       # 登录页面
│   ├── Register.jsx    # 注册页面
│   ├── Dashboard.jsx   # 仪表板页面
│   └── ProjectBoard.jsx # 项目看板页面
├── services/           # API服务
│   └── api.js         # API接口封装
├── App.jsx            # 主应用组件
├── main.jsx           # 应用入口
└── index.css          # 全局样式
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

应用将在 `http://localhost:3000` 启动。

### 3. 构建生产版本

```bash
npm run build
```

## 后端API要求

本项目需要配合后端API使用，后端需要提供以下接口：

### 认证接口
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录

### 项目管理接口
- `GET /api/projects` - 获取项目列表
- `POST /api/projects` - 创建项目
- `GET /api/projects/:id` - 获取项目详情
- `PUT /api/projects/:id` - 更新项目
- `DELETE /api/projects/:id` - 删除项目

### 任务管理接口
- `GET /api/projects/:projectId/tasks` - 获取项目任务
- `POST /api/projects/:projectId/stages/:stageId/tasks` - 创建任务
- `PUT /api/tasks/:id` - 更新任务
- `DELETE /api/tasks/:id` - 删除任务
- `PATCH /api/tasks/:id/move` - 移动任务

### 阶段管理接口
- `GET /api/projects/:projectId/stages` - 获取项目阶段
- `POST /api/projects/:projectId/stages` - 创建阶段
- `PUT /api/stages/:id` - 更新阶段
- `DELETE /api/stages/:id` - 删除阶段

### 用户管理接口
- `GET /api/users` - 获取用户列表

## API集成状态

✅ **已完成集成**：
- 用户认证（登录/注册）
- 项目管理（CRUD操作）
- 阶段管理（CRUD操作）
- 任务管理（CRUD操作）
- 任务拖拽移动
- 用户列表获取

📋 **API文档**：
- 详细API接口文档：`docs/API.md`
- API测试指南：`docs/API_TESTING.md`

🔧 **配置说明**：
- 前端代理配置：`vite.config.js` 中的 `/api` 代理到后端
- 后端服务地址：`http://localhost:8080`
- 认证方式：JWT Bearer Token

## 权限系统

### 用户角色
- **管理员 (admin)**: 可以管理所有项目和用户
- **项目负责人 (owner)**: 可以管理自己创建的项目
- **普通成员 (member)**: 只能查看和编辑分配给自己的任务

### 权限矩阵

| 操作 | 管理员 | 项目负责人 | 普通成员 |
|------|--------|------------|----------|
| 创建项目 | ✅ | ✅ | ❌ |
| 编辑项目 | ✅ | ✅ (自己的项目) | ❌ |
| 删除项目 | ✅ | ✅ (自己的项目) | ❌ |
| 创建任务 | ✅ | ✅ | ✅ |
| 编辑任务 | ✅ | ✅ | ✅ (只能编辑自己的) |
| 删除任务 | ✅ | ✅ | ❌ |
| 移动任务 | ✅ | ✅ | ✅ |

## 设计特点

### UI设计
- 采用Apple风格设计语言
- 白色背景，黑色和灰色文字
- 蓝色和绿色作为强调色
- 圆角卡片设计 (20rpx border-radius)
- 柔和阴影效果
- 简洁的图标设计

### 用户体验
- 响应式设计，支持各种屏幕尺寸
- 流畅的拖拽交互
- 直观的权限控制
- 友好的错误提示
- 加载状态指示

## 开发说明

### 添加新功能
1. 在 `components/` 目录下创建新组件
2. 在 `pages/` 目录下创建新页面
3. 在 `services/api.js` 中添加新的API接口
4. 更新路由配置

### 样式规范
- 使用TailwindCSS工具类
- 自定义样式在 `src/index.css` 中定义
- 遵循Apple设计语言规范

### 状态管理
- 使用React Context进行全局状态管理
- 本地状态使用useState和useEffect
- API调用封装在services层

## 部署

### 构建生产版本
```bash
npm run build
```

### 部署到静态服务器
将 `dist` 目录部署到任何静态文件服务器。

### 环境变量
- `VITE_API_BASE_URL`: API基础URL（可选，默认使用代理）

## 浏览器支持

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License
