import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { userAPI, collaboratorAPI } from '../services/api';
import { 
  Users, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Shield, 
  User, 
  Crown,
  Mail,
  Calendar,
  MoreVertical,
  Filter,
  AlertCircle,
  UserPlus,
  X,
  Loader
} from 'lucide-react';
import EditUserModal from '../components/EditUserModal';

const UserManagement = () => {
  const { user: currentUser, hasPermission } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [collaborators, setCollaborators] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [collaboratorSearchTerm, setCollaboratorSearchTerm] = useState('');
  const [filteredCollaborators, setFilteredCollaborators] = useState([]);
  const [showSearchModal, setShowSearchModal] = useState(false);

  // 检查权限 - 所有用户都可以访问人员管理（用于搜索和添加协作人员）
  // 根据新的简化权限模型，普通用户也可以管理协作人员

  // 获取用户列表和协作人员列表
  useEffect(() => {
    fetchUsers();
    fetchMyCollaborators();
  }, []);

  // 过滤协作人员
  useEffect(() => {
    if (collaboratorSearchTerm.trim()) {
      const filtered = collaborators.filter(collaborator => 
        collaborator.username.toLowerCase().includes(collaboratorSearchTerm.toLowerCase()) ||
        collaborator.email.toLowerCase().includes(collaboratorSearchTerm.toLowerCase())
      );
      setFilteredCollaborators(filtered);
    } else {
      setFilteredCollaborators(collaborators);
    }
  }, [collaboratorSearchTerm, collaborators]);

  // 防抖搜索用户（精确匹配）
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim().length >= 2) {
        searchUsers(searchTerm.trim());
        setShowSearchResults(true);
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // 搜索用户（精确匹配邮箱或用户名）
  const searchUsers = async (query) => {
    try {
      setSearchLoading(true);
      const results = await userAPI.searchUsers({ query });
      console.log('搜索结果:', results);
      // 确保 searchResults 始终是数组
      const users = Array.isArray(results) ? results : (results.users || []);
      setSearchResults(users);
    } catch (error) {
      console.error('搜索用户失败:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // 获取我的协作人员列表
  const fetchMyCollaborators = async () => {
    try {
      const response = await collaboratorAPI.getMyCollaborators();
      console.log('获取我的协作人员:', response);
      setCollaborators(response.collaborators || []);
    } catch (error) {
      console.error('获取协作人员列表失败:', error);
    }
  };

  // 添加协作人员
  const addCollaborator = async (user) => {
    if (collaborators.find(c => c.id === user.id)) {
      return; // 已经存在，不重复添加
    }

    try {
      await collaboratorAPI.addCollaborator(user.id);
      setCollaborators(prev => [...prev, user]);
      console.log('成功添加协作人员:', user.username);
    } catch (error) {
      console.error('添加协作人员失败:', error);
      alert('添加协作人员失败，请稍后重试');
    }
  };

  // 移除协作人员
  const removeCollaborator = async (userId) => {
    try {
      // 先尝试正常删除
      await collaboratorAPI.removeCollaborator(userId);
      setCollaborators(prev => prev.filter(c => c.id !== userId));
      console.log('成功移除协作人员');
    } catch (error) {
      console.error('移除协作人员失败:', error);
      
      // 检查是否是需要确认删除的情况
      if (error.response?.data?.data?.requires_confirmation) {
        const memberships = error.response.data.data.memberships || [];
        const membershipText = memberships.map(m => `• ${m.project_name} (${m.role})`).join('\n');
        
        const confirmMessage = `该协作人员还是以下项目的成员：\n\n${membershipText}\n\n删除协作人员将同时移除其在这些项目中的成员身份。\n\n确定要继续删除吗？`;
        
        if (window.confirm(confirmMessage)) {
          try {
            // 用户确认后，强制删除（包含项目成员关系）
            await collaboratorAPI.forceRemoveCollaborator(userId);
            setCollaborators(prev => prev.filter(c => c.id !== userId));
            console.log('成功移除协作人员及其项目成员关系');
            alert('协作人员及其相关项目成员关系已删除');
          } catch (forceError) {
            console.error('强制删除协作人员失败:', forceError);
            alert('删除失败，请稍后重试');
          }
        }
      } else {
        alert('移除协作人员失败，请稍后重试');
      }
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      // 优先使用新的协作人员API获取可用用户列表
      const response = await collaboratorAPI.getAvailableCollaborators();
      console.log('获取到可用协作人员列表:', response);
      setUsers(response.users || []);
    } catch (error) {
      console.error('获取可用协作人员失败，尝试使用备选API:', error);
      // 如果新API失败，回退到旧API（仅管理员可用）
      try {
        const data = await userAPI.getUsers();
        setUsers(data || []);
      } catch (fallbackError) {
        console.error('获取用户列表失败:', fallbackError);
        setUsers([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // 处理用户更新
  const handleUserUpdated = (updatedUser) => {
    setUsers(prevUsers => 
      prevUsers.map(u => u.id === updatedUser.id ? updatedUser : u)
    );
    setShowEditModal(false);
    setEditingUser(null);
  };

  // 处理新用户创建
  const handleUserCreated = (result) => {
    // 后端返回的数据结构是 { message: "...", user: {...} }
    const newUser = result.user || result;
    setUsers(prevUsers => [newUser, ...prevUsers]);
    setShowEditModal(false);
    setEditingUser(null);
  };

  // 处理用户删除
  const handleDeleteUser = async (userId) => {
    if (!window.confirm('确定要删除这个用户吗？此操作不可撤销！')) {
      return;
    }

    try {
      await userAPI.deleteUser(userId);
      setUsers(users.filter(u => u.id !== userId));
    } catch (error) {
      console.error('删除用户失败:', error);
    }
  };

  // 处理编辑用户
  const handleEditUser = (user) => {
    setEditingUser(user);
    setShowEditModal(true);
  };

  // 新的界面设计不需要用户列表过滤，已删除相关逻辑

  // 获取角色显示信息
  const getRoleInfo = (role) => {
    switch (role) {
      case 'admin':
        return { label: '系统管理员', color: 'bg-red-100 text-red-800 border-red-200', icon: Shield };
      case 'user':
        return { label: '普通用户', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: User };
      default:
        return { label: '未知', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: User };
    }
  };

  // 清空搜索
  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  // 清空协作人员搜索
  const clearCollaboratorSearch = () => {
    setCollaboratorSearchTerm('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-6 pl-4 pr-4">


        {/* 我的协作人员区域 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-600" />
                  我的协作人员
                  <span className="text-sm font-normal text-gray-500">({collaborators.length})</span>
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  添加协作人员后，在创建项目时可以从协作人员中选择项目管理员和协作者
                </p>
              </div>
              
              {/* 操作按钮 */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowSearchModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  添加用户
                </button>
                <button
                  onClick={() => {
                    // 导入功能占位
                    alert('导入功能开发中...');
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <UserPlus className="h-4 w-4" />
                  导入
                </button>
              </div>
            </div>
            
            {/* 协作人员搜索框 */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={collaboratorSearchTerm}
                onChange={(e) => setCollaboratorSearchTerm(e.target.value)}
                placeholder="搜索协作人员（用户名或邮箱）..."
                className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
              />
              {collaboratorSearchTerm && (
                <button
                  onClick={clearCollaboratorSearch}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
          </div>
          
          <div className="overflow-x-auto">
            {filteredCollaborators.length === 0 ? (
              <div className="p-8 text-center">
                {collaboratorSearchTerm ? (
                  <>
                    <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500">没有找到匹配的协作人员</p>
                    <p className="text-sm text-gray-400 mt-1">搜索"{collaboratorSearchTerm}"无结果</p>
                  </>
                ) : (
                  <>
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500">还没有添加协作人员</p>
                    <p className="text-sm text-gray-400 mt-1">点击"添加用户"按钮来添加协作人员</p>
                  </>
                )}
              </div>
            ) : (
              <div className="min-w-full">
                {/* 表头 */}
                <div className="bg-gray-50 border-b border-gray-200">
                  <div className="grid grid-cols-12 gap-4 px-4 py-3 text-sm font-medium text-gray-700">
                    <div className="col-span-1">头像</div>
                    <div className="col-span-3">姓名</div>
                    <div className="col-span-4">邮箱</div>
                    <div className="col-span-2">状态</div>
                    <div className="col-span-2 text-center">操作</div>
                  </div>
                </div>
                
                {/* 表格内容 */}
                <div className="max-h-[60vh] overflow-y-auto group/scrollbar">
                  {filteredCollaborators.map((collaborator) => (
                    <div
                      key={collaborator.id}
                      className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      {/* 头像 */}
                      <div className="col-span-1 flex items-center">
                        <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                          {collaborator.username?.charAt(0).toUpperCase() || 'C'}
                        </div>
                      </div>
                      
                      {/* 姓名 */}
                      <div className="col-span-3 flex items-center">
                        <span className="font-medium text-gray-900 truncate">{collaborator.username}</span>
                      </div>
                      
                      {/* 邮箱 */}
                      <div className="col-span-4 flex items-center">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{collaborator.email}</span>
                        </div>
                      </div>
                      
                      {/* 状态 */}
                      <div className="col-span-2 flex items-center">
                        {getRoleInfo(collaborator.role).icon && (
                          <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getRoleInfo(collaborator.role).color}`}>
                            {getRoleInfo(collaborator.role).label}
                          </div>
                        )}
                      </div>
                      
                      {/* 操作 */}
                      <div className="col-span-2 flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            // 禁用功能占位
                            alert('禁用功能开发中...');
                          }}
                          className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          title="禁用用户"
                        >
                          <Shield className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            // 重置密码功能占位
                            alert('重置密码功能开发中...');
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="重置密码"
                        >
                          <User className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => removeCollaborator(collaborator.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="移除协作人员"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 编辑用户模态框 */}
      <EditUserModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingUser(null);
        }}
        user={editingUser}
        onSave={handleUserUpdated}
        onUserCreated={handleUserCreated}
      />

      {/* 搜索用户模态框 */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* 背景遮罩 */}
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowSearchModal(false)}
            ></div>

            {/* 模态框内容 */}
            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              {/* 模态框头部 */}
              <div className="bg-white px-6 py-4 border-b border-gray-200 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mr-3">
                      <Search className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">搜索用户</h3>
                      <p className="text-sm text-gray-500">搜索数据库中的用户并添加为协作人员</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowSearchModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* 模态框内容 */}
              <div className="px-6 py-4">
                {/* 搜索框 */}
                <div className="mb-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="输入完整邮箱地址或用户名搜索用户..."
                className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                        <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
          </div>
          
                {/* 搜索结果区域 */}
                <div className="min-h-[300px] max-h-[400px] overflow-y-auto group/scrollbar">
            {!searchTerm ? (
              /* 搜索提示 */
              <div className="text-center py-8 text-gray-500">
                <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-sm">输入邮箱地址搜索用户</p>
                      <p className="text-xs text-gray-400 mt-1">最少2个字符</p>
              </div>
            ) : searchLoading ? (
              /* 搜索加载状态 */
              <div className="text-center py-8">
                <Loader className="h-8 w-8 mx-auto mb-4 text-blue-600 animate-spin" />
                <p className="text-gray-500">正在搜索用户...</p>
                <p className="text-sm text-gray-400 mt-1">搜索"{searchTerm}"</p>
              </div>
            ) : searchResults.length === 0 ? (
              /* 无搜索结果 */
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">没有找到精确匹配的用户</p>
                <p className="text-xs text-gray-400 mt-1">请输入完整的邮箱地址或用户名</p>
              </div>
            ) : (
              /* 搜索结果列表 */
              <div>
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200">
                  <Search className="h-4 w-4 text-blue-600" />
                  <h4 className="font-medium text-gray-900">搜索结果</h4>
                  <span className="text-sm text-gray-500">({searchResults.length} 个用户)</span>
                </div>
                
                      <div className="space-y-2">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors border border-gray-100"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                          {user.username?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{user.username}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {getRoleInfo(user.role).icon && (
                          <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getRoleInfo(user.role).color}`}>
                            {getRoleInfo(user.role).label}
                          </div>
                        )}
                        
                        {collaborators.find(c => c.id === user.id) ? (
                          <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg font-medium">
                            已添加
                          </span>
                        ) : (
                          <button
                                  onClick={() => {
                                    addCollaborator(user);
                                    setShowSearchModal(false);
                                    clearSearch();
                                  }}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg font-medium transition-colors"
                          >
                            添加
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

              {/* 模态框底部 */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-2xl">
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setShowSearchModal(false);
                      clearSearch();
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    关闭
                      </button>
                    </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
