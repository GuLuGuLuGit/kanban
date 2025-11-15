import React, { useState, useEffect } from 'react';
import {
  Clock,
  User,
  Edit,
  Move,
  Trash2,
  Plus,
  CheckCircle,
  RotateCcw,
  FileText,
  Download,
  MessageSquare,
  Calendar,
  AlertCircle,
  Loader,
  X
} from 'lucide-react';
import api from '../services/api';

const TaskActivityLog = ({ taskId, isOpen, onClose, embedded = false }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (isOpen && taskId) {
      fetchActivities();
    }
  }, [isOpen, taskId]);

  const fetchActivities = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/task-activities/task/${taskId}`);
      console.log('API Response:', response);
      // 由于响应拦截器已经展开了 data.data，所以直接使用 response.activities
      setActivities(response.activities || []);
    } catch (err) {
      setError('Failed to fetch activities.');
      console.error('Error fetching task activities:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (actionType) => {
    switch (actionType) {
      case 'created':
        return <Plus className="h-4 w-4 text-green-500" />;
      case 'updated':
        return <Edit className="h-4 w-4 text-blue-500" />;
      case 'moved':
        return <Move className="h-4 w-4 text-purple-500" />;
      case 'deleted':
        return <Trash2 className="h-4 w-4 text-red-500" />;
      case 'assigned':
        return <User className="h-4 w-4 text-indigo-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-teal-500" />;
      case 'comment_added':
        return <MessageSquare className="h-4 w-4 text-gray-500" />;
      case 'due_date_changed':
        return <Calendar className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  // 状态值中文映射
  const statusMap = {
    'todo': '待办',
    'in_progress': '进行中',
    'review': '审核中',
    'done': '已完成',
    'cancelled': '已取消'
  };

  // 优先级值中文映射
  const priorityMap = {
    'P1': '高',
    'P2': '中',
    'P3': '低'
  };

  // 转换字段值为中文
  const translateValue = (fieldName, value) => {
    if (!value) return value;
    
    if (fieldName === 'status') {
      return statusMap[value] || value;
    }
    if (fieldName === 'priority') {
      return priorityMap[value] || value;
    }
    return value;
  };

  // 转换描述文本中的英文状态值为中文
  const translateDescription = (description) => {
    if (!description) return description;
    
    let translated = description;
    // 替换状态值（匹配带引号的值，如 "todo" 或 \"todo\"）
    Object.keys(statusMap).forEach(key => {
      // 匹配 "todo" 或 \"todo\" 或 'todo'
      translated = translated.replace(new RegExp(`"${key}"`, 'g'), `"${statusMap[key]}"`);
      translated = translated.replace(new RegExp(`\\\\"${key}\\\\"`, 'g'), `\\"${statusMap[key]}\\"`);
      translated = translated.replace(new RegExp(`'${key}'`, 'g'), `'${statusMap[key]}'`);
    });
    // 替换优先级值
    Object.keys(priorityMap).forEach(key => {
      translated = translated.replace(new RegExp(`"${key}"`, 'g'), `"${priorityMap[key]}"`);
      translated = translated.replace(new RegExp(`\\\\"${key}\\\\"`, 'g'), `\\"${priorityMap[key]}\\"`);
      translated = translated.replace(new RegExp(`'${key}'`, 'g'), `'${priorityMap[key]}'`);
    });
    return translated;
  };

  // 过滤活动记录
  const filteredActivities = activities.filter(activity => {
    // 首先过滤类型
    if (filter !== 'all' && activity.action_type !== filter) {
      return false;
    }
    
    // 对于有旧值和新值的记录，检查是否真的有变化
    if (activity.old_value && activity.new_value) {
      // 如果旧值和新值相同，则不显示
      if (activity.old_value === activity.new_value) {
        return false;
      }
    }
    
    return true;
  });

  // 活动类型选项
  const activityTypes = [
    { value: 'all', label: '全部' },
    { value: 'created', label: '创建' },
    { value: 'updated', label: '更新' },
    { value: 'moved', label: '移动' },
    { value: 'assigned', label: '分配' }
  ];

  if (!isOpen) return null;

  if (embedded) {
    // 嵌入模式：直接显示内容，不包装模态框
    return (
      <div className="space-y-4">

        {/* 筛选器 */}
        <div className="mb-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">筛选:</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {activityTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            {error}
          </div>
        )}

        {/* 加载状态 */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader className="h-6 w-6 animate-spin text-blue-600 mr-2" />
            <span className="text-gray-600">加载中...</span>
          </div>
        )}

        {/* 活动记录列表 */}
        {!loading && (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2 group/scrollbar">
            {filteredActivities.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>暂无活动记录</p>
              </div>
            ) : (
              filteredActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="p-4 rounded-xl border bg-gray-50"
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {getActivityIcon(activity.action_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          <span className="text-blue-600 font-semibold">{activity.user?.username || '未知用户'}</span>
                          {' '}{translateDescription(activity.description)}
                        </p>
                        <span className="text-xs text-gray-500">
                          {formatTime(activity.created_at)}
                        </span>
                      </div>
                      {(activity.old_value || activity.new_value) && (
                        <div className="mt-2 text-xs">
                          {activity.old_value && (
                            <span className="inline-block px-2 py-1 bg-red-100 text-red-700 rounded mr-2">
                              旧值: {translateValue(activity.field_name, activity.old_value)}
                            </span>
                          )}
                          {activity.new_value && (
                            <span className="inline-block px-2 py-1 bg-green-100 text-green-700 rounded">
                              新值: {translateValue(activity.field_name, activity.new_value)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    );
  }

  // 模态框模式：保持原有样式
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* 背景遮罩 */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        ></div>

        {/* 模态框内容 */}
        <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* 模态框头部 */}
          <div className="bg-white px-6 py-4 border-b border-gray-200 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mr-3">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">任务活动记录</h3>
                  <p className="text-sm text-gray-500">查看任务的所有操作历史</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* 模态框内容 */}
          <div className="px-6 py-4">
            {/* 筛选器 */}
            <div className="mb-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">筛选:</label>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {activityTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                {error}
              </div>
            )}

            {/* 加载状态 */}
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader className="h-6 w-6 animate-spin text-blue-600 mr-2" />
                <span className="text-gray-600">加载中...</span>
              </div>
            )}

            {/* 活动记录列表 */}
            {!loading && (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredActivities.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>暂无活动记录</p>
                  </div>
                ) : (
                  filteredActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="p-4 rounded-xl border bg-gray-50"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          {getActivityIcon(activity.action_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900">
                              {translateDescription(activity.description)}
                            </p>
                            <span className="text-xs text-gray-500">
                              {formatTime(activity.created_at)}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-gray-600">
                            <span className="font-medium">{activity.user?.username || '未知用户'}</span>
                          </div>
                          {(activity.old_value || activity.new_value) && (
                            <div className="mt-2 text-xs">
                              {activity.old_value && (
                                <span className="inline-block px-2 py-1 bg-red-100 text-red-700 rounded mr-2">
                                  旧值: {translateValue(activity.field_name, activity.old_value)}
                                </span>
                              )}
                              {activity.new_value && (
                                <span className="inline-block px-2 py-1 bg-green-100 text-green-700 rounded">
                                  新值: {translateValue(activity.field_name, activity.new_value)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 统计信息 */}
            {!loading && activities.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>共 {activities.length} 条记录</span>
                  <span>显示 {filteredActivities.length} 条</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskActivityLog;