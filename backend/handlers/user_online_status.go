package handlers

import (
	"fmt"
	"project-manager-backend/database"
	"project-manager-backend/models"
	"project-manager-backend/utils"
	"time"

	"github.com/gin-gonic/gin"
)

// UserOnlineStatusHandler 用户在线状态处理器
type UserOnlineStatusHandler struct{}

// UpdateUserOnlineStatusRequest 更新用户在线状态请求
type UpdateUserOnlineStatusRequest struct {
	IsOnline  bool   `json:"is_online" binding:"required"`
	ProjectID uint   `json:"project_id" binding:"required"`
	UserAgent string `json:"user_agent"`
	IPAddress string `json:"ip_address"`
}

// GetOnlineUsersRequest 获取在线用户请求
type GetOnlineUsersRequest struct {
	ProjectID *uint `json:"project_id"` // 可选，指定项目ID
}

// UpdateUserOnlineStatus 更新用户在线状态
func (h *UserOnlineStatusHandler) UpdateUserOnlineStatus(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req UpdateUserOnlineStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "Invalid request data: "+err.Error())
		return
	}

	// 生成连接ID
	connectionID := fmt.Sprintf("%d_%d_%d", userID, req.ProjectID, time.Now().Unix())

	// 查找或创建用户在线状态记录
	var userStatus models.UserOnlineStatus
	err := database.DB.Where("user_id = ? AND project_id = ?", userID, req.ProjectID).First(&userStatus).Error

	now := time.Now()
	if err != nil {
		// 创建新记录
		userStatus = models.UserOnlineStatus{
			UserID:        userID,
			ProjectID:     req.ProjectID,
			ConnectionID:  connectionID,
			IsOnline:      req.IsOnline,
			LastHeartbeat: now,
			LastActivity:  now,
			UserAgent:     req.UserAgent,
			IPAddress:     req.IPAddress,
		}
		if err := database.DB.Create(&userStatus).Error; err != nil {
			utils.InternalServerError(c, "Failed to create user online status")
			return
		}
	} else {
		// 更新现有记录
		userStatus.ConnectionID = connectionID
		userStatus.IsOnline = req.IsOnline
		userStatus.LastHeartbeat = now
		userStatus.LastActivity = now
		userStatus.UserAgent = req.UserAgent
		userStatus.IPAddress = req.IPAddress
		if err := database.DB.Save(&userStatus).Error; err != nil {
			utils.InternalServerError(c, "Failed to update user online status")
			return
		}
	}

	utils.Success(c, gin.H{
		"message": "User online status updated successfully",
		"status":  userStatus,
	})
}

// GetOnlineUsers 获取在线用户列表
func (h *UserOnlineStatusHandler) GetOnlineUsers(c *gin.Context) {
	var req GetOnlineUsersRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "Invalid request data: "+err.Error())
		return
	}

	var onlineUsers []models.UserOnlineStatus
	query := database.DB.Preload("User").Where("is_online = ?", true)

	// 如果指定了项目ID，只返回该项目中的在线用户
	if req.ProjectID != nil {
		query = query.Where("project_id = ?", *req.ProjectID)
	}

	// 只返回最近5分钟内有活动的用户
	fiveMinutesAgo := time.Now().Add(-5 * time.Minute)
	query = query.Where("last_activity > ?", fiveMinutesAgo)

	if err := query.Order("last_activity DESC").Find(&onlineUsers).Error; err != nil {
		utils.InternalServerError(c, "Failed to fetch online users")
		return
	}

	utils.Success(c, onlineUsers)
}

// GetUserOnlineStatus 获取特定用户的在线状态
func (h *UserOnlineStatusHandler) GetUserOnlineStatus(c *gin.Context) {
	userID := c.GetUint("user_id")

	var userStatus models.UserOnlineStatus
	if err := database.DB.Where("user_id = ?", userID).Preload("User").First(&userStatus).Error; err != nil {
		utils.NotFound(c, "User online status not found")
		return
	}

	utils.Success(c, userStatus)
}

// SetUserOffline 设置用户为离线状态
func (h *UserOnlineStatusHandler) SetUserOffline(c *gin.Context) {
	userID := c.GetUint("user_id")

	// 获取项目ID参数
	projectIDStr := c.Query("project_id")
	if projectIDStr == "" {
		utils.BadRequest(c, "Project ID is required")
		return
	}

	// 更新所有该用户的在线状态为离线
	now := time.Now()
	result := database.DB.Model(&models.UserOnlineStatus{}).
		Where("user_id = ? AND project_id = ?", userID, projectIDStr).
		Updates(map[string]interface{}{
			"is_online":      false,
			"last_activity":  now,
			"last_heartbeat": now,
		})

	if result.Error != nil {
		utils.InternalServerError(c, "Failed to update user status to offline")
		return
	}

	utils.Success(c, gin.H{
		"message": "User set to offline successfully",
		"updated": result.RowsAffected,
	})
}

// CleanupOfflineUsers 清理离线用户记录（管理员功能）
func (h *UserOnlineStatusHandler) CleanupOfflineUsers(c *gin.Context) {
	userRole := c.GetString("user_role")

	// 检查权限（只有管理员可以清理）
	if userRole != "admin" {
		utils.Forbidden(c, "Insufficient permissions")
		return
	}

	// 删除超过24小时的离线记录
	twentyFourHoursAgo := time.Now().Add(-24 * time.Hour)
	result := database.DB.Where("is_online = ? AND last_activity < ?", false, twentyFourHoursAgo).Delete(&models.UserOnlineStatus{})

	if result.Error != nil {
		utils.InternalServerError(c, "Failed to cleanup offline users")
		return
	}

	utils.Success(c, gin.H{
		"message": "Offline users cleaned up successfully",
		"deleted": result.RowsAffected,
	})
}

// GetUserActivityStats 获取用户活动统计（管理员功能）
func (h *UserOnlineStatusHandler) GetUserActivityStats(c *gin.Context) {
	userRole := c.GetString("user_role")

	// 检查权限（只有管理员可以查看统计）
	if userRole != "admin" {
		utils.Forbidden(c, "Insufficient permissions")
		return
	}

	// 获取在线用户统计
	var stats struct {
		TotalUsers     int64 `json:"total_users"`
		OnlineUsers    int64 `json:"online_users"`
		OfflineUsers   int64 `json:"offline_users"`
		RecentActivity int64 `json:"recent_activity"` // 最近1小时有活动的用户
	}

	// 统计总数
	database.DB.Model(&models.UserOnlineStatus{}).Count(&stats.TotalUsers)

	// 统计在线和离线用户数
	database.DB.Model(&models.UserOnlineStatus{}).Where("is_online = ?", true).Count(&stats.OnlineUsers)
	database.DB.Model(&models.UserOnlineStatus{}).Where("is_online = ?", false).Count(&stats.OfflineUsers)

	// 统计最近1小时有活动的用户
	oneHourAgo := time.Now().Add(-1 * time.Hour)
	database.DB.Model(&models.UserOnlineStatus{}).Where("last_activity > ?", oneHourAgo).Count(&stats.RecentActivity)

	utils.Success(c, stats)
}
