import React, { useState, useEffect } from 'react';
import { X, Palette, FileText, Save } from 'lucide-react';
import { stageAPI } from '../services/api';

const EditStageModal = ({ isOpen, onClose, stage, onUpdate }) => {
  const [formData, setFormData] = useState({
    name: '',
    color: 'blue',
    description: ''
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
        description: stage.description || ''
      });
      setError('');
    }
  }, [stage, isOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('阶段名称不能为空');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 调用真实API更新阶段
      const updatedStage = await stageAPI.updateStage(stage.id, {
        name: formData.name.trim(),
        color: formData.color,
        description: formData.description.trim()
      });
      
      onUpdate(updatedStage);
      onClose();
    } catch (error) {
      setError('更新阶段失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError('');
    onClose();
  };

  const colorOptions = [
    { value: 'blue', label: '蓝色', bg: 'bg-blue-100', border: 'border-blue-500', text: 'text-blue-800' },
    { value: 'green', label: '绿色', bg: 'bg-green-100', border: 'border-green-500', text: 'text-green-800' },
    { value: 'yellow', label: '黄色', bg: 'bg-yellow-100', border: 'border-yellow-500', text: 'text-yellow-800' },
    { value: 'purple', label: '紫色', bg: 'bg-purple-100', border: 'border-purple-500', text: 'text-purple-800' },
    { value: 'red', label: '红色', bg: 'bg-red-100', border: 'border-red-500', text: 'text-red-800' },
    { value: 'indigo', label: '靛蓝', bg: 'bg-indigo-100', border: 'border-indigo-500', text: 'text-indigo-800' },
    { value: 'pink', label: '粉色', bg: 'bg-pink-100', border: 'border-pink-500', text: 'text-pink-800' },
    { value: 'gray', label: '灰色', bg: 'bg-gray-100', border: 'border-gray-500', text: 'text-gray-800' }
  ];

  if (!isOpen || !stage) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div 
        className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
        onClick={handleClose}
      />

      {/* 模态框内容 */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
          {/* 头部 */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-6 border-b border-blue-100 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">编辑阶段</h2>
                  <p className="text-gray-600 mt-1">修改阶段的详细信息和配置</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-10 h-10 rounded-full bg-white/80 hover:bg-white flex items-center justify-center transition-all duration-200 shadow-sm"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* 表单 */}
          <div className="flex-1 overflow-y-auto">
            <form className="p-6 space-y-6">
              {/* 阶段名称 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  阶段名称 *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="输入阶段名称"
                  required
                />
              </div>

              {/* 阶段颜色 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  阶段颜色
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {colorOptions.map((color) => (
                    <label
                      key={color.value}
                      className={`relative cursor-pointer border-2 rounded-lg p-3 transition-all ${
                        formData.color === color.value
                          ? `${color.border} ring-2 ring-blue-500 ring-opacity-50`
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="color"
                        value={color.value}
                        checked={formData.color === color.value}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                      <div className={`w-full h-8 rounded ${color.bg} ${color.border} ${color.text} flex items-center justify-center text-xs font-medium`}>
                        {color.label}
                      </div>
                      {formData.color === color.value && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* 阶段描述 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  阶段描述
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="描述阶段的作用和目标"
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

            </form>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center justify-end space-x-4 p-6 border-t border-gray-200 flex-shrink-0">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="px-8 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? '保存中...' : '保存更改'}
            </button>
          </div>
      </div>
    </div>
  );
};

export default EditStageModal;
