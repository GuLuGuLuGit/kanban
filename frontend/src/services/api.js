import axios from 'axios';

// 设置 baseURL，使用 Vite 代理
const baseURL = '/api';

// 创建axios实例
const api = axios.create({
  baseURL,
  timeout: 60000, // 60秒超时
});

// 请求拦截器 - 添加JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  (response) => {
    // 处理后端返回的嵌套数据结构
    if (response.data && response.data.code === 200 && response.data.data !== undefined) {
      return {
        ...response.data.data,
        success: true
      };
    }
    return {
      ...response.data,
      success: response.data?.code === 200
    };
  },
  (error) => {
    if (error.response?.status === 401) {
      console.log('API认证失败，跳转登录页');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 认证相关API
export const authAPI = {
  // 用户注册
  register: (data) => api.post('/auth/register', data),
  
  // 用户登录
  login: (data) => api.post('/auth/login', data),
};

// 用户相关API
export const userAPI = {
  // 搜索用户
  searchUsers: (data) => api.post('/users/search', data),
  
  // 获取用户列表
  getUsers: (params) => api.get('/users', { params }),
  
  // 创建用户
  createUser: (data) => api.post('/users', data),
  
  // 更新用户
  updateUser: (id, data) => api.put(`/users/${id}`, data),
  
  // 删除用户
  deleteUser: (id) => api.delete(`/users/${id}`),
  
  // 更新用户角色
  updateUserRole: (id, role) => api.put(`/users/${id}/role`, { role }),
  
  // 重置用户密码
  resetUserPassword: (id) => api.post(`/users/${id}/reset-password`),
};

// 项目相关API
export const projectAPI = {
  // 获取项目列表
  getProjects: () => api.get('/projects'),
  
  // 创建项目
  createProject: (data) => api.post('/projects', data),
  
  // 获取项目详情
  getProject: (id) => api.get(`/projects/${id}`),
  
  // 更新项目
  updateProject: (id, data) => api.put(`/projects/${id}`, data),
  
  // 删除项目
  deleteProject: (id) => api.delete(`/projects/${id}`),
  
  // 获取项目协作人员
  getProjectCollaborators: (projectId) => api.get(`/projects/${projectId}/collaborators`),
  
  // 获取项目成员
  getProjectMembers: (projectId) => api.get(`/project-members/${projectId}`),
  
  // 添加项目成员
  addProjectMember: (projectId, data) => api.post(`/project-members/${projectId}`, data),
  
  // 批量添加项目成员
  batchAddMembers: (projectId, data) => api.post(`/project-members/${projectId}/batch`, data),
  
  // 更新成员角色
  updateMemberRole: (projectId, userId, data) => api.put(`/project-members/${projectId}/${userId}/role`, data),
  
  // 移除项目成员
  removeProjectMember: (projectId, userId) => api.delete(`/project-members/${projectId}/${userId}`),
};

// 协作人员相关API
export const collaboratorAPI = {
  // 获取可用的协作人员列表（用于项目创建和编辑）
  getAvailableCollaborators: () => api.get('/collaborators/available'),
  
  // 获取我的协作人员列表
  getMyCollaborators: () => api.get('/collaborators/my'),
  
  // 检查协作人员的项目成员关系
  checkCollaboratorMemberships: (collaboratorId) => api.get(`/collaborators/${collaboratorId}/memberships`),
  
  // 添加协作人员
  addCollaborator: (collaboratorId) => api.post('/collaborators', { collaborator_id: collaboratorId }),
  
  // 移除协作人员
  removeCollaborator: (collaboratorId) => api.delete(`/collaborators/${collaboratorId}`),
  
  // 强制移除协作人员（包含项目成员关系）
  forceRemoveCollaborator: (collaboratorId) => api.delete(`/collaborators/${collaboratorId}?force=true`),
};

// 阶段相关API
export const stageAPI = {
  // 创建阶段
  createStage: (data) => api.post('/stages', data),
  
  // 获取项目阶段
  getProjectStages: (projectId) => api.get(`/project-stages/${projectId}`),
  
  // 更新阶段
  updateStage: (id, data) => api.put(`/stages/${id}`, data),
  
  // 删除阶段
  deleteStage: (id) => api.delete(`/stages/${id}`),
  
  // 重新排序阶段
  reorderStages: (data) => api.post('/stages/reorder', data),
};

// 任务相关API
export const taskAPI = {
  // 获取任务列表
  getTasks: (params) => api.get('/tasks', { params }),
  
  // 获取项目任务列表
  getProjectTasks: (projectId) => api.get(`/project-tasks/${projectId}`),
  
  // 获取已完成任务统计
  getCompletedTasksStats: (projectId) => api.get(`/project-tasks/${projectId}/completed-stats`),
  
  // 创建任务
  createTask: (data) => api.post('/tasks', data),
  
  // 更新任务（传统方式）
  updateTask: (id, data) => api.put(`/tasks/${id}`, data),
  
  // 更新任务（增强版 - 已退化为直接调用 REST 接口）
  updateTaskEnhanced: async (projectId, taskId, data, currentVersion) => {
    return api.put(`/tasks/${taskId}`, data);
  },
  
  // 删除任务
  deleteTask: (id) => api.delete(`/tasks/${id}`),
  
  // 删除任务（增强版）
  deleteTaskEnhanced: async (projectId, taskId, currentVersion) => {
    return api.delete(`/tasks/${taskId}`);
  },
  
  // 移动任务
  moveTask: (id, data) => api.patch(`/tasks/${id}/move`, data),
  
  // 重新排序任务
  reorderTasks: (taskOrders) => api.post('/tasks/reorder', { task_orders: taskOrders }),
  
  // 移动任务（增强版）
  moveTaskEnhanced: async (projectId, taskId, moveData, currentVersion) => {
    return api.patch(`/tasks/${taskId}/move`, moveData);
  },
  
  // 获取任务评论
  getTaskComments: (taskId) => api.get(`/task-comments/${taskId}`),
  
  // 创建任务评论
  createTaskComment: (taskId, data) => api.post(`/task-comments/${taskId}`, data),
  
  // 更新任务评论
  updateTaskComment: (id, data) => api.put(`/comments/${id}`, data),
  
  // 删除任务评论
  deleteTaskComment: (taskId, commentId) => api.delete(`/task-comments/${taskId}/${commentId}`),
  
  // 删除评论
  deleteComment: (id) => api.delete(`/comments/${id}`),
};


// 激活码功能已移除，开源版本不提供相关接口

// 文件上传功能已移除，开源版本不提供相关接口

// 统计相关API
export const analyticsAPI = {
  getProjectStats: (projectId) => api.get(`/analytics/project-stats/${projectId}`),
  getTaskStats: (projectId) => api.get(`/analytics/project-tasks/${projectId}`),
  getStageStats: (projectId) => api.get(`/analytics/project-stages/${projectId}`),
  getTaskTrend: (projectId, days = 30) => api.get(`/analytics/project-trend/${projectId}`, { 
    params: { days } 
  }),
  getUserStats: () => api.get('/analytics/users')
};

export default api;
