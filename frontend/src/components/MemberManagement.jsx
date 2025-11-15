import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Shield, 
  UserCheck, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Mail,
  Calendar,
  User
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { projectAPI, collaboratorAPI } from '../services/api';
import UserSearch from './UserSearch';

const MemberManagement = ({ projectId, onClose }) => {
  const { user, hasProjectPermission } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [editingMember, setEditingMember] = useState(null);

  // 项目角色选项
  const roleOptions = [
    {
      value: 'project_manager',
      label: '项目管理员',
      description: '可以管理阶段和任务',
      icon: Shield,
      color: 'text-blue-600 bg-blue-100'
    },
    {
      value: 'collaborator',
      label: '协作者',
      description: '可以操作任务',
      icon: UserCheck,
      color: 'text-green-600 bg-green-100'
    }
  ];

  // 获取项目成员
  const fetchMembers = async () => {
    try {
      setLoading(true);
      const response = await projectAPI.getProjectMembers(projectId);
      setMembers(response.members || []);
    } catch (err) {
      setError('获取成员列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchMembers();
    }
  }, [projectId]);

  // 添加成员
  const handleAddMember = async (user) => {
    try {
      const response = await projectAPI.addProjectMember(projectId, {
        user_id: user.id,
        role: 'collaborator' // 默认角色为协作者
      });
      
      if (response.member) {
        setMembers(prev => [...prev, response.member]);
        setShowAddMember(false);
      }
    } catch (err) {
      setError('添加成员失败');
    }
  };

  // 更新成员角色
  const handleUpdateRole = async (memberId, newRole) => {
    try {
      const response = await projectAPI.updateMemberRole(projectId, memberId, {
        role: newRole
      });
      
      if (response.member) {
        setMembers(prev => prev.map(member => 
          member.id === response.member.id ? response.member : member
        ));
        setEditingMember(null);
      }
    } catch (err) {
      setError('更新角色失败');
    }
  };

  // 移除成员
  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('确定要移除这个成员吗？')) {
      return;
    }

    try {
      await projectAPI.removeProjectMember(projectId, memberId);
      setMembers(prev => prev.filter(member => member.id !== memberId));
    } catch (err) {
      setError('移除成员失败');
    }
  };

  // 获取角色信息
  const getRoleInfo = (role) => {
    return roleOptions.find(option => option.value === role) || roleOptions[0];
  };

  // 格式化日期
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* 头部 */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mr-3">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">协作人员管理</h3>
              <p className="text-sm text-gray-500">{members.length} 位成员</p>
            </div>
          </div>
          
          {hasProjectPermission('invite_members', { user_role: 'project_owner' }) && (
            <button
              onClick={() => setShowAddMember(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              添加成员
            </button>
          )}
        </div>
      </div>

      {/* 内容 */}
      <div className="p-6">
        {/* 错误提示 */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* 添加成员搜索 */}
        {showAddMember && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-3">添加新成员</h4>
            <UserSearch
              onUserAdd={handleAddMember}
              selectedUsers={members}
              placeholder="搜索用户邮箱或用户名"
              showAddButton={true}
            />
            <button
              onClick={() => setShowAddMember(false)}
              className="mt-3 text-sm text-gray-500 hover:text-gray-700"
            >
              取消
            </button>
          </div>
        )}

        {/* 成员列表 */}
        {members.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暂无协作人员</p>
            {hasProjectPermission('invite_members', { user_role: 'project_owner' }) && (
              <button
                onClick={() => setShowAddMember(true)}
                className="mt-4 text-blue-600 hover:text-blue-700 text-sm"
              >
                添加第一个成员
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {members.map((member) => {
              const roleInfo = getRoleInfo(member.role);
              const IconComponent = roleInfo.icon;
              const isOwner = member.role === 'project_owner';
              const canManage = hasProjectPermission('manage_members', { user_role: 'project_owner' }) && !isOwner;

              return (
                <div key={member.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-medium text-gray-900">{member.user.username}</p>
                        {isOwner && (
                          <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                            项目所有者
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Mail className="h-3 w-3 mr-1" />
                          {member.user.email}
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDate(member.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {/* 角色信息 */}
                    <div className="flex items-center space-x-2">
                      <IconComponent className={`h-4 w-4 ${roleInfo.color}`} />
                      <span className="text-sm text-gray-700">{roleInfo.label}</span>
                    </div>

                    {/* 操作按钮 */}
                    {canManage && (
                      <div className="flex items-center space-x-1">
                        {/* 角色编辑 */}
                        <select
                          value={member.role}
                          onChange={(e) => handleUpdateRole(member.user.id, e.target.value)}
                          className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          disabled={isOwner}
                        >
                          {roleOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>

                        {/* 移除按钮 */}
                        <button
                          onClick={() => handleRemoveMember(member.user.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="移除成员"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 角色说明 */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">角色权限说明</h4>
          <div className="space-y-2">
            {roleOptions.map(option => {
              const IconComponent = option.icon;
              return (
                <div key={option.value} className="flex items-center space-x-2 text-sm">
                  <IconComponent className={`h-4 w-4 ${option.color}`} />
                  <span className="text-blue-800">
                    <strong>{option.label}:</strong> {option.description}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberManagement;
