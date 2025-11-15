package handlers

import (
	"project-manager-backend/services"
	"project-manager-backend/utils"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// TaskActivityHandler 任务活动记录处理器
type TaskActivityHandler struct {
	ActivityService *services.TaskActivityService
}

// NewTaskActivityHandler 创建任务活动记录处理器
func NewTaskActivityHandler() *TaskActivityHandler {
	return &TaskActivityHandler{
		ActivityService: services.NewTaskActivityService(),
	}
}

// GetTaskActivities 获取任务活动记录
func (h *TaskActivityHandler) GetTaskActivities(c *gin.Context) {
	userRole := c.MustGet("user_role").(string)

	// 获取任务ID
	taskIDStr := c.Param("taskId")
	taskID, err := strconv.ParseUint(taskIDStr, 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid task ID")
		return
	}

	// 检查用户权限（这里需要验证用户是否有权限查看该任务的活动记录）
	// 可以通过检查用户是否是项目成员来实现
	if userRole != "admin" {
		// 这里应该添加权限检查逻辑
		// 暂时跳过，实际使用时需要实现
	}

	// 获取分页参数
	limitStr := c.DefaultQuery("limit", "20")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100 // 限制最大数量
	}

	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0
	}

	// 获取活动记录
	activities, err := h.ActivityService.GetTaskActivities(uint(taskID), limit, offset)
	if err != nil {
		utils.InternalServerErrorSafe(c, "获取任务活动记录失败", err)
		return
	}

	utils.Success(c, gin.H{
		"task_id":    taskID,
		"activities": activities,
		"total":      len(activities),
		"limit":      limit,
		"offset":     offset,
	})
}

// GetProjectActivities 获取项目活动记录
func (h *TaskActivityHandler) GetProjectActivities(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	userRole := c.MustGet("user_role").(string)

	// 获取项目ID
	projectIDStr := c.Param("projectId")
	projectID, err := strconv.ParseUint(projectIDStr, 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid project ID")
		return
	}

	// 检查用户权限
	if userRole != "admin" {
		// 这里应该添加权限检查逻辑
		// 暂时跳过，实际使用时需要实现
		_ = userID
	}

	// 获取分页参数
	limitStr := c.DefaultQuery("limit", "50")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 50
	}
	if limit > 200 {
		limit = 200 // 限制最大数量
	}

	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0
	}

	// 获取活动记录
	activities, err := h.ActivityService.GetProjectActivities(uint(projectID), limit, offset)
	if err != nil {
		utils.InternalServerErrorSafe(c, "获取项目活动记录失败", err)
		return
	}

	utils.Success(c, gin.H{
		"project_id": projectID,
		"activities": activities,
		"total":      len(activities),
		"limit":      limit,
		"offset":     offset,
	})
}

// GetUserActivities 获取用户活动记录
func (h *TaskActivityHandler) GetUserActivities(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	userRole := c.MustGet("user_role").(string)

	// 获取目标用户ID（可选，默认为当前用户）
	targetUserIDStr := c.Param("userId")
	var targetUserID uint
	if targetUserIDStr != "" {
		var err error
		parsedID, err := strconv.ParseUint(targetUserIDStr, 10, 32)
		if err != nil {
			utils.BadRequest(c, "Invalid user ID")
			return
		}
		targetUserID = uint(parsedID)
	} else {
		targetUserID = userID
	}

	// 检查权限：只有管理员或用户本人可以查看活动记录
	if userRole != "admin" && userID != targetUserID {
		utils.Forbidden(c, "Insufficient permissions to view user activities")
		return
	}

	// 获取分页参数
	limitStr := c.DefaultQuery("limit", "30")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 30
	}
	if limit > 100 {
		limit = 100 // 限制最大数量
	}

	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0
	}

	// 获取活动记录
	activities, err := h.ActivityService.GetUserActivities(targetUserID, limit, offset)
	if err != nil {
		utils.InternalServerErrorSafe(c, "获取用户活动记录失败", err)
		return
	}

	utils.Success(c, gin.H{
		"user_id":    targetUserID,
		"activities": activities,
		"total":      len(activities),
		"limit":      limit,
		"offset":     offset,
	})
}

// GetActivityStats 获取活动统计
func (h *TaskActivityHandler) GetActivityStats(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	userRole := c.MustGet("user_role").(string)

	// 获取项目ID
	projectIDStr := c.Param("projectId")
	projectID, err := strconv.ParseUint(projectIDStr, 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid project ID")
		return
	}

	// 检查用户权限
	if userRole != "admin" {
		// 这里应该添加权限检查逻辑
		// 暂时跳过，实际使用时需要实现
		_ = userID
	}

	// 获取时间范围参数
	startDateStr := c.DefaultQuery("start_date", "")
	endDateStr := c.DefaultQuery("end_date", "")

	var startDate, endDate time.Time
	if startDateStr != "" {
		startDate, err = time.Parse("2006-01-02", startDateStr)
		if err != nil {
			utils.BadRequest(c, "Invalid start date format")
			return
		}
	} else {
		// 默认查询最近30天
		startDate = time.Now().AddDate(0, 0, -30)
	}

	if endDateStr != "" {
		endDate, err = time.Parse("2006-01-02", endDateStr)
		if err != nil {
			utils.BadRequest(c, "Invalid end date format")
			return
		}
	} else {
		endDate = time.Now()
	}

	// 获取统计信息
	stats, err := h.ActivityService.GetActivityStats(uint(projectID), startDate, endDate)
	if err != nil {
		utils.InternalServerErrorSafe(c, "获取活动统计失败", err)
		return
	}

	utils.Success(c, gin.H{
		"project_id": projectID,
		"start_date": startDate.Format("2006-01-02"),
		"end_date":   endDate.Format("2006-01-02"),
		"stats":      stats,
	})
}
