import React, { useState } from 'react';
import { X, FileText, Save, Plus, Palette } from 'lucide-react';
import { stageAPI } from '../services/api';

const CreateStageModal = ({ isOpen, onClose, onSubmit, projectId, projectName }) => {
  const [formData, setFormData] = useState({
    name: '',
    color: 'blue',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError('阶段名称不能为空');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (!projectId) {
        setError('请先选择一个项目');
        return;
      }

      // 准备阶段数据，不调用API，避免重复调用
      const stageData = {
        name: formData.name.trim(),
        color: formData.color,
        description: formData.description.trim(),
        task_limit: 10
      };
      
      console.log('准备提交阶段数据:', stageData);
      console.log('onSubmit回调类型:', typeof onSubmit);
      console.log('onSubmit回调内容:', onSubmit);
      
      // 调用成功回调，传递数据给父组件处理
      if (onSubmit && typeof onSubmit === 'function') {
        console.log('准备调用onSubmit回调...');
        onSubmit(stageData);
        console.log('onSubmit回调已调用');
      } else {
        console.error('onSubmit回调未定义或不是函数');
      }
      
      handleClose();
    } catch (error) {
      setError('创建阶段失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      color: 'blue',
      description: ''
    });
    setError('');
    onClose();
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
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* 背景遮罩 */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={handleClose}
        />

        {/* 模态框 */}
        <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="px-6 py-6">
            {/* 模态框头部 */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <Plus className="h-6 w-6 mr-3 text-blue-600" />
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">创建新阶段</h3>
                  {projectName && (
                    <p className="text-sm text-gray-500 mt-1">项目: {projectName}</p>
                  )}
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 模态框表单 */}
            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              {/* 阶段名称 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  阶段名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="输入阶段名称，如：设计阶段"
                  required
                  autoFocus
                />
              </div>

              {/* 阶段颜色 */}
              <div>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  阶段描述
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="描述阶段的作用和目标（可选）"
                />
              </div>

              {/* 错误信息 */}
              {error && (
                <div className="flex items-center text-red-600 text-sm">
                  <div className="w-4 h-4 bg-red-100 rounded-full flex items-center justify-center mr-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  </div>
                  {error}
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? '创建中...' : '创建阶段'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateStageModal;
