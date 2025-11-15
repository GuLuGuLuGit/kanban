import React, { useState, useEffect, useRef } from 'react';
import { Search, User, Mail, X, Plus, UserPlus } from 'lucide-react';
import { userAPI, collaboratorAPI } from '../services/api';

const UserSearch = ({ 
  onUserSelect, 
  onUserAdd, 
  selectedUsers = [], 
  placeholder = "搜索用户（精确匹配邮箱或用户名）",
  showAddButton = true,
  maxResults = 10
}) => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState(null);
  
  const searchRef = useRef(null);
  const resultsRef = useRef(null);

  // 防抖搜索（精确匹配）
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim().length >= 2) {
        performSearch(query.trim());
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  // 点击外部关闭搜索结果
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const performSearch = async (searchQuery) => {
    setLoading(true);
    setError(null);
    
    try {
      // 精确匹配搜索：只匹配完整的邮箱或用户名
      const response = await userAPI.searchUsers({ query: searchQuery });
      setSearchResults(response.users || []);
      setShowResults(true);
    } catch (err) {
      setError('搜索失败，请重试');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  // 获取所有可用协作人员（当用户点击搜索框时）
  const loadAvailableCollaborators = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await collaboratorAPI.getAvailableCollaborators();
      console.log('加载可用协作人员:', response);
      setSearchResults(response.users || []);
      setShowResults(true);
    } catch (err) {
      console.error('获取可用协作人员失败:', err);
      setError('获取用户列表失败');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (user) => {
    if (onUserSelect) {
      onUserSelect(user);
    }
    setQuery('');
    setShowResults(false);
  };

  const handleUserAdd = (user) => {
    if (onUserAdd) {
      onUserAdd(user);
    }
    setQuery('');
    setShowResults(false);
  };

  const isUserSelected = (userId) => {
    return selectedUsers.some(user => user.id === userId);
  };

  const isUserAdded = (userId) => {
    return selectedUsers.some(user => user.id === userId);
  };

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    if (e.target.value.trim().length >= 2) {
      setShowResults(true);
    }
  };

  const handleInputFocus = () => {
    if (searchResults.length > 0) {
      setShowResults(true);
    } else if (query.trim().length === 0) {
      // 如果没有搜索内容，显示所有可用协作人员
      loadAvailableCollaborators();
    }
  };

  const clearSearch = () => {
    setQuery('');
    setSearchResults([]);
    setShowResults(false);
    setError(null);
  };

  return (
    <div className="relative" ref={searchRef}>
      {/* 搜索输入框 */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {/* 搜索结果 */}
      {showResults && (
        <div 
          ref={resultsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto group/scrollbar"
        >
          {loading ? (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2">搜索中...</p>
            </div>
          ) : error ? (
            <div className="p-4 text-center text-red-500">
              <p>{error}</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <p>未找到精确匹配的用户</p>
              <p className="text-xs mt-1">请输入完整的邮箱或用户名</p>
            </div>
          ) : (
            <div className="py-1">
              {searchResults.slice(0, maxResults).map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{user.username}</p>
                      <p className="text-xs text-gray-500 flex items-center">
                        <Mail className="h-3 w-3 mr-1" />
                        {user.email}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {isUserAdded(user.id) ? (
                      <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                        已添加
                      </span>
                    ) : (
                      <div className="flex space-x-1">
                        {onUserSelect && (
                          <button
                            onClick={() => handleUserSelect(user)}
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                            title="选择用户"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        )}
                        {showAddButton && onUserAdd && (
                          <button
                            onClick={() => handleUserAdd(user)}
                            className="p-1 text-green-600 hover:bg-green-100 rounded"
                            title="添加用户"
                          >
                            <UserPlus className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserSearch;
