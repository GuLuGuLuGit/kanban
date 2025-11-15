package handlers

import (
	"log"
	"project-manager-backend/database"
	"project-manager-backend/models"
	"project-manager-backend/utils"
	"strconv"

	"github.com/gin-gonic/gin"
)

// CommentHandler 评论处理器
type CommentHandler struct{}

// CreateCommentRequest 创建评论请求
type CreateCommentRequest struct {
	TaskID          uint   `json:"task_id" binding:"required"`
	Content         string `json:"content" binding:"required"`
	MediaID         string `json:"media_id"`
	MediaType       string `json:"media_type"`
	MediaName       string `json:"media_name"`
	ReplyToID       *uint  `json:"reply_to_id"`
	ParentCommentID *uint  `json:"parent_comment_id"`
}

// UpdateCommentRequest 更新评论请求
type UpdateCommentRequest struct {
	Content string `json:"content" binding:"required"`
}

// GetTaskComments 获取任务评论
func (h *CommentHandler) GetTaskComments(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	taskID, err := strconv.ParseUint(c.Param("taskId"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid task ID")
		return
	}

	// 查找任务
	var task models.Task
	if err := database.DB.First(&task, taskID).Error; err != nil {
		utils.NotFound(c, "Task not found: "+err.Error())
		return
	}

	// 手动加载项目信息
	var project models.Project
	if err := database.DB.First(&project, task.ProjectID).Error; err == nil {
		task.Project = &project
	}

	// 单机版：检查用户是否是项目成员即可
	if !utils.CheckProjectMember(userID, task.ProjectID) && !utils.CheckProjectOwner(userID, task.ProjectID) {
		utils.Forbidden(c, "Access denied to this task")
		return
	}

	// 获取评论列表
	var comments []models.Comment
	if err := database.DB.Where("task_id = ? AND parent_comment_id IS NULL", taskID).
		Order("created_at ASC").
		Find(&comments).Error; err != nil {
		utils.InternalServerError(c, "Failed to fetch task comments: "+err.Error())
		return
	}

	// 手动加载用户信息
	for i := range comments {
		var user models.User
		if err := database.DB.First(&user, comments[i].UserID).Error; err == nil {
			comments[i].User = user
		}
	}

	// 构建评论树
	commentMap := make(map[uint]*models.Comment)
	var rootComments []*models.Comment

	for i := range comments {
		commentMap[comments[i].ID] = &comments[i]
		comments[i].Replies = []*models.Comment{}
		rootComments = append(rootComments, &comments[i])
	}

	// 获取所有回复
	var replies []models.Comment
	if err := database.DB.Where("task_id = ? AND parent_comment_id IS NOT NULL", taskID).
		Order("created_at ASC").
		Find(&replies).Error; err != nil {
		utils.InternalServerError(c, "Failed to fetch comment replies: "+err.Error())
		return
	}

	// 手动加载用户信息
	for i := range replies {
		var user models.User
		if err := database.DB.First(&user, replies[i].UserID).Error; err == nil {
			replies[i].User = user
		}
		// 加载回复目标用户信息
		if replies[i].ReplyToID != nil {
			var replyToComment models.Comment
			if err := database.DB.First(&replyToComment, *replies[i].ReplyToID).Error; err == nil {
				var replyToUser models.User
				if err := database.DB.First(&replyToUser, replyToComment.UserID).Error; err == nil {
					replyToComment.User = replyToUser
					replies[i].ReplyTo = &replyToComment
				}
			}
		}
	}

	// 构建回复关系
	for i := range replies {
		commentMap[replies[i].ID] = &replies[i]
		replies[i].Replies = []*models.Comment{}

		if replies[i].ParentCommentID != nil {
			if parent, exists := commentMap[*replies[i].ParentCommentID]; exists {
				parent.Replies = append(parent.Replies, &replies[i])
			}
		}
	}

	utils.Success(c, gin.H{
		"task_id":  taskID,
		"comments": rootComments,
		"total":    len(rootComments),
	})
}

// CreateComment 创建评论
func (h *CommentHandler) CreateComment(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)

	var req CreateCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "Invalid request data: "+err.Error())
		return
	}

	// 优先使用 URL 参数中的 taskId（如果存在）
	taskIDParam := c.Param("taskId")
	if taskIDParam != "" {
		if taskID, err := strconv.ParseUint(taskIDParam, 10, 32); err == nil {
			// 如果请求体中也有 task_id，验证它们是否一致
			if req.TaskID != 0 && req.TaskID != uint(taskID) {
				utils.BadRequest(c, "Task ID in URL and request body do not match")
				return
			}
			req.TaskID = uint(taskID)
		}
	}

	// 验证 taskID 是否存在
	if req.TaskID == 0 {
		utils.BadRequest(c, "Task ID is required")
		return
	}

	// 查找任务
	var task models.Task
	if err := database.DB.First(&task, req.TaskID).Error; err != nil {
		utils.NotFound(c, "Task not found: "+err.Error())
		return
	}

	// 手动加载项目信息
	var project models.Project
	if err := database.DB.First(&project, task.ProjectID).Error; err == nil {
		task.Project = &project
	}

	// 单机版：检查用户是否是项目成员即可
	if !utils.CanManageTasks(userID, task.ProjectID) {
		utils.Forbidden(c, "Insufficient permissions to create comment")
		return
	}

	// 如果是回复评论，检查父评论是否存在
	if req.ParentCommentID != nil {
		var parentComment models.Comment
		if err := database.DB.Where("id = ? AND task_id = ?", *req.ParentCommentID, req.TaskID).First(&parentComment).Error; err != nil {
			utils.NotFound(c, "Parent comment not found")
			return
		}
	}

	// 如果是回复特定用户，检查回复目标是否存在
	if req.ReplyToID != nil {
		var replyToComment models.Comment
		if err := database.DB.Where("id = ? AND task_id = ?", *req.ReplyToID, req.TaskID).First(&replyToComment).Error; err != nil {
			utils.NotFound(c, "Reply target comment not found")
			return
		}
	}

	// 创建评论
	comment := models.Comment{
		TaskID:          req.TaskID,
		UserID:          userID,
		Content:         req.Content,
		MediaID:         &req.MediaID,
		MediaType:       &req.MediaType,
		MediaName:       &req.MediaName,
		ReplyToID:       req.ReplyToID,
		ParentCommentID: req.ParentCommentID,
	}

	// 清空空字符串的媒体字段
	if req.MediaID == "" {
		comment.MediaID = nil
	}
	if req.MediaType == "" {
		comment.MediaType = nil
	}
	if req.MediaName == "" {
		comment.MediaName = nil
	}

	if err := database.DB.Create(&comment).Error; err != nil {
		log.Printf("创建评论失败: %v", err)
		utils.InternalServerError(c, "Failed to create comment: "+err.Error())
		return
	}

	// 验证评论ID是否被正确设置
	if comment.ID == 0 {
		utils.InternalServerError(c, "Failed to get comment ID after creation. Please check database table structure.")
		return
	}

	// 重新加载评论信息（手动加载关联数据）
	var user models.User
	if err := database.DB.First(&user, comment.UserID).Error; err == nil {
		comment.User = user
	}
	if comment.ReplyToID != nil {
		var replyToComment models.Comment
		if err := database.DB.First(&replyToComment, *comment.ReplyToID).Error; err == nil {
			var replyToUser models.User
			if err := database.DB.First(&replyToUser, replyToComment.UserID).Error; err == nil {
				replyToComment.User = replyToUser
				comment.ReplyTo = &replyToComment
			}
		}
	}

	// 重新加载任务信息（手动加载负责人）
	if err := database.DB.First(&task, req.TaskID).Error; err == nil {
		if task.AssigneeID != nil {
			var assignee models.User
			if err := database.DB.First(&assignee, *task.AssigneeID).Error; err == nil {
				task.Assignee = &assignee
			}
		}
	} else {
		log.Printf("⚠️ 重新加载任务信息失败: %v", err)
	}

	utils.Success(c, gin.H{
		"comment": comment,
		"message": "Comment created successfully",
	})
}

