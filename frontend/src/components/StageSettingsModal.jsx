import React, { useState, useEffect } from 'react';
import { X, Save, Settings, Palette, Shield, Bell, Move, Plus, Trash2 } from 'lucide-react';

const StageSettingsModal = ({ isOpen, onClose, stage, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    color: 'blue',
    description: '',
    maxTasks: 10,
    position: 1,
    allowTaskCreation: true,
    allowTaskDeletion: true,
    allowTaskMovement: true,
    autoAssignStatus: '待开始',
    notificationEnabled: true
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  useEffect(() => {
    if (stage && isOpen) {
      setFormData({
        name: stage.name || '',
        color: stage.color || 'blue',
        description: stage.description || '',
        maxTasks: stage.max_tasks || 10,
        position: stage.position || 1,
        allowTaskCreation: stage.allow_task_creation !== false,
        allowTaskDeletion: stage.allow_task_deletion !== false,
        allowTaskMovement: stage.allow_task_movement !== false,
        autoAssignStatus: stage.auto_assign_status || stage.autoAssignStatus || '待开始',
        notificationEnabled: stage.notification_enabled !== false
      });
      setError('');
    }
  }, [stage, isOpen]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('阶段名称不能为空');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onSubmit(formData);
    } catch (error) {
      setError('更新阶段失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const colorOptions = [
    { value: 'blue', label: '蓝色', class: 'bg-blue-500' },
    { value: 'green', label: '绿色', class: 'bg-green-500' },
    { value: 'yellow', label: '黄色', class: 'bg-yellow-500' },
    { value: 'purple', label: '紫色', class: 'bg-purple-500' },
    { value: 'orange', label: '橙色', class: 'bg-orange-500' },
    { value: 'red', label: '红色', class: 'bg-red-500' },
    { value: 'indigo', label: '靛蓝', class: 'bg-indigo-500' },
    { value: 'pink', label: '粉色', class: 'bg-pink-500' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div 
        className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
        onClick={onClose}
      />

      {/* 模态框 */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
          {/* 头部 */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-6 border-b border-blue-100 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                  <Settings className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">阶段设置</h2>
                  <p className="text-gray-600 mt-1">配置阶段的属性和权限</p>
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
                  <Palette className="h-4 w-4 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">基本信息</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 阶段名称 */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    阶段名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="输入阶段名称"
                    required
                  />
                </div>

                {/* 阶段颜色 */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    阶段颜色
                  </label>
                  <div className="grid grid-cols-4 gap-3">
                    {colorOptions.map((color) => (
                      <label key={color.value} className="relative cursor-pointer">
                        <input
                          type="radio"
                          name="color"
                          value={color.value}
                          checked={formData.color === color.value}
                          onChange={handleInputChange}
                          className="sr-only"
                        />
                        <div className={`w-full h-12 rounded-xl ${color.class} border-2 transition-all duration-200 flex items-center justify-center ${
                          formData.color === color.value
                            ? 'ring-2 ring-blue-500 ring-opacity-50'
                            : 'border-transparent hover:border-gray-300'
                        }`}>
                          <span className="text-xs font-medium text-white">{color.label}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 阶段描述 */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    阶段描述
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="描述这个阶段的用途和工作内容"
                  />
                </div>

                {/* 最大任务数 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    最大任务数
                  </label>
                  <input
                    type="number"
                    name="maxTasks"
                    value={formData.maxTasks}
                    onChange={handleInputChange}
                    min="1"
                    max="100"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="例如：10"
                  />
                  <p className="text-xs text-gray-500 mt-2">设置为0表示无限制</p>
                </div>

                {/* 排序位置 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    排序位置
                  </label>
                  <input
                    type="number"
                    name="position"
                    value={formData.position}
                    onChange={handleInputChange}
                    min="1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="例如：1"
                  />
                  <p className="text-xs text-gray-500 mt-2">数值越小越靠前，修改后会自动调整其他阶段顺序</p>
                </div>
              </div>
            </div>

            {/* 权限设置 */}
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
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="allowTaskCreation"
                      checked={formData.allowTaskCreation}
                      onChange={handleInputChange}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 hover:border-red-200 transition-colors">
                  <div className="flex items-center">
                    <Trash2 className="h-5 w-5 text-red-500 mr-3" />
                    <div>
                      <span className="text-sm font-medium text-gray-700">允许删除任务</span>
                      <p className="text-xs text-gray-500">用户是否可以在该阶段删除任务</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="allowTaskDeletion"
                      checked={formData.allowTaskDeletion}
                      onChange={handleInputChange}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 hover:border-purple-200 transition-colors">
                  <div className="flex items-center">
                    <Move className="h-5 w-5 text-purple-500 mr-3" />
                    <div>
                      <span className="text-sm font-medium text-gray-700">允许移动任务</span>
                      <p className="text-xs text-gray-500">用户是否可以将任务拖拽到其他阶段</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="allowTaskMovement"
                      checked={formData.allowTaskMovement}
                      onChange={handleInputChange}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 hover:border-yellow-200 transition-colors">
                  <div className="flex items-center">
                    <Bell className="h-5 w-5 text-yellow-500 mr-3" />
                    <div>
                      <span className="text-sm font-medium text-gray-700">通知启用</span>
                      <p className="text-xs text-gray-500">是否启用该阶段的任务通知</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="notificationEnabled"
                      checked={formData.notificationEnabled}
                      onChange={handleInputChange}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* 错误信息 */}
            {error && (
              <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center mr-3">
                  <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
                </div>
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            </form>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center justify-end space-x-4 p-6 border-t border-gray-200 flex-shrink-0 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              取消
            </button>
            
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="px-8 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? '保存中...' : '保存设置'}
            </button>
          </div>
      </div>
    </div>
  );
};

export default StageSettingsModal;
