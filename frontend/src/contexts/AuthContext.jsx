import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 检查用户是否已登录
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error('Failed to parse user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  // 用户登录
  const login = async (email, password) => {
    try {
      setError(null);
      const response = await authAPI.login({ email, password });
      
      const { token, user: userData } = response;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      
      setUser(userData);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || error.response?.data?.data?.message || '登录失败，请检查邮箱和密码';
      setError(message);
      return { success: false, error: message };
    }
  };

  // 用户注册
  const register = async (username, email, password) => {
    try {
      setError(null);
      const response = await authAPI.register({ username, email, password });
      
      const { token, user: userData } = response;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      
      setUser(userData);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || error.response?.data?.data?.message || '注册失败，请稍后重试';
      return { success: false, error: message };
    }
  };

  // 用户登出
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setError(null);
  };

  // 更新用户信息
  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  // 检查用户是否已认证
  const isAuthenticated = !!user;

  // 检查用户角色
  const isAdmin = user?.role === 'admin';
  const isUser = user?.role === 'user';

  // 检查项目权限
  // 单机版：只要用户已登录，就可以做所有操作
  const hasProjectPermission = (permission, projectData = null) => {
    if (!user) return false;
    
    // 系统管理员拥有所有权限
    if (isAdmin) return true;
    
    // 单机版：登录用户可以做所有操作
    // 如果没有项目数据或项目数据没有 user_role 字段，默认允许（单机版特性）
    if (!projectData || !projectData.user_role) {
      return true; // 单机版：登录用户可以做所有操作
    }
    
    // 如果有明确的 user_role 字段，进行权限检查（兼容多用户场景）
    switch (permission) {
      case 'create_project':
        return true; // 所有用户都可以创建项目
      
      case 'edit_project':
        // 只有项目所有者可以编辑项目
        return projectData.user_role === 'owner';
      
      case 'delete_project':
        // 单机版：所有项目成员都可以删除项目
        return ['owner', 'manager', 'collaborator'].includes(projectData.user_role);
      
      case 'manage_stages':
        // 单机版：所有项目成员都可以管理阶段
        return ['owner', 'manager', 'collaborator'].includes(projectData.user_role);
      
      case 'manage_tasks':
        // 所有项目成员都可以管理任务
        return ['owner', 'manager', 'collaborator'].includes(projectData.user_role);
      
      case 'invite_members':
        // 单机版：所有项目成员都可以邀请成员
        return ['owner', 'manager', 'collaborator'].includes(projectData.user_role);
      
      case 'manage_members':
        // 单机版：所有项目成员都可以管理成员
        return ['owner', 'manager', 'collaborator'].includes(projectData.user_role);
      
      default:
        return true; // 单机版：默认允许
    }
  };

  // 检查系统级权限
  const hasSystemPermission = (permission) => {
    if (!user) return false;
    
    switch (permission) {
      case 'manage_users':
        return isAdmin;
      case 'manage_activation_codes':
        return isAdmin;
      case 'view_all_projects':
        return isAdmin;
      case 'view_user_management':
        return true; // 所有用户都可以访问人员管理（用于搜索和添加协作人员）
      default:
        return false;
    }
  };

  // 获取用户项目角色描述
  const getProjectRoleDescription = (role) => {
    switch (role) {
      case 'project_owner':
        return '项目所有者 - 拥有项目的最高权限';
      case 'project_manager':
        return '项目管理员 - 可以管理阶段和任务';
      case 'collaborator':
        return '协作者 - 可以操作任务';
      default:
        return '未知角色';
    }
  };

  // 获取项目角色权限列表
  const getProjectRolePermissions = (role) => {
    switch (role) {
      case 'project_owner':
        return [
          '编辑项目信息',
          '删除项目',
          '管理阶段',
          '管理任务',
          '邀请成员',
          '管理成员角色',
          '移除成员'
        ];
      case 'project_manager':
        return [
          '管理阶段',
          '管理任务'
        ];
      case 'collaborator':
        return [
          '管理任务'
        ];
      default:
        return [];
    }
  };

  // hasPermission 函数，根据权限类型调用相应的检查函数
  const hasPermission = (permission, projectData = null) => {
    // 系统级权限
    if (['manage_users', 'manage_activation_codes', 'view_all_projects', 'view_user_management'].includes(permission)) {
      return hasSystemPermission(permission);
    }
    // 项目级权限
    return hasProjectPermission(permission, projectData);
  };

  const value = {
    user,
    loading,
    error,
    isAuthenticated,
    isAdmin,
    isUser,
    login,
    register,
    logout,
    updateUser,
    hasProjectPermission,
    hasSystemPermission,
    hasPermission,
    getProjectRoleDescription,
    getProjectRolePermissions,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};