// UpdateComment 更新评论
func (h *CommentHandler) UpdateComment(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	commentID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid comment ID")
		return
	}

	// 查找评论
	var comment models.Comment
	if err := database.DB.First(&comment, commentID).Error; err != nil {
		utils.NotFound(c, "Comment not found: "+err.Error())
		return
	}

	// 手动加载任务和项目信息
	var task models.Task
	if err := database.DB.First(&task, comment.TaskID).Error; err == nil {
		comment.Task = task
		var project models.Project
		if err := database.DB.First(&project, task.ProjectID).Error; err == nil {
			task.Project = &project
			comment.Task = task
		}
	}

	// 检查用户是否有权限更新评论
	// 单机版：所有项目成员都可以编辑评论，或者评论作者可以编辑自己的评论
	if comment.UserID != userID && !utils.CheckProjectMember(userID, task.ProjectID) && !utils.CheckProjectOwner(userID, task.ProjectID) {
		utils.Forbidden(c, "Insufficient permissions to update comment")
		return
	}

	var req UpdateCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "Invalid request data: "+err.Error())
		return
	}

	// 更新评论内容
	if err := database.DB.Model(&comment).Update("content", req.Content).Error; err != nil {
		utils.InternalServerError(c, "Failed to update comment")
		return
	}

	// 重新加载评论信息
	if err := database.DB.Preload("User").Preload("ReplyTo.User").First(&comment, commentID).Error; err != nil {
		utils.InternalServerError(c, "Failed to reload comment data")
		return
	}

	utils.Success(c, gin.H{
		"comment": comment,
		"message": "Comment updated successfully",
	})
}

