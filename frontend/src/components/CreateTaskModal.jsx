import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, User, Calendar, AlertCircle, Search, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { taskAPI, projectAPI } from '../services/api';

const CreateTaskModal = ({ isOpen, onClose, onSubmit, onSuccess, stage, projectId }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [projectMembers, setProjectMembers] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'P2',
    status: 'todo',
    assignee_id: '',
    due_date: ''
  });
  const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false);
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState('');
  const assigneeDropdownRef = useRef(null);

  const UserAvatar = ({ username, size = 'sm' }) => {
    const getInitials = (name) => {
      if (!name) return '?';
      return name
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
    };

    const sizeClasses = {
      sm: 'w-6 h-6 text-xs',
      md: 'w-8 h-8 text-sm',
      lg: 'w-10 h-10 text-base'
    };

    return (
      <div className={`${sizeClasses[size]} bg-blue-500 text-white rounded-full flex items-center justify-center font-medium`}>
        {getInitials(username)}
      </div>
    );
  };

  // 获取项目成员
  useEffect(() => {
    if (projectId) {
      fetchProjectMembers();
    }
  }, [projectId]);

  const fetchProjectMembers = async () => {
    try {
      const response = await projectAPI.getProjectMembers(projectId);
      let members = (response.members || []).map(member => ({
        id: member.user_id ?? member.id ?? member.user?.id ?? '',
        username: member.user?.username ?? member.username ?? `成员${member.user_id ?? member.id ?? ''}`,
        email: member.user?.email ?? member.email ?? '',
        projectRole: member.role ?? member.projectRole ?? '',
        systemRole: member.user?.role ?? member.systemRole ?? ''
      }));
      
      // 确保当前登录用户也在成员列表中（即使不在项目成员表中，也应该可以选择自己）
      if (user && user.id) {
        const currentUserInList = members.find(m => m.id?.toString() === user.id.toString());
        if (!currentUserInList) {
          // 如果当前用户不在成员列表中，添加进去
          members = [
            {
              id: user.id,
              username: user.username || '我',
              email: user.email || '',
              projectRole: 'owner', // 默认角色
              systemRole: user.role || 'user'
            },
            ...members
          ];
        }
      }
      
      setProjectMembers(members);
    } catch (err) {
      console.error('获取项目成员失败:', err);
      // 如果获取失败，至少确保当前用户可以在列表中选择自己
      if (user && user.id) {
        setProjectMembers([
          {
            id: user.id,
            username: user.username || '我',
            email: user.email || '',
            projectRole: 'owner',
            systemRole: user.role || 'user'
          }
        ]);
      }
    }
  };

  // 点击外部时关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (assigneeDropdownRef.current && !assigneeDropdownRef.current.contains(event.target)) {
        setIsAssigneeDropdownOpen(false);
        setAssigneeSearchQuery('');
      }
    };

    if (isAssigneeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAssigneeDropdownOpen]);

  // 重置表单
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'P2',
      status: 'todo',
      assignee_id: '',
      due_date: ''
    });
    setError(null);
    setIsAssigneeDropdownOpen(false);
    setAssigneeSearchQuery('');
  };

  // 关闭模态框
  const handleClose = () => {
    resetForm();
    onClose();
  };

  // 处理表单输入
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAssigneeSelect = (memberId) => {
    setFormData(prev => ({
      ...prev,
      assignee_id: memberId ? memberId.toString() : ''
    }));
    setIsAssigneeDropdownOpen(false);
    setAssigneeSearchQuery('');
  };

  const filteredMembers = projectMembers.filter(member => {
    if (!assigneeSearchQuery) return true;
    const query = assigneeSearchQuery.toLowerCase();
    return member.username?.toLowerCase().includes(query);
  });

  const selectedMember = projectMembers.find(
    member => member.id?.toString() === (formData.assignee_id || '').toString()
  );

  // 提交表单
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError('请输入任务标题');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const taskData = {
        ...formData,
        stage_id: stage.id,
        project_id: parseInt(projectId),
        assignee_id: formData.assignee_id ? parseInt(formData.assignee_id) : null
      };

      const response = await taskAPI.createTask(taskData);
      
      console.log('创建任务API响应:', response);
      console.log('response.task:', response.task);
      console.log('response.message:', response.message);
      
      if (response.task) {
        // 优先使用onSuccess回调，如果没有则使用onSubmit
        if (onSuccess) {
          onSuccess(response.task);
        } else if (onSubmit) {
          onSubmit(response.task);
        }
        handleClose();
      } else {
        console.error('创建任务失败 - 没有task字段:', response);
        setError('创建任务失败，请重试');
      }
    } catch (err) {
      const message = err.response?.data?.message || '创建任务失败，请重试';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* 背景遮罩 */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={handleClose}
        ></div>

        {/* 模态框内容 */}
        <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
          <div className="flex flex-col max-h-[90vh]">
          {/* 模态框头部 */}
          <div className="flex-shrink-0 bg-white px-6 py-4 border-b border-gray-200 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-2xl flex items-center justify-center mr-3">
                  <Plus className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">创建新任务</h3>
                  <p className="text-sm text-gray-500">在 "{stage?.name}" 阶段中创建任务</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* 模态框内容 */}
          <div className="flex-1 overflow-y-auto group/scrollbar">
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* 错误提示 */}
              {error && (
                <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  {error}
                </div>
              )}

              {/* 基本信息 */}
              <div className="bg-gray-50/50 rounded-2xl p-6">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center mr-3">
                    <Plus className="h-4 w-4 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">基本信息</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      任务标题 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      placeholder="请输入任务标题"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      任务描述
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="请输入任务描述（可选）"
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* 分配和时间设置 */}
              <div className="bg-gray-50/50 rounded-2xl p-6">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center mr-3">
                    <User className="h-4 w-4 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">分配和时间</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      分配给
                    </label>
                    <div className="relative" ref={assigneeDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setIsAssigneeDropdownOpen(prev => !prev)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white text-left flex items-center justify-between"
                      >
                        <span className={selectedMember ? 'text-gray-900' : 'text-gray-500'}>
                          {selectedMember ? (
                            <span className="flex items-center">
                              <UserAvatar username={selectedMember.username} size="sm" />
                              <span className="ml-2">
                                {selectedMember.username}
                              </span>
                            </span>
                          ) : '未分配'}
                        </span>
                        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isAssigneeDropdownOpen ? 'transform rotate-180' : ''}`} />
                      </button>

                      {isAssigneeDropdownOpen && (
                        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-300 rounded-xl shadow-lg overflow-hidden">
                          <div className="p-3 border-b border-gray-200">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <input
                                type="text"
                                value={assigneeSearchQuery}
                                onChange={(e) => setAssigneeSearchQuery(e.target.value)}
                                placeholder="搜索成员..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                autoFocus
                              />
                            </div>
                          </div>

                          <div className="max-h-[300px] overflow-y-auto">
                            <button
                              type="button"
                              onClick={() => handleAssigneeSelect('')}
                              className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center ${
                                !formData.assignee_id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                              }`}
                            >
                              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                                <span className="text-xs text-gray-500">—</span>
                              </div>
                              <span className="text-sm">未分配</span>
                            </button>

                            {filteredMembers.length > 0 ? (
                              filteredMembers.map(member => (
                                <button
                                  key={member.id}
                                  type="button"
                                  onClick={() => handleAssigneeSelect(member.id)}
                                  className={`w-full px-4 py-3 text-left flex items-center hover:bg-gray-50 transition-colors ${
                                    formData.assignee_id === member.id.toString() ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                                  }`}
                                >
                                  <UserAvatar username={member.username} size="sm" />
                                  <div className="ml-3 flex-1 min-w-0">
                                    <div className="text-sm font-medium truncate">{member.username}</div>
                                  </div>
                                </button>
                              ))
                            ) : (
                              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                {assigneeSearchQuery ? '未找到匹配的成员' : '暂无可用成员'}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      截止日期
                    </label>
                    <input
                      type="date"
                      name="due_date"
                      value={formData.due_date}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${formData.due_date ? 'text-gray-900' : 'text-gray-500'}`}
                    />
                  </div>

                </div>
              </div>

              {/* 任务配置 */}
              <div className="bg-gray-50/50 rounded-2xl p-6">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center mr-3">
                    <AlertCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">任务配置</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      优先级
                    </label>
                    <select
                      name="priority"
                      value={formData.priority}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="P1">高优先级</option>
                      <option value="P2">中优先级</option>
                      <option value="P3">低优先级</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      状态
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="todo">待开始</option>
                      <option value="in_progress">进行中</option>
                      <option value="done">已完成</option>
                    </select>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 flex-shrink-0 rounded-b-2xl">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !formData.title.trim()}
              className="px-8 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  创建中...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  创建任务
                </>
              )}
            </button>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateTaskModal;