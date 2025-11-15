import React, { useState, useEffect, useRef } from 'react';
import { X, User, Edit, Save, Calendar, AlertTriangle, FileText, Target, Trash2, Search, ChevronDown } from 'lucide-react';
import { taskAPI } from '../services/api';

const EditTaskModal = ({ isOpen, onClose, onSubmit, task, projectId, stages, availableMembers = [] }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignee_id: '',
    priority: 'P2',
    status: 'todo', // 修复：使用数据库中的状态值
    due_date: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  
  // 人员选择下拉框状态
  const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false);
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState('');
  const assigneeDropdownRef = useRef(null);

  // 用户头像首字母组件
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

  // 防止背景滚动
  useEffect(() => {
    if (isOpen) {
      // 保存当前滚动位置
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      
      return () => {
        // 恢复滚动位置
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  // 点击外部关闭下拉框
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

  const formatDateForInput = (value) => {
    if (!value) return '';

    if (typeof value === 'string') {
      const match = value.match(/^\d{4}-\d{2}-\d{2}/);
      if (match) {
        return match[0];
      }
      // 尝试解析其他格式
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        const adjusted = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60 * 1000);
        return adjusted.toISOString().split('T')[0];
      }
      return '';
    }

    const dateObj = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(dateObj.getTime())) {
      return '';
    }
    const adjusted = new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60 * 1000);
    return adjusted.toISOString().split('T')[0];
  };

  // 当任务数据变化时，更新表单
  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        assignee_id: task.assignee_id ? task.assignee_id.toString() : '',
        priority: task.priority || 'P2',
        status: task.status || 'todo',
        due_date: formatDateForInput(task.due_date)
      });
      
      // 注意：版本控制和增强协作功能已移除
    }
  }, [task]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // 处理人员选择
  const handleAssigneeSelect = (memberId) => {
    setFormData({
      ...formData,
      assignee_id: memberId ? memberId.toString() : ''
    });
    setIsAssigneeDropdownOpen(false);
    setAssigneeSearchQuery('');
  };

  // 过滤人员列表
  const filteredMembers = availableMembers.filter(member => {
    if (!assigneeSearchQuery) return true;
    const query = assigneeSearchQuery.toLowerCase();
    return (
      member.username?.toLowerCase().includes(query) ||
      member.email?.toLowerCase().includes(query) ||
      member.projectRole?.toLowerCase().includes(query)
    );
  });

  // 获取选中的成员信息
  const selectedMember = availableMembers.find(m => m.id.toString() === formData.assignee_id);

  // 删除任务
  const handleDelete = async () => {
    if (!window.confirm('确定要删除这个任务吗？此操作不可撤销。')) {
      return;
    }

    setIsLoading(true);
    
    try {
      await taskAPI.deleteTask(task.id);
      
      // 通知父组件任务已删除 - 传递正确的参数格式
      if (onSubmit) {
        onSubmit(task.id, { deleted: true });
      }
      
      // 关闭模态框
      onClose();
    } catch (error) {
      console.error('删除任务失败:', error);
      alert('删除任务失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      return;
    }
    
    setIsLoading(true);
    
    // 准备提交数据
    const trimmedDueDate = formData.due_date?.trim();

    const submitData = {
      title: formData.title,
      description: formData.description,
      assignee_id: formData.assignee_id ? parseInt(formData.assignee_id) : null,
      priority: formData.priority,
      status: formData.status,
      due_date: trimmedDueDate || ''
    };
    
    console.log('EditTaskModal 提交数据:', submitData);
    console.log('原任务数据:', task);
    try {
      await onSubmit(task.id, submitData);
    } catch (error) {
      console.error('❌ 任务更新失败:', error);
    }
    
    setIsLoading(false);
  };

  const getPriorityColor = (priority) => {
    const priorityMap = {
      'P1': 'bg-red-100 text-red-800 border-red-200',
      'P2': 'bg-orange-100 text-orange-800 border-orange-200',
      'P3': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'P4': 'bg-blue-100 text-blue-800 border-blue-200'
    };
    return priorityMap[priority] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusColor = (status) => {
    const statusMap = {
      'todo': 'bg-gray-100 text-gray-800 border-gray-200',
      'in_progress': 'bg-blue-100 text-blue-800 border-blue-200',
      'done': 'bg-green-100 text-green-800 border-green-200',
      'cancelled': 'bg-red-100 text-red-800 border-red-200'
    };
    return statusMap[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* 背景遮罩 */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* 模态框 */}
        <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
          <div className="flex flex-col max-h-[90vh]">
          {/* 头部 */}
          <div className="flex-shrink-0 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-6 border-b border-blue-100 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                  <Edit className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">编辑任务</h2>
                  <p className="text-gray-600 mt-1">修改任务的详细信息和配置</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-xl bg-white/80 hover:bg-white flex items-center justify-center transition-all duration-200 shadow-sm"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* 表单 */}
          <div className="flex-1 overflow-y-auto group/scrollbar">
            <form onSubmit={handleSubmit} className="p-6 space-y-8">
            {/* 基本信息 */}
            <div className="bg-gray-50/50 rounded-2xl p-6">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center mr-3">
                  <FileText className="h-4 w-4 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">基本信息</h3>
              </div>
              
              <div className="space-y-6">
                {/* 任务标题 */}
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                    任务标题 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    required
                    value={formData.title}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="输入任务标题"
                  />
                </div>

                {/* 任务描述 */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    任务描述
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    value={formData.description}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                    placeholder="输入任务描述（可选）"
                  />
                </div>
              </div>
            </div>

            {/* 分配与时间 */}
            <div className="bg-gray-50/50 rounded-2xl p-6">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center mr-3">
                  <User className="h-4 w-4 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">分配和时间</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="assignee_id" className="block text-sm font-medium text-gray-700 mb-2">
                    分配给
                  </label>

                  {/* 可搜索的下拉框 */}
                  <div className="relative" ref={assigneeDropdownRef}>
                    {/* 触发按钮 */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsAssigneeDropdownOpen(!isAssigneeDropdownOpen);
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white text-left flex items-center justify-between"
                    >
                      <span className={selectedMember ? 'text-gray-900' : 'text-gray-500'}>
                        {selectedMember ? (
                          <span className="flex items-center">
                            <UserAvatar username={selectedMember.username} size="sm" />
                            <span className="ml-2">{selectedMember.username}</span>
                          </span>
                        ) : '未分配'}
                      </span>
                      <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isAssigneeDropdownOpen ? 'transform rotate-180' : ''}`} />
                    </button>

                    {/* 下拉菜单 */}
                    {isAssigneeDropdownOpen && (
                      <div className="absolute z-50 w-full mt-2 bg-white border border-gray-300 rounded-xl shadow-lg overflow-hidden">
                        {/* 搜索框 */}
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

                        {/* 成员列表 */}
                        <div className="max-h-[300px] overflow-y-auto">
                          {/* 未分配选项 */}
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

                          {/* 成员选项 */}
                                {filteredMembers.length > 0 ? (
                                  filteredMembers.map(member => (
                                    <div
                                      key={member.id}
                                      className={`w-full px-4 py-3 text-left flex items-center ${
                                        formData.assignee_id === member.id.toString() ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                                      }`}
                                    >
                                      <UserAvatar username={member.username} size="sm" />
                                      <div className="ml-3 flex-1 min-w-0">
                                        <div className="text-sm font-medium truncate">{member.username}</div>
                                      </div>
                                    </div>
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

                  {(!availableMembers || availableMembers.length === 0) && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                      <div className="flex items-center">
                        <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
                        <p className="text-xs text-yellow-700">
                          提示：如果看不到成员列表，请联系管理员添加项目成员
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-2">
                    截止日期
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      id="due_date"
                      name="due_date"
                      value={formData.due_date}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 任务配置 */}
            <div className="bg-gray-50/50 rounded-2xl p-6">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center mr-3">
                  <Target className="h-4 w-4 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">任务配置</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 优先级 */}
                <div>
                  <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
                    优先级
                  </label>
                  <select
                    id="priority"
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="P1">P1 - 高优先级</option>
                    <option value="P2">P2 - 中优先级</option>
                    <option value="P3">P3 - 低优先级</option>
                  </select>
                  <div className="mt-2">
                    <span className={`inline-block px-3 py-1.5 rounded-full text-xs font-medium border ${getPriorityColor(formData.priority)}`}>
                      {formData.priority === 'P1' ? '高优先级' : formData.priority === 'P2' ? '中优先级' : '低优先级'}
                    </span>
                  </div>
                </div>

                {/* 任务状态 */}
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                    任务状态
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="todo">待开始</option>
                    <option value="in_progress">进行中</option>
                    <option value="done">已完成</option>
                  </select>
                  <div className="mt-2">
                    <span className={`inline-block px-3 py-1.5 rounded-full text-xs font-medium border ${getStatusColor(formData.status)}`}>
                      {formData.status === 'todo' ? '待开始' : formData.status === 'in_progress' ? '进行中' : formData.status === 'done' ? '已完成' : '已取消'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            </form>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 flex-shrink-0 rounded-b-2xl">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isLoading}
              className="px-6 py-3 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              删除任务
            </button>
            
            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                取消
              </button>
              
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={isLoading || !formData.title.trim()}
                className="px-8 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? '保存中...' : '保存更改'}
              </button>
            </div>
          </div>
          </div>
        </div>
      </div>
      
    </div>
  );
};

export default EditTaskModal;
