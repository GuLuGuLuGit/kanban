import React, { useState, useEffect } from 'react';
import { X, Edit, Save, Calendar, FileText, Trash2, Crown, Info, Target, Clock, AlertTriangle } from 'lucide-react';
import { projectAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const ProjectDetailModal = ({ isOpen, onClose, project, onUpdate, onDelete }) => {
  const { hasProjectPermission } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    projectOwner: null,
    expectedCompletionDate: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 当项目数据变化时，更新表单数据
  useEffect(() => {
    console.log('ProjectDetailModal收到项目数据:', project);
    if (project) {
      console.log('项目基本信息:', {
        name: project.name,
        description: project.description,
        owner: project.owner,
        membersCount: project.members?.length || 0
      });
      setFormData({
        name: project.name || '',
        projectOwner: project.owner || project.members?.find(m => m.role === 'owner')?.user || null,
        expectedCompletionDate: project.end_date ? project.end_date.split('T')[0] : '',
        description: (project.description || '').substring(0, 50) // 限制描述最多50字
      });
    }
  }, [project]);


  const handleInputChange = (field, value) => {
    // 如果是描述字段，限制50字以内
    if (field === 'description') {
      const truncatedValue = value.substring(0, 50);
      setFormData(prev => ({
        ...prev,
        [field]: truncatedValue
      }));
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('请输入项目名称');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // 调用更新项目API
      const updatedProject = await projectAPI.updateProject(project.id, {
        name: formData.name,
        description: formData.description,
        endDate: formData.expectedCompletionDate
      });

      onUpdate(updatedProject);
      setIsEditing(false);
      onClose(); // 保存成功后直接关闭详情页
    } catch (error) {
      setError('更新项目失败，请稍后重试');
      console.error('更新项目失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('确定要删除这个项目吗？此操作不可撤销。')) {
      return;
    }

    try {
      setLoading(true);
      await projectAPI.deleteProject(project.id);
      onDelete(project.id);
      onClose();
    } catch (error) {
      setError('删除项目失败，请稍后重试');
      console.error('删除项目失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsEditing(false);
    setError('');
    onClose();
  };

  // 检查项目是否过期
  const isProjectOverdue = () => {
    if (!project.end_date) return false;
    const dueDate = new Date(project.end_date);
    const now = new Date();
    return now > dueDate;
  };

  // 防止背景页面滚动
  useEffect(() => {
    if (isOpen) {
      // 保存当前滚动位置
      const scrollY = window.scrollY;
      // 阻止body滚动
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      
      return () => {
        // 恢复body滚动
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        // 恢复滚动位置
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  if (!isOpen || !project) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
      {/* 背景遮罩 */}
      <div 
        className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-50"
        onClick={handleClose}
      />

      {/* 模态框 */}
      <div className="relative z-50 w-full max-w-3xl">
        <div className="bg-white rounded-xl shadow-2xl h-[90vh] flex flex-col w-full">
          {/* 头部 - 固定 */}
          <div className="flex-shrink-0 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-6 border-b border-blue-100 rounded-t-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                  <Info className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {isEditing ? '编辑项目' : '项目详情'}
                  </h2>
                  <p className="text-gray-600 mt-1">
                    {isEditing ? '修改项目的详细信息和配置' : '查看项目的详细信息和配置'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {!isEditing && hasProjectPermission('edit_project', project) && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="w-10 h-10 rounded-full bg-white/80 hover:bg-white flex items-center justify-center transition-all duration-200 shadow-sm"
                    title="编辑项目"
                  >
                    <Edit className="h-5 w-5 text-gray-600" />
                  </button>
                )}
                <button
                  onClick={handleClose}
                  className="w-10 h-10 rounded-full bg-white/80 hover:bg-white flex items-center justify-center transition-all duration-200 shadow-sm"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            </div>
          </div>

          {/* 内容 - 可滚动 */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8 group/scrollbar">
            {/* 基本信息 */}
            <div className="bg-gray-50/50 rounded-xl p-6">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <FileText className="h-4 w-4 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">基本信息</h3>
              </div>
              
              <div className="space-y-6">
                {/* 项目名称 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    项目名称 <span className="text-red-500">*</span>
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="请输入项目名称"
                    />
                  ) : (
                    <div className="px-4 py-3 bg-white rounded-lg border border-gray-200">
                      <span className="text-gray-900 font-medium">{project.name}</span>
                    </div>
                  )}
                </div>

                {/* 项目描述 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    项目描述 <span className="text-gray-400 text-sm font-normal">(最多50字)</span>
                  </label>
                  {isEditing ? (
                    <div className="relative">
                      <textarea
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        rows={3}
                        maxLength={50}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none pr-12"
                        placeholder="请输入项目描述信息"
                      />
                      <div className="absolute bottom-2 right-3 text-xs text-gray-400">
                        {formData.description.length}/50
                      </div>
                    </div>
                  ) : (
                    <div className="px-4 py-3 bg-white rounded-lg border border-gray-200 min-h-[60px]">
                      {project.description ? (
                        <div className="flex items-start space-x-2">
                          <FileText className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <span className="whitespace-pre-wrap text-gray-900">{project.description}</span>
                        </div>
                      ) : (
                        <span className="text-gray-500">无描述信息</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 项目配置 */}
            <div className="bg-gray-50/50 rounded-xl p-6">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <Target className="h-4 w-4 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">项目配置</h3>
              </div>
              
              <div className="space-y-6">
                {/* 项目管理员 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    项目管理员
                  </label>
                  <div className="px-4 py-3 bg-white rounded-lg border border-gray-200">
                    <div className="flex items-center space-x-2">
                      <Crown className="h-4 w-4 text-purple-500" />
                      <span className="text-gray-900 font-medium">
                        {formData.projectOwner?.username || '未设置'}
                      </span>
                    </div>
                    {isEditing && (
                      <div className="text-xs text-gray-500 mt-1">
                        项目管理员创建后不可更改
                      </div>
                    )}
                  </div>
                </div>

                {/* 预计完成时间 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    预计完成时间
                  </label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={formData.expectedCompletionDate}
                      onChange={(e) => handleInputChange('expectedCompletionDate', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    />
                  ) : (
                    <div className="px-4 py-3 bg-white rounded-lg border border-gray-200">
                      {project.end_date ? (
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-900">{project.end_date.split('T')[0]}</span>
                        </div>
                      ) : (
                        <span className="text-gray-500">未设置</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 过期警告 */}
            {isProjectOverdue() && (
              <div className="bg-red-50/50 rounded-xl p-6 border border-red-200">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-red-900">项目已过期</h3>
                </div>
                
                <div className="p-4 bg-white rounded-lg border border-red-200">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-medium">
                      ⚠️
                    </div>
                    <div className="text-sm text-red-800">
                      <div className="font-medium">项目已超过预计完成日期</div>
                      <div className="text-xs text-red-600 mt-1">
                        预计完成日期：{project.end_date ? project.end_date.split('T')[0] : '未设置'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}


            {/* 时间信息 */}
            <div className="bg-gray-50/50 rounded-xl p-6">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                  <Clock className="h-4 w-4 text-gray-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">时间信息</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {project.created_at && (
                  <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                    <span className="text-sm font-medium text-gray-700">创建时间</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {new Date(project.created_at).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                )}
                {project.updated_at && (
                  <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                    <span className="text-sm font-medium text-gray-700">更新时间</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {new Date(project.updated_at).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 错误信息 */}
            {error && (
              <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center mr-3">
                  <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
                </div>
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}
          </div>

          {/* 操作按钮 - 固定 */}
          <div className="flex-shrink-0 flex items-center justify-between p-6 border-t border-gray-200 bg-white rounded-b-xl">
            <div>
              {isEditing && (
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  取消编辑
                </button>
              )}
            </div>
            
            <div className="flex space-x-4">
              {isEditing ? (
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="px-8 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? '保存中...' : '保存'}
                </button>
              ) : (
                <>
                  {hasProjectPermission('delete_project', project) && (
                    <button
                      onClick={handleDelete}
                      disabled={loading}
                      className="px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      删除项目
                    </button>
                  )}
                  <button
                    onClick={handleClose}
                    className="px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    关闭
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailModal;
