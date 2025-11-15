import React, { useState, useEffect } from 'react';
import {
  X,
  MessageCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { projectAPI } from '../services/api';
import TaskComments from './TaskComments';

const TaskDetailModal = ({ isOpen, onClose, task, onUpdate }) => {
  const { user, hasProjectPermission } = useAuth();
  const [projectMembers, setProjectMembers] = useState([]);

  // 获取项目成员
  useEffect(() => {
    if (task?.project_id) {
      fetchProjectMembers();
    }
  }, [task?.project_id]);


  // 获取项目成员
  const fetchProjectMembers = async () => {
    try {
      const response = await projectAPI.getProjectMembers(task.project_id);
      if (response.success) {
        setProjectMembers(response.data);
      }
    } catch (error) {
      console.error('获取项目成员失败:', error);
    }
  };

  // 格式化日期时间
  const formatDateTime = (dateString) => {
    if (!dateString) return '未知时间';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '无效日期';
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen || !task) return null;

  return (
    <div>
      {/* 主模态框 */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          {/* 背景遮罩 */}
          <div 
            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
            onClick={onClose}
          ></div>

          {/* 模态框内容 */}
          <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
            <div className="flex flex-col" style={{height: '600px'}}>
            {/* 模态框头部 */}
            <div className="bg-white px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <MessageCircle className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                    <p className="text-sm text-gray-500">任务协作</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>
            </div>


            {/* 模态框内容 */}
            <div className="px-6 py-4 flex-1 overflow-y-auto group/scrollbar">
              <div className="flex flex-col h-full">
                <TaskComments 
                  taskId={task.id} 
                  projectId={task.project_id}
                  stageId={task.stage_id}
                  onCommentUpdate={() => {
                    // 可以在这里更新任务评论数量
                  }}
                />
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
};

export default TaskDetailModal;