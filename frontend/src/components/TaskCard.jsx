import React, { useState } from 'react';
import { 
  MoreVertical, 
  Edit, 
  Trash2, 
  MessageCircle, 
  User, 
  Calendar, 
  Clock,
  AlertCircle,
  CheckCircle,
  Circle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { taskAPI } from '../services/api';

const TaskCard = ({ task, onUpdate, onDelete, onMove, onViewDetail }) => {
  const { user, hasProjectPermission } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: task.title,
    description: task.description,
    priority: task.priority,
    status: task.status,
    assignee_id: task.assignee_id,
    due_date: task.due_date ? task.due_date.split('T')[0] : '',
    estimated_hours: task.estimated_hours || ''
  });

  // 优先级配置
  const priorityConfig = {
    'P1': { label: '高', color: 'text-red-600 bg-red-100', icon: AlertCircle },
    'P2': { label: '中', color: 'text-yellow-600 bg-yellow-100', icon: Circle },
    'P3': { label: '低', color: 'text-green-600 bg-green-100', icon: CheckCircle }
  };

  // 状态配置
  const statusConfig = {
    'todo': { label: '待办', color: 'text-gray-600 bg-gray-100' },
    'in_progress': { label: '进行中', color: 'text-blue-600 bg-blue-100' },
    'review': { label: '审核中', color: 'text-yellow-600 bg-yellow-100' },
    'done': { label: '已完成', color: 'text-green-600 bg-green-100' }
  };

  // 检查权限 - 单机版：登录用户可以做所有操作
  const canEdit = hasProjectPermission('manage_tasks', null);
  const canDelete = hasProjectPermission('manage_tasks', null);

  // 处理更新
  const handleUpdate = async () => {
    try {
      // 确保 assignee_id 是数字类型
      const updateData = {
        ...formData,
        assignee_id: formData.assignee_id ? parseInt(formData.assignee_id) : null,
        estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null
      };
      
      const response = await taskAPI.updateTask(task.id, updateData);
      if (response.task) {
        onUpdate && onUpdate(response.task);
        setIsEditing(false);
      }
    } catch (err) {
      console.error('更新任务失败:', err);
    }
  };

  // 处理删除
  const handleDelete = async () => {
    if (!window.confirm('确定要删除这个任务吗？')) {
      return;
    }

    try {
      await taskAPI.deleteTask(task.id);
      onDelete && onDelete(task.id);
    } catch (err) {
      console.error('删除任务失败:', err);
    }
  };

  // 处理移动
  const handleMove = async (newStageId) => {
    try {
      const response = await taskAPI.moveTask(task.id, {
        new_stage_id: newStageId
      });
      if (response.task) {
        onMove && onMove(response.task);
      }
    } catch (err) {
      console.error('移动任务失败:', err);
    }
  };

  // 格式化日期
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric'
    });
  };

  // 格式化时间
  const formatTime = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const priority = priorityConfig[task.priority] || priorityConfig['P2'];
  const status = statusConfig[task.status] || statusConfig['todo'];
  const PriorityIcon = priority.icon;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
      {/* 任务头部 */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex-1 cursor-pointer" onClick={() => onViewDetail && onViewDetail(task)}>
            {isEditing ? (
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full text-sm font-medium text-gray-900 border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            ) : (
              <h3 className="text-sm font-medium text-gray-900 hover:text-blue-600">{task.title}</h3>
            )}
            
            {task.description && (
              <p className="mt-1 text-xs text-gray-500 line-clamp-2">
                {task.description}
              </p>
            )}
          </div>

          {/* 操作菜单 */}
          {canEdit && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setIsEditing(true);
                        setShowMenu(false);
                      }}
                      className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      编辑任务
                    </button>
                    {canDelete && (
                      <button
                        onClick={() => {
                          handleDelete();
                          setShowMenu(false);
                        }}
                        className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        删除任务
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 任务内容 */}
      <div className="p-4 space-y-3">
        {/* 优先级和状态 */}
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${priority.color}`}>
            <PriorityIcon className="h-3 w-3 mr-1" />
            {priority.label}
          </span>
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
            {status.label}
          </span>
        </div>

        {/* 分配者和截止日期 */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-3">
            {task.assignee && (
              <div className="flex items-center">
                <User className="h-3 w-3 mr-1" />
                {task.assignee.username}
              </div>
            )}
            {task.due_date && (
              <div className="flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                {formatDate(task.due_date)}
              </div>
            )}
          </div>
          
          {task.estimated_hours && (
            <div className="flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              {task.estimated_hours}h
            </div>
          )}
        </div>

        {/* 编辑表单 */}
        {isEditing && (
          <div className="space-y-3 pt-3 border-t border-gray-100">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                描述
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  优先级
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({...formData, priority: e.target.value})}
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="P1">高</option>
                  <option value="P2">中</option>
                  <option value="P3">低</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  状态
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="todo">待办</option>
                  <option value="in_progress">进行中</option>
                  <option value="review">审核中</option>
                  <option value="done">已完成</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  截止日期
                </label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  预估工时
                </label>
                <input
                  type="number"
                  value={formData.estimated_hours}
                  onChange={(e) => setFormData({...formData, estimated_hours: parseFloat(e.target.value) || 0})}
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  step="0.5"
                  min="0"
                />
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
              >
                取消
              </button>
              <button
                onClick={handleUpdate}
                className="px-3 py-1 text-xs text-white bg-blue-600 rounded hover:bg-blue-700"
              >
                保存
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 任务底部 */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <MessageCircle className="h-3 w-3" />
          <span>{task.comment_count || 0} 评论</span>
        </div>
        
        <div className="text-xs text-gray-400">
          {formatTime(task.created_at)}
        </div>
      </div>

    </div>
  );
};

export default TaskCard;
