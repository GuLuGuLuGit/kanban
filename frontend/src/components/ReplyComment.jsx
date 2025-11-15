import React from 'react';
import { Reply, User } from 'lucide-react';

const ReplyComment = ({ replyTo, onViewOriginal }) => {
  if (!replyTo) return null;

  return (
    <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer" onClick={onViewOriginal}>
      <div className="flex items-start space-x-2">
        <div className="flex-shrink-0 mt-0.5">
          <Reply className="h-3 w-3 text-blue-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-blue-700 font-medium text-sm">
              回复 @{replyTo.user?.username}
            </span>
            <span className="text-blue-500 text-xs">•</span>
            <span className="text-blue-600 text-xs">
              {replyTo.created_at && formatTime(replyTo.created_at)}
            </span>
          </div>
          
          {/* 被回复的评论内容 */}
          <div className="bg-white bg-opacity-60 rounded p-2 border border-blue-100">
            {replyTo.content ? (
              <p className="text-blue-800 text-sm leading-relaxed">
                {replyTo.content.length > 80 
                  ? replyTo.content.substring(0, 80) + '...' 
                  : replyTo.content}
              </p>
            ) : (
              <p className="text-blue-600 text-sm italic">媒体评论</p>
            )}
            
            {/* 如果有媒体文件，显示缩略图 */}
            {replyTo.media && replyTo.media.length > 0 && (
              <div className="mt-2 flex space-x-2">
                {replyTo.media.slice(0, 2).map((media, index) => (
                  <div key={index} className="w-8 h-8 rounded border border-blue-200 overflow-hidden bg-white">
                    {media.type === 'image' ? (
                      <img
                        src={media.url}
                        alt={media.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-blue-100 flex items-center justify-center">
                        <video className="h-4 w-4 text-blue-400" />
                      </div>
                    )}
                  </div>
                ))}
                {replyTo.media.length > 2 && (
                  <div className="w-8 h-8 rounded border border-blue-200 bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 text-xs font-medium">+{replyTo.media.length - 2}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="mt-2 text-xs text-blue-500">
            点击查看原评论
          </div>
        </div>
      </div>
    </div>
  );
};

// 格式化时间
const formatTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  if (diff < 2592000000) return `${Math.floor(diff / 86400000)}天前`;
  
  return date.toLocaleDateString('zh-CN');
};

export default ReplyComment;