// DeleteComment 删除评论
func (h *CommentHandler) DeleteComment(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	commentID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid comment ID")
		return
	}

	// 查找评论
	var comment models.Comment
	if err := database.DB.First(&comment, commentID).Error; err != nil {
		utils.NotFound(c, "Comment not found: "+err.Error())
		return
	}

	// 手动加载任务和项目信息
	var task models.Task
	if err := database.DB.First(&task, comment.TaskID).Error; err == nil {
		comment.Task = task
		var project models.Project
		if err := database.DB.First(&project, task.ProjectID).Error; err == nil {
			task.Project = &project
			comment.Task = task
		}
	}

	// 单机版：所有项目成员都可以删除评论，或者评论作者可以删除自己的评论
	if comment.UserID != userID && !utils.CheckProjectMember(userID, task.ProjectID) && !utils.CheckProjectOwner(userID, task.ProjectID) {
		utils.Forbidden(c, "Insufficient permissions to delete comment")
		return
	}

	// 开始事务
	tx := database.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 删除评论及其所有回复
	if err := tx.Where("id = ? OR parent_comment_id = ?", commentID, commentID).Delete(&models.Comment{}).Error; err != nil {
		tx.Rollback()
		utils.InternalServerError(c, "Failed to delete comment")
		return
	}

	// 提交事务
	if err := tx.Commit().Error; err != nil {
		utils.InternalServerError(c, "Failed to commit transaction")
		return
	}

	utils.Success(c, gin.H{"message": "Comment deleted successfully"})
}

// DeleteTaskComment 删除任务评论（通过任务ID和评论ID）
func (h *CommentHandler) DeleteTaskComment(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	taskID, err := strconv.ParseUint(c.Param("taskId"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid task ID")
		return
	}

	commentID, err := strconv.ParseUint(c.Param("commentId"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid comment ID")
		return
	}

	// 查找评论
	var comment models.Comment
	if err := database.DB.Where("id = ? AND task_id = ?", commentID, taskID).First(&comment).Error; err != nil {
		utils.NotFound(c, "Comment not found")
		return
	}

	// 查找任务以获取项目ID
	var task models.Task
	if err := database.DB.First(&task, taskID).Error; err != nil {
		utils.NotFound(c, "Task not found")
		return
	}

	// 单机版：所有项目成员都可以删除评论，或者评论作者可以删除自己的评论
	if comment.UserID != userID && !utils.CheckProjectMember(userID, task.ProjectID) && !utils.CheckProjectOwner(userID, task.ProjectID) {
		utils.Forbidden(c, "Insufficient permissions to delete comment")
		return
	}

	// 开始事务
	tx := database.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 删除评论及其所有回复
	if err := tx.Where("id = ? OR parent_comment_id = ?", commentID, commentID).Delete(&models.Comment{}).Error; err != nil {
		tx.Rollback()
		utils.InternalServerError(c, "Failed to delete comment")
		return
	}

	// 提交事务
	if err := tx.Commit().Error; err != nil {
		utils.InternalServerError(c, "Failed to commit transaction")
		return
	}

	utils.Success(c, gin.H{"message": "Comment deleted successfully"})
}
