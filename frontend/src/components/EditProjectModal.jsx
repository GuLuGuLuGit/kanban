import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const EditProjectModal = ({ isOpen, onClose, onSubmit, project }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  // 当项目数据变化时，更新表单
  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        description: (project.description || '').substring(0, 50) // 限制描述最多50字
      });
    }
  }, [project]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // 如果是描述字段，限制50字以内
    if (name === 'description') {
      const truncatedValue = value.substring(0, 50);
      setFormData({
        ...formData,
        [name]: truncatedValue
      });
      return;
    }
    
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      return;
    }
    
    setIsLoading(true);
    await onSubmit(project.id, formData);
    setIsLoading(false);
  };

  if (!isOpen || !project) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* 背景遮罩 */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* 模态框 */}
        <div className="inline-block align-bottom bg-white rounded-5 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                编辑项目
              </h3>
              <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-5"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  项目名称 *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="mt-1 input-field"
                  placeholder="输入项目名称"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  项目描述 <span className="text-gray-400 text-sm font-normal">(最多50字)</span>
                </label>
                <div className="relative">
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    maxLength={50}
                    value={formData.description}
                    onChange={handleChange}
                    className="mt-1 input-field resize-none pr-12"
                    placeholder="输入项目描述（可选）"
                  />
                  <div className="absolute bottom-2 right-3 text-xs text-gray-400">
                    {formData.description.length}/50
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary"
                  disabled={isLoading}
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !formData.name.trim()}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? '保存中...' : '保存更改'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProjectModal;
