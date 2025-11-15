import React, { useState, useEffect } from 'react';
import { X, User, Mail, Shield, Crown, Save, UserPlus } from 'lucide-react';
import { userAPI } from '../services/api';

const EditUserModal = ({ isOpen, onClose, user, onSave, onUserCreated }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'project_member'
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [isNewUser, setIsNewUser] = useState(false);

  // 当用户数据变化时更新表单
  useEffect(() => {
    if (user && user.id) {
      // 编辑现有用户
      setIsNewUser(false);
      setFormData({
        username: user.username || '',
        email: user.email || '',
        password: '', // 编辑时不显示密码
        role: user.role || 'project_member'
      });
    } else {
      // 创建新用户
      setIsNewUser(true);
      setFormData({
        username: '',
        email: '',
        password: '',
        role: 'project_member'
      });
    }
    setErrors({});
  }, [user]);

  // 处理表单输入变化
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // 清除对应字段的错误
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // 验证表单
  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = '用户名不能为空';
    } else if (formData.username.length < 2) {
      newErrors.username = '用户名至少需要2个字符';
    }

    if (!formData.email.trim()) {
      newErrors.email = '邮箱不能为空';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '请输入有效的邮箱地址';
    }

    if (isNewUser && !formData.password) {
      newErrors.password = '密码不能为空';
    } else if (isNewUser && formData.password.length < 6) {
      newErrors.password = '密码至少需要6个字符';
    }

    if (!formData.role) {
      newErrors.role = '请选择用户角色';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 处理表单提交
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      let result;
      
      if (isNewUser) {
        // 创建新用户
        result = await userAPI.createUser(formData);
        onUserCreated(result);
      } else {
        // 更新现有用户
        const updateData = { ...formData };
        if (!updateData.password) {
          delete updateData.password; // 如果没有输入密码，不更新密码
        }
        result = await userAPI.updateUser(user.id, updateData);
        onSave(result);
      }
    } catch (error) {
      console.error('保存用户失败:', error);
      // 处理错误
      const message = error.response?.data?.message || '操作失败，请稍后重试';
      setErrors({ general: message });
    } finally {
      setLoading(false);
    }
  };

  // 获取角色选项 - 只显示团队成员和项目管理员
  const getRoleOptions = () => [
    { value: 'project_member', label: '团队成员', description: '可以参与项目协作，管理自己的任务' },
    { value: 'project_manager', label: '项目管理员', description: '可以创建项目，选择项目成员，管理项目' }
  ];

  // 获取角色图标
  const getRoleIcon = (role) => {
    switch (role) {
      case 'project_manager':
        return <Shield className="h-4 w-4" />;
      case 'project_member':
        return <User className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* 背景遮罩 */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        ></div>

        {/* 模态框内容 */}
        <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {/* 模态框头部 */}
          <div className="bg-white px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mr-3">
                  {isNewUser ? (
                    <UserPlus className="h-5 w-5 text-white" />
                  ) : (
                    <User className="h-5 w-5 text-white" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {isNewUser ? '添加新用户' : '编辑用户'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {isNewUser ? '创建新的系统用户' : '修改用户信息和角色'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* 模态框表单 */}
          <form onSubmit={handleSubmit} className="px-6 py-6">
            {/* 用户名 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                用户名 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    errors.username ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="请输入用户名"
                />
              </div>
              {errors.username && (
                <p className="mt-1 text-sm text-red-600">{errors.username}</p>
              )}
            </div>

            {/* 邮箱 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                邮箱地址 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="请输入邮箱地址"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {/* 密码 - 仅新用户或编辑时显示 */}
            {isNewUser && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  密码 <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="请输入密码（至少6位）"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                )}
              </div>
            )}

            {/* 角色选择 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                用户角色 <span className="text-red-500">*</span>
              </label>
              <div className="space-y-3">
                {getRoleOptions().map((role) => (
                  <label
                    key={role.value}
                    className={`flex items-start p-4 border rounded-xl cursor-pointer transition-all duration-200 ${
                      formData.role === role.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={role.value}
                      checked={formData.role === role.value}
                      onChange={handleInputChange}
                      className="mt-1 mr-3 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center mb-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mr-2 ${
                          role.value === 'project_manager' ? 'bg-orange-100 text-orange-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {getRoleIcon(role.value)}
                          <span className="ml-1">{role.label}</span>
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{role.description}</p>
                    </div>
                  </label>
                ))}
              </div>
              {errors.role && (
                <p className="mt-1 text-sm text-red-600">{errors.role}</p>
              )}
            </div>

            {/* 通用错误 */}
            {errors.general && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-600">{errors.general}</p>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors duration-200"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {isNewUser ? '创建用户' : '保存更改'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditUserModal;
