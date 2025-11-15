import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, 
  Send, 
  Reply, 
  MoreVertical, 
  Edit, 
  Trash2,
  X,
  File,
  Image
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { taskAPI } from '../services/api';

const TaskComments = ({ taskId, projectId, stageId, onCommentUpdate }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const menuRefs = useRef({});

  // 获取评论列表
  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await taskAPI.getTaskComments(taskId);
      setComments(response.comments || []);
    } catch (err) {
      setError('获取评论失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (taskId) {
      fetchComments();
    }
  }, [taskId]);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event) => {
      // 检查点击是否在菜单外部
      let clickedOutside = true;
      Object.values(menuRefs.current).forEach(ref => {
        if (ref && ref.contains(event.target)) {
          clickedOutside = false;
        }
      });
      
      if (clickedOutside && activeMenu !== null) {
        setActiveMenu(null);
      }
    };

    if (activeMenu !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeMenu]);

  // 创建评论
  const handleCreateComment = async (e) => {
    e.preventDefault();
    
    if (!newComment.trim()) return;

    try {
      const response = await taskAPI.createTaskComment(taskId, {
        task_id: parseInt(taskId),
        content: newComment,
        reply_to_id: replyingTo?.id || null,
        parent_comment_id: replyingTo?.parent_comment_id || replyingTo?.id || null
      });
      
      if (response.comment) {
        // 如果是回复，需要将新评论添加到父评论的replies中
        if (replyingTo) {
          setComments(prev => prev.map(comment => {
            if (comment.id === replyingTo.id) {
              return {
                ...comment,
                replies: [...(comment.replies || []), response.comment]
              };
            }
            return comment;
          }));
        } else {
          // 如果是主评论，直接添加到列表
          setComments(prev => [...prev, response.comment]);
        }
        
        setNewComment('');
        setReplyingTo(null);
        onCommentUpdate && onCommentUpdate();
      }
    } catch (err) {
      setError('创建评论失败');
    }
  };

  const updateCommentTree = (commentList, updatedComment) => {
    return commentList.map(item => {
      if (item.id === updatedComment.id) {
        return {
          ...updatedComment,
          replies: updatedComment.replies || item.replies || []
        };
      }

      if (item.replies && item.replies.length > 0) {
        return {
          ...item,
          replies: updateCommentTree(item.replies, updatedComment)
        };
      }

      return item;
    });
  };

  const removeCommentFromTree = (commentList, targetId) => {
    return commentList
      .filter(item => item.id !== targetId)
      .map(item => ({
        ...item,
        replies: item.replies && item.replies.length > 0
          ? removeCommentFromTree(item.replies, targetId)
          : item.replies
      }));
  };

  // 更新评论
  const handleUpdateComment = async (commentId, content) => {
    if (!content || !content.trim()) {
      return;
    }

    const trimmed = content.trim();

    try {
      const response = await taskAPI.updateTaskComment(commentId, { content: trimmed });
      
      if (response.comment) {
        setComments(prev => updateCommentTree(prev, response.comment));
        setEditingComment(null);
        setEditingContent('');
      }
    } catch (err) {
      setError('更新评论失败');
    }
  };

  // 删除评论
  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('确定要删除这条评论吗？')) {
      return;
    }

    try {
      setActiveMenu(null);
      await taskAPI.deleteComment(commentId);
      setComments(prev => removeCommentFromTree(prev, commentId));
      onCommentUpdate && onCommentUpdate();
    } catch (err) {
      setError('删除评论失败');
    }
  };

  // 格式化日期
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 渲染评论
  const renderComment = (comment, level = 0) => {
    const isOwner = comment.user_id === user?.id;
    const canEdit = isOwner;
    const canDelete = isOwner;
    const isReply = level > 0;

    return (
      <div key={comment.id} className={`${isReply ? 'ml-6 mt-2' : 'mt-3'}`}>
        <div className={`${isReply ? 'bg-gray-50 rounded-lg p-3' : 'bg-white border border-gray-200 rounded-lg p-4'}`}>
          {/* 评论头部 - 垂直布局 */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start space-x-3">
              <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-medium text-blue-600">
                  {comment.user.username.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <p className="text-sm font-medium text-gray-900">{comment.user.username}</p>
                  {isReply && (
                    <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">回复</span>
                  )}
                </div>
                <p className="text-xs text-gray-500">{formatDate(comment.created_at)}</p>
              </div>
            </div>

            {/* 操作按钮 */}
            {(canEdit || canDelete) && (
              <div 
                className="relative"
                ref={(el) => {
                  if (el) {
                    menuRefs.current[comment.id] = el;
                  } else {
                    delete menuRefs.current[comment.id];
                  }
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenu(activeMenu === comment.id ? null : comment.id);
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  type="button"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>

                {activeMenu === comment.id && (
                  <div 
                    className="absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="py-1">
                      {canEdit && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenu(null);
                            setEditingComment(comment);
                            setEditingContent(comment.content || '');
                          }}
                          className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                          type="button"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          编辑
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteComment(comment.id);
                          }}
                          className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          type="button"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          删除
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 评论内容 / 编辑 */}
          {editingComment?.id === comment.id ? (
            <div className="mb-3 space-y-3">
              <textarea
                value={editingContent}
                onChange={(e) => setEditingContent(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <div className="flex items-center justify-end space-x-2">
                <button
                  onClick={() => {
                    setEditingComment(null);
                    setEditingContent('');
                  }}
                  className="px-3 py-1 text-sm text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={() => handleUpdateComment(comment.id, editingContent.trim())}
                  disabled={!editingContent.trim()}
                  className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  保存
                </button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed mb-3">
              {comment.content}
            </div>
          )}

          {/* 媒体附件 */}
          {comment.media_id && (
            <div className="mb-3 p-2 bg-gray-100 rounded-lg">
              <div className="flex items-center space-x-2">
                {comment.media_type === 'image' ? (
                  <Image className="h-4 w-4 text-gray-500" />
                ) : (
                  <File className="h-4 w-4 text-gray-500" />
                )}
                <span className="text-sm text-gray-600">{comment.media_name}</span>
              </div>
            </div>
          )}

          {/* 回复按钮 - 只显示在主评论上 */}
          {!isReply && (
            <div className="flex items-center">
              <button
                onClick={() => setReplyingTo(comment)}
                className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
              >
                回复
              </button>
            </div>
          )}

          {/* 回复列表 */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 space-y-2">
              {comment.replies.map(reply => renderComment(reply, level + 1))}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 错误提示 */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4">
          {error}
        </div>
      )}

      {/* 评论列表 - 可滚动区域 */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-2 group/scrollbar">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>暂无评论</p>
          </div>
        ) : (
          comments.map(comment => renderComment(comment))
        )}
      </div>

      {/* 创建评论表单 - 固定底部 */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200 p-4 mt-4">
        <form onSubmit={handleCreateComment} className="space-y-3">
          {/* 回复提示 */}
          {replyingTo && (
            <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Reply className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-700">
                  回复 {replyingTo.user.username}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="text-blue-600 hover:text-blue-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* 评论输入 */}
          <div>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={replyingTo ? `回复 ${replyingTo.user.username}...` : '添加评论...'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              required
            />
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center justify-end space-x-2">
            {replyingTo && (
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="px-3 py-1 text-sm text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50"
              >
                取消
              </button>
            )}
            <button
              type="submit"
              disabled={!newComment.trim()}
              className="flex items-center px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4 mr-1" />
              发送
            </button>
          </div>
        </form>
      </div>

    </div>
  );
};

export default TaskComments;