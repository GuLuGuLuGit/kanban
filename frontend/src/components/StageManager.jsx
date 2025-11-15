import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Settings, 
  Trash2, 
  GripVertical, 
  ChevronDown, 
  ChevronUp,
  Users,
  Calendar,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { stageAPI } from '../services/api';

const StageManager = ({ projectId, onStageUpdate }) => {
  const { hasProjectPermission } = useAuth();
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingStage, setEditingStage] = useState(null);
  const [draggedStage, setDraggedStage] = useState(null);

  // 获取阶段列表
  const fetchStages = async () => {
    try {
      setLoading(true);
      const response = await stageAPI.getProjectStages(projectId);
      setStages(response.stages || []);
    } catch (err) {
      setError('获取阶段列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchStages();
    }
  }, [projectId]);

  // 创建阶段
  const handleCreateStage = async (stageData) => {
    try {
      const response = await stageAPI.createStage({
        ...stageData,
        project_id: parseInt(projectId)
      });
      
      if (response.data && response.data.stage) {
        setStages(prev => [...prev, response.data.stage]);
        setShowCreateForm(false);
        onStageUpdate && onStageUpdate();
      }
    } catch (err) {
      setError('创建阶段失败');
    }
  };

  // 更新阶段
  const handleUpdateStage = async (stageId, stageData) => {
    try {
      // 确保数字字段的类型转换
      const processedStageData = {
        ...stageData,
        maxTasks: stageData.maxTasks ? parseInt(stageData.maxTasks) : null
      };
      
      const response = await stageAPI.updateStage(stageId, processedStageData);
      
      if (response.stage) {
        setStages(prev => prev.map(stage => 
          stage.id === response.stage.id ? response.stage : stage
        ));
        setEditingStage(null);
        onStageUpdate && onStageUpdate();
      }
    } catch (err) {
      setError('更新阶段失败');
    }
  };

  // 删除阶段
  const handleDeleteStage = async (stageId) => {
    if (!window.confirm('确定要删除这个阶段吗？删除后无法恢复。')) {
      return;
    }

    try {
      await stageAPI.deleteStage(stageId);
      setStages(prev => prev.filter(stage => stage.id !== stageId));
      onStageUpdate && onStageUpdate();
    } catch (err) {
      setError('删除阶段失败');
    }
  };

  // 重新排序阶段
  const handleReorderStages = async (newStages) => {
    try {
      const stageOrders = newStages.map((stage, index) => ({
        stage_id: stage.id,
        sort_order: index + 1
      }));

      await stageAPI.reorderStages({ stage_orders: stageOrders });
      setStages(newStages);
    } catch (err) {
      setError('重新排序失败');
    }
  };

  // 拖拽开始
  const handleDragStart = (e, stage) => {
    setDraggedStage(stage);
    e.dataTransfer.effectAllowed = 'move';
  };

  // 拖拽结束
  const handleDragEnd = () => {
    setDraggedStage(null);
  };

  // 拖拽放置
  const handleDrop = (e, targetStage) => {
    e.preventDefault();
    
    if (!draggedStage || draggedStage.id === targetStage.id) {
      return;
    }

    const newStages = [...stages];
    const draggedIndex = newStages.findIndex(s => s.id === draggedStage.id);
    const targetIndex = newStages.findIndex(s => s.id === targetStage.id);

    // 移动元素
    const [removed] = newStages.splice(draggedIndex, 1);
    newStages.splice(targetIndex, 0, removed);

    // 更新排序
    handleReorderStages(newStages);
  };

  // 拖拽悬停
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 错误提示 */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* 阶段列表 */}
      <div className="space-y-2">
        {stages.map((stage, index) => (
          <div
            key={stage.id}
            draggable={hasProjectPermission('manage_stages', null)}
            onDragStart={(e) => handleDragStart(e, stage)}
            onDragEnd={handleDragEnd}
            onDrop={(e) => handleDrop(e, stage)}
            onDragOver={handleDragOver}
            className={`p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow ${
              draggedStage?.id === stage.id ? 'opacity-50' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {/* 拖拽手柄 */}
                {hasProjectPermission('manage_stages', null) && (
                  <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
                )}
                
                {/* 阶段颜色 */}
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: stage.color || '#3B82F6' }}
                ></div>
                
                {/* 阶段信息 */}
                <div>
                  <h3 className="font-medium text-gray-900">{stage.name}</h3>
                  {stage.description && (
                    <p className="text-sm text-gray-500">{stage.description}</p>
                  )}
                </div>
              </div>

              {/* 阶段统计 */}
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-1" />
                  {stage.task_count || 0} 任务
                </div>
                {stage.max_tasks > 0 && (
                  <div className="flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    最多 {stage.max_tasks} 个
                  </div>
                )}
              </div>

              {/* 操作按钮 */}
              {hasProjectPermission('manage_stages', null) && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setEditingStage(stage)}
                    className="p-1 text-gray-400 hover:text-blue-600"
                    title="编辑阶段"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteStage(stage.id)}
                    className="p-1 text-gray-400 hover:text-red-600"
                    title="删除阶段"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* 阶段设置 */}
            <div className="mt-3 flex items-center space-x-4 text-xs text-gray-500">
              <div className="flex items-center">
                <CheckCircle className="h-3 w-3 mr-1" />
                允许创建任务: {stage.allow_task_creation ? '是' : '否'}
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-3 w-3 mr-1" />
                允许删除任务: {stage.allow_task_deletion ? '是' : '否'}
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-3 w-3 mr-1" />
                允许移动任务: {stage.allow_task_movement ? '是' : '否'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 创建阶段按钮 */}
      {hasProjectPermission('manage_stages', null) && (
        <button
          onClick={() => setShowCreateForm(true)}
          className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors"
        >
          <Plus className="h-5 w-5 mx-auto mb-2" />
          添加新阶段
        </button>
      )}

      {/* 创建/编辑阶段表单 */}
      {(showCreateForm || editingStage) && (
        <StageForm
          stage={editingStage}
          onSubmit={editingStage ? handleUpdateStage : handleCreateStage}
          onCancel={() => {
            setShowCreateForm(false);
            setEditingStage(null);
          }}
        />
      )}
    </div>
  );
};

// 阶段表单组件
const StageForm = ({ stage, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: stage?.name || '',
    description: stage?.description || '',
    color: stage?.color || 'blue',
    max_tasks: stage?.max_tasks || 10,
    allow_task_creation: stage?.allow_task_creation ?? true,
    allow_task_deletion: stage?.allow_task_deletion ?? true,
    allow_task_movement: stage?.allow_task_movement ?? true,
    auto_assign_status: stage?.auto_assign_status || '',
    notification_enabled: stage?.notification_enabled ?? true
  });

  const colors = [
    { name: '蓝色', value: 'blue', class: 'bg-blue-500' },
    { name: '绿色', value: 'green', class: 'bg-green-500' },
    { name: '红色', value: 'red', class: 'bg-red-500' },
    { name: '黄色', value: 'yellow', class: 'bg-yellow-500' },
    { name: '紫色', value: 'purple', class: 'bg-purple-500' },
    { name: '粉色', value: 'pink', class: 'bg-pink-500' },
    { name: '灰色', value: 'gray', class: 'bg-gray-500' }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    
    onSubmit(stage?.id, formData);
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        {stage ? '编辑阶段' : '创建新阶段'}
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 基本信息 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              阶段名称 *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              最大任务数
            </label>
            <input
              type="number"
              value={formData.max_tasks}
              onChange={(e) => setFormData({...formData, max_tasks: parseInt(e.target.value) || 0})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            阶段描述
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={2}
          />
        </div>

        {/* 颜色选择 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            阶段颜色
          </label>
          <div className="flex space-x-2">
            {colors.map(color => (
              <button
                key={color.value}
                type="button"
                onClick={() => setFormData({...formData, color: color.value})}
                className={`w-8 h-8 rounded-full ${color.class} ${
                  formData.color === color.value ? 'ring-2 ring-blue-500' : ''
                }`}
                title={color.name}
              />
            ))}
          </div>
        </div>

        {/* 权限设置 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            权限设置
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.allow_task_creation}
                onChange={(e) => setFormData({...formData, allow_task_creation: e.target.checked})}
                className="mr-2"
              />
              允许在此阶段创建任务
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.allow_task_deletion}
                onChange={(e) => setFormData({...formData, allow_task_deletion: e.target.checked})}
                className="mr-2"
              />
              允许在此阶段删除任务
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.allow_task_movement}
                onChange={(e) => setFormData({...formData, allow_task_movement: e.target.checked})}
                className="mr-2"
              />
              允许移动任务到此阶段
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.notification_enabled}
                onChange={(e) => setFormData({...formData, notification_enabled: e.target.checked})}
                className="mr-2"
              />
              启用通知
            </label>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            取消
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            {stage ? '更新阶段' : '创建阶段'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StageManager;
