import React, { useEffect } from 'react';
import { X, Edit, Trash2, Plus, Clock, Info, Settings, List, Shield, Move, Bell } from 'lucide-react';

const StageDetailModal = ({ isOpen, onClose, stage, onEdit, canManageStages = false }) => {
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

  if (!isOpen || !stage) return null;

  const getStageColor = (color) => {
    const colorMap = {
      yellow: 'bg-yellow-500',
      blue: 'bg-blue-500',
      purple: 'bg-purple-500',
      green: 'bg-green-500',
      orange: 'bg-orange-500',
      red: 'bg-red-500',
      indigo: 'bg-indigo-500',
      pink: 'bg-pink-500',
      gray: 'bg-gray-500'
    };
    return colorMap[color] || 'bg-gray-500';
  };


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
                  <div className={`w-12 h-12 ${getStageColor(stage.color)} rounded-2xl flex items-center justify-center mr-4 shadow-lg`}>
                  <List className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">阶段详情</h2>
                  <p className="text-gray-600 mt-1">查看阶段的详细信息和配置</p>
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

          {/* 内容 */}
          <div className="flex-1 overflow-y-auto group/scrollbar">
            <div className="p-6 space-y-8">
            {/* 阶段基本信息 */}
            <div className="bg-gray-50/50 rounded-2xl p-6">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center mr-3">
                  <Info className="h-4 w-4 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">基本信息</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-200 transition-colors">
                  <span className="text-sm font-medium text-gray-700">名称</span>
                  <span className="text-sm font-semibold text-gray-900">{stage.name}</span>
                </div>
                
                {stage.description && (
                  <div className="md:col-span-2 p-4 bg-white rounded-xl border border-gray-200">
                    <span className="text-sm font-medium text-gray-700 block mb-2">描述</span>
                    <span className="text-sm text-gray-900">{stage.description}</span>
                  </div>
                )}
                
                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 hover:border-green-200 transition-colors">
                  <span className="text-sm font-medium text-gray-700">颜色</span>
                  <div className="flex items-center space-x-2">
                    <div className={`w-4 h-4 rounded-full ${getStageColor(stage.color)}`}></div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-purple-200 transition-colors">
                  <span className="text-sm font-medium text-gray-700">排序</span>
                  <span className="text-sm font-semibold text-gray-900">{stage.position || 0}</span>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-orange-200 transition-colors">
                  <span className="text-sm font-medium text-gray-700">最大任务数</span>
                  <span className="text-sm font-semibold text-gray-900">{stage.max_tasks || '无限制'}</span>
                </div>
              </div>
            </div>
            
            {/* 权限设置卡片 */}
            <div className="bg-gray-50/50 rounded-2xl p-6">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center mr-3">
                  <Shield className="h-4 w-4 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">权限设置</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-200 transition-colors">
                  <div className="flex items-center">
                    <Plus className="h-5 w-5 text-blue-500 mr-3" />
                    <div>
                      <span className="text-sm font-medium text-gray-700">允许创建任务</span>
                      <p className="text-xs text-gray-500">用户是否可以在该阶段创建新任务</p>
                    </div>
                  </div>
                  <span className={`text-base font-semibold ${
                    stage.allow_task_creation ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {stage.allow_task_creation ? '✓' : '✗'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-red-200 transition-colors">
                  <div className="flex items-center">
                    <Trash2 className="h-5 w-5 text-red-500 mr-3" />
                    <div>
                      <span className="text-sm font-medium text-gray-700">允许删除任务</span>
                      <p className="text-xs text-gray-500">用户是否可以在该阶段删除任务</p>
                    </div>
                  </div>
                  <span className={`text-base font-semibold ${
                    stage.allow_task_deletion ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {stage.allow_task_deletion ? '✓' : '✗'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-purple-200 transition-colors">
                  <div className="flex items-center">
                    <Move className="h-5 w-5 text-purple-500 mr-3" />
                    <div>
                      <span className="text-sm font-medium text-gray-700">允许移动任务</span>
                      <p className="text-xs text-gray-500">用户是否可以将任务拖拽到其他阶段</p>
                    </div>
                  </div>
                  <span className={`text-base font-semibold ${
                    stage.allow_task_movement ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {stage.allow_task_movement ? '✓' : '✗'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-yellow-200 transition-colors">
                  <div className="flex items-center">
                    <Bell className="h-5 w-5 text-yellow-500 mr-3" />
                    <div>
                      <span className="text-sm font-medium text-gray-700">通知启用</span>
                      <p className="text-xs text-gray-500">是否启用该阶段的任务通知</p>
                    </div>
                  </div>
                  <span className={`text-base font-semibold ${
                    stage.notification_enabled ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {stage.notification_enabled ? '✓' : '✗'}
                  </span>
                </div>
                
              </div>
            </div>


            {/* 创建和更新时间 */}
            <div className="bg-gray-50/50 rounded-2xl p-6">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center mr-3">
                  <Clock className="h-4 w-4 text-gray-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">时间信息</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stage.created_at && (
                  <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
                    <span className="text-sm font-medium text-gray-700">创建时间</span>
                    <span className="text-sm font-semibold text-gray-900">{new Date(stage.created_at).toLocaleString('zh-CN')}</span>
                  </div>
                )}
                {stage.updated_at && (
                  <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
                    <span className="text-sm font-medium text-gray-700">更新时间</span>
                    <span className="text-sm font-semibold text-gray-900">{new Date(stage.updated_at).toLocaleString('zh-CN')}</span>
                  </div>
                )}
              </div>
            </div>
            </div>
          </div>

          {/* 操作按钮 */}
          {canManageStages && (
            <div className="flex items-center justify-end space-x-4 p-6 border-t border-gray-200 flex-shrink-0 rounded-b-2xl">
              <button
                onClick={onEdit}
                className="px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                编辑阶段
              </button>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StageDetailModal;
