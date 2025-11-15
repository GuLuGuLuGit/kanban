package handlers

import (
	"project-manager-backend/database"
	"project-manager-backend/models"
	"project-manager-backend/utils"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// AnalyticsHandler 统计处理器
type AnalyticsHandler struct{}

// ProjectStats 项目统计
type ProjectStats struct {
	ProjectID       uint      `json:"project_id"`
	TotalTasks      int64     `json:"total_tasks"`
	CompletedTasks  int64     `json:"completed_tasks"`
	InProgressTasks int64     `json:"in_progress_tasks"`
	TodoTasks       int64     `json:"todo_tasks"`
	OverdueTasks    int64     `json:"overdue_tasks"`
	CompletionRate  float64   `json:"completion_rate"`
	TotalMembers    int64     `json:"total_members"`
	ActiveMembers   int64     `json:"active_members"`
	TotalComments   int64     `json:"total_comments"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// TaskStats 任务统计
type TaskStats struct {
	TotalTasks        int64   `json:"total_tasks"`
	CompletedTasks    int64   `json:"completed_tasks"`
	InProgressTasks   int64   `json:"in_progress_tasks"`
	TodoTasks         int64   `json:"todo_tasks"`
	OverdueTasks      int64   `json:"overdue_tasks"`
	CompletionRate    float64 `json:"completion_rate"`
	AvgCompletionTime float64 `json:"avg_completion_time"` // 平均完成时间（小时）
}

// UserStats 用户统计
type UserStats struct {
	TotalUsers  int64 `json:"total_users"`
	ActiveUsers int64 `json:"active_users"`
	NewUsers    int64 `json:"new_users"` // 本月新用户
	OnlineUsers int64 `json:"online_users"`
}

// StageStats 阶段统计
type StageStats struct {
	StageID        uint    `json:"stage_id"`
	StageName      string  `json:"stage_name"`
	TotalTasks     int64   `json:"total_tasks"`
	CompletedTasks int64   `json:"completed_tasks"`
	CompletionRate float64 `json:"completion_rate"`
	AvgTaskTime    float64 `json:"avg_task_time"` // 平均任务时间（小时）
}

// TimeSeriesData 时间序列数据
type TimeSeriesData struct {
	Date  string `json:"date"`
	Value int64  `json:"value"`
}

// GetProjectStats 获取项目统计
func (h *AnalyticsHandler) GetProjectStats(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	projectID, err := strconv.ParseUint(c.Param("projectId"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "无效的项目ID")
		return
	}

	// 单机版：检查用户是否是项目成员即可
	if !utils.CheckProjectMember(userID, uint(projectID)) && !utils.CheckProjectOwner(userID, uint(projectID)) {
		utils.Forbidden(c, "无权限访问该项目")
		return
	}

	// 获取项目基本信息
	var project models.Project
	if err := database.DB.Where("id = ?", projectID).First(&project).Error; err != nil {
		utils.NotFound(c, "项目不存在")
		return
	}

	// 获取任务统计
	var taskStats TaskStats
	if err := h.getTaskStats(uint(projectID), &taskStats); err != nil {
		utils.InternalServerError(c, "获取任务统计失败")
		return
	}

	// 获取成员统计
	var totalMembers, activeMembers int64
	if err := database.DB.Model(&models.ProjectMember{}).Where("project_id = ?", projectID).Count(&totalMembers).Error; err != nil {
		utils.InternalServerError(c, "获取成员统计失败")
		return
	}

	// 获取活跃成员（最近7天有活动的成员）
	sevenDaysAgo := time.Now().AddDate(0, 0, -7)
	if err := database.DB.Model(&models.ProjectMember{}).
		Joins("JOIN users ON project_members.user_id = users.id").
		Where("project_members.project_id = ? AND users.updated_at > ?", projectID, sevenDaysAgo).
		Count(&activeMembers).Error; err != nil {
		utils.InternalServerError(c, "获取活跃成员统计失败")
		return
	}

	// 获取评论统计
	var totalComments int64
	if err := database.DB.Model(&models.Comment{}).
		Joins("JOIN tasks ON comments.task_id = tasks.id").
		Where("tasks.project_id = ?", projectID).
		Count(&totalComments).Error; err != nil {
		utils.InternalServerError(c, "获取评论统计失败")
		return
	}

	// 构建项目统计
	stats := ProjectStats{
		ProjectID:       uint(projectID),
		TotalTasks:      taskStats.TotalTasks,
		CompletedTasks:  taskStats.CompletedTasks,
		InProgressTasks: taskStats.InProgressTasks,
		TodoTasks:       taskStats.TodoTasks,
		OverdueTasks:    taskStats.OverdueTasks,
		CompletionRate:  taskStats.CompletionRate,
		TotalMembers:    totalMembers,
		ActiveMembers:   activeMembers,
		TotalComments:   totalComments,
		CreatedAt:       project.CreatedAt,
		UpdatedAt:       project.UpdatedAt,
	}

	utils.Success(c, stats)
}

// GetTaskStats 获取任务统计
func (h *AnalyticsHandler) GetTaskStats(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	projectID, err := strconv.ParseUint(c.Param("projectId"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "无效的项目ID")
		return
	}

	// 单机版：检查用户是否是项目成员即可
	if !utils.CheckProjectMember(userID, uint(projectID)) && !utils.CheckProjectOwner(userID, uint(projectID)) {
		utils.Forbidden(c, "无权限访问该项目")
		return
	}

	var taskStats TaskStats
	if err := h.getTaskStats(uint(projectID), &taskStats); err != nil {
		utils.InternalServerError(c, "获取任务统计失败")
		return
	}

	utils.Success(c, taskStats)
}

// GetStageStats 获取阶段统计
func (h *AnalyticsHandler) GetStageStats(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	projectID, err := strconv.ParseUint(c.Param("projectId"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "无效的项目ID")
		return
	}

	// 单机版：检查用户是否是项目成员即可
	if !utils.CheckProjectMember(userID, uint(projectID)) && !utils.CheckProjectOwner(userID, uint(projectID)) {
		utils.Forbidden(c, "无权限访问该项目")
		return
	}

	// 获取阶段列表
	var stages []models.Stage
	if err := database.DB.Where("project_id = ?", projectID).Find(&stages).Error; err != nil {
		utils.InternalServerError(c, "获取阶段列表失败")
		return
	}

	var stageStats []StageStats
	for _, stage := range stages {
		var totalTasks, completedTasks int64

		// 获取阶段任务总数
		if err := database.DB.Model(&models.Task{}).Where("stage_id = ?", stage.ID).Count(&totalTasks).Error; err != nil {
			continue
		}

		// 获取已完成任务数
		if err := database.DB.Model(&models.Task{}).Where("stage_id = ? AND status = ?", stage.ID, "done").Count(&completedTasks).Error; err != nil {
			continue
		}

		// 计算完成率
		var completionRate float64
		if totalTasks > 0 {
			completionRate = float64(completedTasks) / float64(totalTasks) * 100
		}

		// 计算平均任务时间
		var avgTaskTime float64
		if completedTasks > 0 {
			// 这里应该计算平均完成时间，暂时返回0
			avgTaskTime = 0
		}

		stageStats = append(stageStats, StageStats{
			StageID:        stage.ID,
			StageName:      stage.Name,
			TotalTasks:     totalTasks,
			CompletedTasks: completedTasks,
			CompletionRate: completionRate,
			AvgTaskTime:    avgTaskTime,
		})
	}

	utils.Success(c, stageStats)
}

// GetUserStats 获取用户统计
func (h *AnalyticsHandler) GetUserStats(c *gin.Context) {
	// 单机版：所有用户都可以查看用户统计

	var userStats UserStats

	// 获取总用户数
	if err := database.DB.Model(&models.User{}).Count(&userStats.TotalUsers).Error; err != nil {
		utils.InternalServerError(c, "获取总用户数失败")
		return
	}

	// 获取活跃用户数（最近30天有活动的用户）
	thirtyDaysAgo := time.Now().AddDate(0, 0, -30)
	if err := database.DB.Model(&models.User{}).Where("updated_at > ?", thirtyDaysAgo).Count(&userStats.ActiveUsers).Error; err != nil {
		utils.InternalServerError(c, "获取活跃用户数失败")
		return
	}

	// 获取本月新用户数
	startOfMonth := time.Now().AddDate(0, 0, -time.Now().Day()+1)
	if err := database.DB.Model(&models.User{}).Where("created_at > ?", startOfMonth).Count(&userStats.NewUsers).Error; err != nil {
		utils.InternalServerError(c, "获取本月新用户数失败")
		return
	}

	// 在线用户数
	userStats.OnlineUsers = 0

	utils.Success(c, userStats)
}

// GetTaskTrend 获取任务趋势
func (h *AnalyticsHandler) GetTaskTrend(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	projectID, err := strconv.ParseUint(c.Param("projectId"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "无效的项目ID")
		return
	}

	// 单机版：检查用户是否是项目成员即可
	if !utils.CheckProjectMember(userID, uint(projectID)) && !utils.CheckProjectOwner(userID, uint(projectID)) {
		utils.Forbidden(c, "无权限访问该项目")
		return
	}

	// 获取时间范围
	days := c.DefaultQuery("days", "30")
	daysInt, err := strconv.Atoi(days)
	if err != nil || daysInt < 1 || daysInt > 365 {
		daysInt = 30
	}

	// 获取任务创建趋势
	var trendData []TimeSeriesData
	startDate := time.Now().AddDate(0, 0, -daysInt)

	// 这里应该查询数据库获取每日任务创建数量
	// 暂时返回模拟数据
	for i := 0; i < daysInt; i++ {
		date := startDate.AddDate(0, 0, i)
		trendData = append(trendData, TimeSeriesData{
			Date:  date.Format("2006-01-02"),
			Value: int64(i % 5), // 模拟数据
		})
	}

	utils.Success(c, gin.H{
		"project_id": projectID,
		"days":       daysInt,
		"trend":      trendData,
	})
}

// getTaskStats 获取任务统计（内部方法）
func (h *AnalyticsHandler) getTaskStats(projectID uint, stats *TaskStats) error {
	// 获取总任务数
	if err := database.DB.Model(&models.Task{}).Where("project_id = ?", projectID).Count(&stats.TotalTasks).Error; err != nil {
		return err
	}

	// 获取已完成任务数
	if err := database.DB.Model(&models.Task{}).Where("project_id = ? AND status = ?", projectID, "done").Count(&stats.CompletedTasks).Error; err != nil {
		return err
	}

	// 获取进行中任务数
	if err := database.DB.Model(&models.Task{}).Where("project_id = ? AND status = ?", projectID, "in_progress").Count(&stats.InProgressTasks).Error; err != nil {
		return err
	}

	// 获取待办任务数
	if err := database.DB.Model(&models.Task{}).Where("project_id = ? AND status = ?", projectID, "todo").Count(&stats.TodoTasks).Error; err != nil {
		return err
	}

	// 获取逾期任务数
	now := time.Now()
	if err := database.DB.Model(&models.Task{}).Where("project_id = ? AND due_date < ? AND status != ?", projectID, now, "done").Count(&stats.OverdueTasks).Error; err != nil {
		return err
	}

	// 计算完成率
	if stats.TotalTasks > 0 {
		stats.CompletionRate = float64(stats.CompletedTasks) / float64(stats.TotalTasks) * 100
	}

	// 计算平均完成时间（这里暂时返回0，实际应该计算）
	stats.AvgCompletionTime = 0

	return nil
}
