# 项目管理系统

一个基于 Go + React 的单机版项目管理系统，支持项目、阶段、任务的管理和协作。

## 功能特性

- ✅ 项目管理：创建、编辑、删除项目
- ✅ 阶段管理：自定义项目阶段（看板）
- ✅ 任务管理：创建任务、拖拽排序、分配负责人
- ✅ 评论系统：任务评论和回复
- ✅ 数据统计：项目进度和任务统计
- ✅ 用户管理：用户注册、登录、权限管理

## 技术栈

### 后端
- Go 1.24+
- Gin Web Framework
- GORM (SQLite)
- JWT 认证

### 前端
- React 18
- Vite
- TailwindCSS
- React Router

## 快速开始

### 前置要求

- Go 1.24 或更高版本
- Node.js 16+ 和 npm
- Windows 系统（或使用 WSL）

### 安装步骤

1. **克隆项目**
   ```bash
   git clone https://github.com/GuLuGuLuGit/kanban.git
   cd project-manager
   ```

2. **安装依赖**
   
   Windows 用户可以直接运行：
   ```bash
   install.bat
   ```
   
   或者手动安装：
   ```bash
   # 安装后端依赖
   cd backend
   go mod download
   
   # 安装前端依赖
   cd ../frontend
   npm install
   ```

3. **启动项目**
   
   Windows 用户可以直接运行：
   ```bash
   start.bat
   ```
   
   这会自动启动后端（端口 8080）和前端（端口 3000）服务。

4. **访问应用**
   
   打开浏览器访问：http://localhost:3000

### 首次使用

1. 注册一个新用户账号
2. 登录后会自动加入示例项目
3. 开始使用！

**重要提示**：
- 数据库文件（`backend/data/*.db`）不会包含在 Git 仓库中，首次启动时会自动创建
- 前端依赖（`node_modules/`）不会包含在 Git 仓库中，需要通过 `install.bat` 安装
- 所有必要的目录和文件都会在首次运行时自动创建，无需手动配置

## 项目结构

```
project-manager/
├── backend/           # Go 后端服务
│   ├── config/       # 配置管理
│   ├── database/     # 数据库初始化
│   ├── handlers/     # API 处理器
│   ├── models/       # 数据模型
│   ├── routes/       # 路由配置
│   └── utils/        # 工具函数
├── frontend/         # React 前端应用
│   ├── src/
│   │   ├── components/  # React 组件
│   │   ├── pages/       # 页面组件
│   │   ├── services/    # API 服务
│   │   └── contexts/    # React Context
│   └── package.json
├── start.bat         # 启动脚本（Windows）
├── install.bat       # 安装脚本（Windows）
└── README.md         # 本文件
```

## 配置说明

项目使用环境变量进行配置，所有配置都有默认值，无需额外配置即可运行。

主要配置项（可选）：
- `PORT`: 后端服务端口（默认：8080）
- `MODE`: 运行模式（默认：debug）
- `DB_PATH`: 数据库文件路径（默认：data/project_manager.db）
- `JWT_SECRET`: JWT 密钥（未设置时自动生成）
- `CORS_ORIGIN`: 跨域配置（默认：*）

## 开发说明

### 后端开发

```bash
cd backend
go run main.go
```

### 前端开发

```bash
cd frontend
npm run dev
```

### 构建生产版本

```bash
# 构建前端
cd frontend
npm run build

# 构建后端（需要 Go 环境）
cd backend
go build -o project-manager.exe main.go
```

## 数据库

项目使用 SQLite 数据库，数据库文件会自动创建在 `backend/data/project_manager.db`。

首次启动时会自动：
- 创建数据库目录和文件
- 创建数据库表结构
- 初始化示例项目数据

**注意**：数据库文件和上传的文件不会被提交到 Git，这些文件会在首次运行时自动创建。

## 常见问题

### 端口被占用

如果 8080 或 3000 端口被占用，可以：
- 修改后端端口：设置环境变量 `PORT=8081`
- 修改前端端口：编辑 `frontend/vite.config.js`

### 依赖安装失败

- 确保 Go 和 Node.js 版本符合要求
- 尝试清除缓存后重新安装：
  ```bash
  # Go
  go clean -modcache
  
  # npm
  cd frontend
  rm -rf node_modules package-lock.json
  npm install
  ```

## 许可证

本项目采用 [MIT License](LICENSE) 开源协议。

## 贡献

欢迎提交 Issue 和 Pull Request！

