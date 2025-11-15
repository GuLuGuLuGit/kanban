import React, { useState, useRef, useEffect } from 'react';
import { Image, Video, Play, Pause, Maximize2, Download, X, MessageCircle } from 'lucide-react';

const MediaDisplay = ({ 
  media, 
  className = '', 
  showInfo = true, 
  previewMode = 'thumbnail',
  onComment,
  showCommentButton = true,
  commentCount = 0
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const videoRef = useRef(null);

  if (!media) return null;

  // 生成视频缩略图
  useEffect(() => {
    if (media.type === 'video' && media.url && !thumbnailUrl) {
      const video = document.createElement('video');
      video.src = media.url;
      video.currentTime = 1; // 设置到第1秒
      video.addEventListener('loadeddata', () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        setThumbnailUrl(canvas.toDataURL('image/jpeg', 0.8));
      });
    }
  }, [media.url, media.type, thumbnailUrl]);

  const handleVideoPlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleFullscreen = () => {
    setShowFullscreen(true);
  };

  const closeFullscreen = () => {
    setShowFullscreen(false);
  };

  const handleComment = (e) => {
    e.stopPropagation();
    if (onComment) {
      onComment(media);
    }
  };

  const renderThumbnail = () => {
    if (media.type === 'image') {
      return (
        <div className="relative group cursor-pointer" onClick={handleFullscreen}>
          <img
            src={media.url}
            alt={media.name || '图片'}
            className="w-full h-full object-cover rounded transition-all duration-200 hover:scale-105 hover:shadow-lg"
          />
          
          {/* 悬停遮罩和操作按钮 */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded flex items-center justify-center opacity-0 group-hover:opacity-100">
            <div className="bg-white bg-opacity-90 rounded-full p-2 shadow-lg">
              <Maximize2 className="h-5 w-5 text-gray-700" />
            </div>
          </div>

          {/* 评论按钮 */}
          {showCommentButton && onComment && (
            <button
              onClick={handleComment}
              className="absolute top-2 left-2 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-700 rounded-full p-2 shadow-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
              title="添加评论"
            >
              <MessageCircle className="h-4 w-4" />
              {commentCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {commentCount}
                </span>
              )}
            </button>
          )}
        </div>
      );
    }

    if (media.type === 'video') {
      return (
        <div className="relative group cursor-pointer" onClick={handleFullscreen}>
          {/* 视频缩略图 */}
          <div className="w-full h-full rounded overflow-hidden bg-gray-200">
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt={media.name || '视频缩略图'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Video className="h-8 w-8 text-gray-400" />
              </div>
            )}
            
            {/* 播放按钮覆盖层 */}
            <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
              <div className="bg-white bg-opacity-90 rounded-full p-3 shadow-lg">
                <Play className="h-6 w-6 text-gray-700" />
              </div>
            </div>
          </div>
          
          {/* 悬停遮罩 */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded opacity-0 group-hover:opacity-100" />

          {/* 评论按钮 */}
          {showCommentButton && onComment && (
            <button
              onClick={handleComment}
              className="absolute top-2 left-2 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-700 rounded-full p-2 shadow-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
              title="添加评论"
            >
              <MessageCircle className="h-4 w-4" />
              {commentCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {commentCount}
                </span>
              )}
            </button>
          )}
        </div>
      );
    }

    return null;
  };

  const renderPreview = () => {
    if (media.type === 'image') {
      return (
        <img
          src={media.url}
          alt={media.name || '图片'}
          className="max-w-full max-h-[90vh] object-contain rounded shadow-2xl"
        />
      );
    }

    if (media.type === 'video') {
      return (
        <video
          ref={videoRef}
          src={media.url}
          className="max-w-full max-h-[90vh] rounded shadow-2xl"
          controls
          autoPlay
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      );
    }

    return null;
  };

  return (
    <>
      <div className={`relative ${className}`}>
        {renderThumbnail()}
        
        {/* 文件信息 */}
        {showInfo && (
          <div className="mt-2 text-xs text-gray-500">
            <div className="flex items-center space-x-2">
              {media.type === 'image' ? (
                <Image className="h-3 w-3" />
              ) : (
                <Video className="h-3 w-3" />
              )}
              <span className="truncate">{media.name}</span>
              {commentCount > 0 && (
                <span className="text-blue-500 font-medium">({commentCount} 条评论)</span>
              )}
            </div>
            <p className="text-xs text-gray-400">
              {formatFileSize(media.size)}
            </p>
          </div>
        )}
      </div>

      {/* 全屏预览模态框 */}
      {showFullscreen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50"
          onClick={closeFullscreen}
        >
          <div className="relative max-w-5xl max-h-[95vh] mx-4">
            {/* 关闭按钮 */}
            <button
              onClick={closeFullscreen}
              className="absolute -top-16 right-0 text-white hover:text-gray-300 transition-colors z-10"
            >
              <X className="h-8 w-8" />
            </button>

            {/* 媒体内容 */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              {renderPreview()}
            </div>

            {/* 文件信息 */}
            <div className="mt-6 text-center text-white">
              <p className="font-medium text-lg">{media.name}</p>
              <p className="text-sm text-gray-300 mt-1">
                {media.type === 'image' ? '图片' : '视频'} • {formatFileSize(media.size)}
                {commentCount > 0 && (
                  <span className="ml-2 text-blue-300">• {commentCount} 条评论</span>
                )}
              </p>
            </div>

            {/* 操作按钮 */}
            <div className="mt-4 flex justify-center space-x-4">
              {showCommentButton && onComment && (
                <button
                  onClick={() => {
                    closeFullscreen();
                    onComment(media);
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-all"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>添加评论</span>
                </button>
              )}
              <button
                onClick={() => window.open(media.url, '_blank')}
                className="flex items-center space-x-2 px-4 py-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-all"
              >
                <Download className="h-4 w-4" />
                <span>下载</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default MediaDisplay;
