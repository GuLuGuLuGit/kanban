import React, { useState, useEffect } from 'react';
import { 
  X, 
  Users, 
  UserPlus, 
  Search, 
  Trash2, 
  Crown,
  Shield,
  User,
  Loader,
  AlertCircle
} from 'lucide-react';
import { projectAPI, userAPI, collaboratorAPI } from '../services/api';

const ProjectMemberModal = ({ isOpen, onClose, project, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [members, setMembers] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [allCollaborators, setAllCollaborators] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [newMemberRole, setNewMemberRole] = useState('collaborator');

  // 角色配置
  const roleConfig = {
    owner: { 
      label: '项目所有者', 
      color: 'bg-yellow-100 text-yellow-800', 
      icon: Crown,
      description: '拥有项目的完全控制权'
    },
    manager: { 
      label: '项目经理', 
      color: 'bg-blue-100 text-blue-800', 
      icon: Shield,
      description: '可以管理项目和团队成员'
    },
    collaborator: { 
      label: '协作者', 
      color: 'bg-green-100 text-green-800', 
      icon: User,
      description: '可以查看和参与项目任务'
    }
  };

  // 获取项目成员
  const fetchMembers = async () => {
    if (!project?.id) return;
    
    try {
      setLoading(true);
      const response = await projectAPI.getProjectMembers(project.id);
      // API拦截器已经处理了数据结构，直接返回 { members: [...] }
      if (response && response.members) {
        setMembers(response.members);
      } else {
        setMembers([]);
      }
    } catch (error) {
      console.error('获取项目成员失败:', error);
      setError('获取项目成员失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取协作人员列表
  const fetchCollaborators = async () => {
    try {
      const collaboratorsResponse = await collaboratorAPI.getMyCollaborators();
      
      if (collaboratorsResponse.success) {
        // API拦截器已处理，collaboratorsResponse 包含 { collaborators: [...], total: 4, success: true }
        const collaborators = collaboratorsResponse.collaborators || [];
        
        // 过滤掉已经是项目成员的用户
        const availableCollaborators = collaborators.filter(user => 
          !members.some(member => member.user_id === user.id)
        );
        
        setAllCollaborators(availableCollaborators);
        setAvailableUsers(availableCollaborators);
      }
    } catch (error) {
      console.error('获取协作人员失败:', error);
      setAllCollaborators([]);
      setAvailableUsers([]);
    }
  };

  // 快速添加单个成员
  const handleQuickAddMember = async (userId, role = 'collaborator') => {
    try {
      setLoading(true);
      setError(null);
      
      const memberData = {
        members: [{
          user_id: userId,
          role: role
        }]
      };

      const response = await projectAPI.batchAddMembers(project.id, memberData);
      if (response.success) {
        await fetchMembers(); // 重新获取成员列表
        // 注意：这里不需要重新调用fetchCollaborators，因为成员列表更新后会自动触发
        onUpdate && onUpdate(); // 通知父组件更新
      } else {
        setError(response.message || '添加成员失败');
      }
    } catch (error) {
      console.error('添加成员失败:', error);
      setError('添加成员失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 批量添加成员
  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) {
      setError('请选择要添加的用户');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const memberData = {
        members: selectedUsers.map(userId => ({
          user_id: userId,
          role: newMemberRole
        }))
      };

      const response = await projectAPI.batchAddMembers(project.id, memberData);
      if (response.success) {
        await fetchMembers(); // 重新获取成员列表
        // 注意：这里不需要重新调用fetchCollaborators，因为成员列表更新后会自动触发
        setSelectedUsers([]);
        setShowAddMember(false);
        setSearchTerm('');
        onUpdate && onUpdate(); // 通知父组件更新
      } else {
        setError(response.message || '添加成员失败');
      }
    } catch (error) {
      console.error('添加成员失败:', error);
      setError('添加成员失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 移除成员
  const handleRemoveMember = async (userId) => {
    if (!confirm('确定要移除此成员吗？')) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await projectAPI.removeProjectMember(project.id, userId);
      if (response.success) {
        await fetchMembers(); // 重新获取成员列表
        // 注意：这里不需要重新调用fetchCollaborators，因为成员列表更新后会自动触发
        onUpdate && onUpdate(); // 通知父组件更新
      } else {
        setError(response.message || '移除成员失败');
      }
    } catch (error) {
      console.error('移除成员失败:', error);
      setError('移除成员失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 更新成员角色
  const handleUpdateRole = async (userId, newRole) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await projectAPI.updateMemberRole(project.id, userId, { role: newRole });
      if (response.success) {
        await fetchMembers(); // 重新获取成员列表
        // 注意：这里不需要重新调用fetchCollaborators，因为成员列表更新后会自动触发
        onUpdate && onUpdate(); // 通知父组件更新
      } else {
        setError(response.message || '更新角色失败');
      }
    } catch (error) {
      console.error('更新角色失败:', error);
      setError('更新角色失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 切换用户选择
  const handleUserToggle = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.trim()) {
        const filteredUsers = allCollaborators.filter(user => 
          user.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
          user.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setAvailableUsers(filteredUsers);
      } else {
        setAvailableUsers(allCollaborators);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, allCollaborators]);

  // 组件挂载时获取成员列表和协作人员列表
  useEffect(() => {
    if (isOpen && project?.id) {
      fetchMembers();
      fetchCollaborators();
    }
  }, [isOpen, project?.id]);

  // 当成员列表更新时，重新获取协作人员列表
  useEffect(() => {
    if (isOpen && project?.id && members.length >= 0) {
      fetchCollaborators();
    }
  }, [members.length]);

  if (!isOpen || !project) return null;

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
          <div className="flex flex-col" style={{height: '600px'}}>
            {/* 模态框头部 */}
            <div className="bg-white px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">项目成员管理</h3>
                    <p className="text-sm text-gray-500">{project.name}</p>
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
            <div className="px-6 py-4 flex-1 overflow-hidden flex flex-col">
              {/* 错误提示 */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  {error}
                </div>
              )}

              {/* 上部分：协作人员列表 */}
              <div className="flex-1 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-900">
                    协作人员 ({availableUsers.length})
                  </h4>
                  <div className="relative w-64">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="搜索协作人员..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>
                
                <div className="h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white group/scrollbar">
                  {availableUsers.length > 0 ? (
                    availableUsers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                            {user.username?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{user.username}</div>
                            <div className="text-xs text-gray-500">{user.email}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleQuickAddMember(user.id, 'collaborator')}
                            disabled={loading}
                            className="flex items-center px-3 py-1 text-xs text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
                          >
                            <UserPlus className="h-3 w-3 mr-1" />
                            添加
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      {searchTerm ? (
                        <div>
                          <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                          <p className="text-sm">没有找到匹配的协作人员</p>
                        </div>
                      ) : (
                        <div>
                          <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                          <p className="text-sm">暂无可用协作人员</p>
                          <p className="text-xs text-gray-400 mt-1">所有协作人员都已是项目成员</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 下部分：当前项目成员列表 */}
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-900 mb-3">
                  当前项目成员 ({members.length})
                </h4>
                
                <div className="h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white group/scrollbar">
                  {loading && members.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader className="h-6 w-6 animate-spin text-gray-400 mr-2" />
                      <span className="text-gray-500">加载中...</span>
                    </div>
                  ) : members.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">暂无项目成员</p>
                    </div>
                  ) : (
                    members.map((member) => {
                      const roleInfo = roleConfig[member.role] || roleConfig.collaborator;
                      const RoleIcon = roleInfo.icon;
                      
                      return (
                        <div key={member.id} className="flex items-center justify-between p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                              {member.user?.username?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {member.user?.username || '未知用户'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {member.user?.email || '无邮箱信息'}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-3">
                            {/* 角色标签 */}
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${roleInfo.color}`}>
                              <RoleIcon className="h-3 w-3 mr-1" />
                              {roleInfo.label}
                            </span>
                            
                            {/* 移除按钮 */}
                            {member.role !== 'owner' && (
                              <button
                                onClick={() => handleRemoveMember(member.user_id)}
                                disabled={loading}
                                className="p-1 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                                title="移除成员"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectMemberModal;
