package handlers

import (
	"project-manager-backend/database"
	"project-manager-backend/models"
	"project-manager-backend/utils"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// StageHandler 阶段处理器
type StageHandler struct{}

// CreateStageRequest 创建阶段请求
type CreateStageRequest struct {
	ProjectID        uint   `json:"project_id" binding:"required"`
	Name             string `json:"name" binding:"required"`
	Description      string `json:"description"`
	Color            string `json:"color"`
	TaskLimit        *int   `json:"task_limit"`
	AutoAssignStatus string `json:"autoAssignStatus"`
}

// UpdateStageRequest 更新阶段请求
type UpdateStageRequest struct {
	Name                string  `json:"name"`
	Description         string  `json:"description"`
	Color               string  `json:"color"`
	TaskLimit           *int    `json:"task_limit"`
	IsCompleted         *bool   `json:"is_completed"`
	MaxTasks            *int    `json:"maxTasks"`
	AllowTaskCreation   *bool   `json:"allowTaskCreation"`
	AllowTaskDeletion   *bool   `json:"allowTaskDeletion"`
	AllowTaskMovement   *bool   `json:"allowTaskMovement"`
	NotificationEnabled *bool   `json:"notificationEnabled"`
	AutoAssignStatus    *string `json:"autoAssignStatus"`
	Position            *int    `json:"position"`
}

// ReorderStagesRequest 重新排序阶段请求
type ReorderStagesRequest struct {
	StageOrders []StageOrder `json:"stage_orders" binding:"required"`
}

// StageOrder 阶段排序
type StageOrder struct {
	StageID  uint `json:"stage_id" binding:"required"`
	Position int  `json:"position" binding:"required"`
}

// CreateStage 创建阶段
func (h *StageHandler) CreateStage(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)

	var req CreateStageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "Invalid request data: "+err.Error())
		return
	}

	// 单机版：检查用户是否是项目成员即可
	if !utils.CanManageStages(userID, req.ProjectID) {
		utils.Forbidden(c, "Insufficient permissions to create stage")
		return
	}

	// 检查项目是否存在
	var project models.Project
	if err := database.DB.Where("id = ? AND status = ?", req.ProjectID, models.ProjectStatusActive).First(&project).Error; err != nil {
		utils.NotFound(c, "Project not found")
		return
	}

	// 获取当前最大排序值
	var maxSortOrder int
	database.DB.Model(&models.Stage{}).Where("project_id = ?", req.ProjectID).Select("COALESCE(MAX(position), 0)").Scan(&maxSortOrder)

	// 创建阶段
	stage := models.Stage{
		ProjectID:        req.ProjectID,
		Name:             req.Name,
		Description:      req.Description,
		Color:            req.Color,
		Position:         maxSortOrder + 1,
		TaskLimit:        req.TaskLimit,
		CreatedBy:        userID,
		AutoAssignStatus: req.AutoAssignStatus,
	}

	if stage.Color == "" {
		stage.Color = "#3B82F6"
	}

	if err := database.DB.Create(&stage).Error; err != nil {
		utils.InternalServerError(c, "Failed to create stage")
		return
	}

	// 重新加载阶段信息
	if err := database.DB.Preload("Project").First(&stage, stage.ID).Error; err != nil {
		utils.InternalServerError(c, "Failed to reload stage data")
		return
	}

	utils.Success(c, gin.H{
		"stage":   stage,
		"message": "Stage created successfully",
	})
}

// GetProjectStages 获取项目阶段列表
func (h *StageHandler) GetProjectStages(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	projectID, err := strconv.ParseUint(c.Param("projectId"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid project ID")
		return
	}

	// 单机版：检查用户是否是项目成员即可
	if !utils.CheckProjectMember(userID, uint(projectID)) && !utils.CheckProjectOwner(userID, uint(projectID)) {
		utils.Forbidden(c, "Access denied to this project")
		return
	}

	// 获取项目阶段
	var stages []models.Stage
	if err := database.DB.Preload("Project").Preload("Tasks.Assignee").
		Where("project_id = ?", projectID).
		Order("sort_order ASC").
		Find(&stages).Error; err != nil {
		utils.InternalServerError(c, "Failed to fetch project stages")
		return
	}

	// 为每个阶段添加任务统计
	for i := range stages {
		stages[i].Tasks = []*models.Task{} // 清空任务列表，只保留统计信息
	}

	utils.Success(c, gin.H{
		"project_id": projectID,
		"stages":     stages,
		"total":      len(stages),
	})
}

// UpdateStage 更新阶段
func (h *StageHandler) UpdateStage(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	stageID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid stage ID")
		return
	}

	// 查找阶段
	var stage models.Stage
	if err := database.DB.Preload("Project").First(&stage, stageID).Error; err != nil {
		utils.NotFound(c, "Stage not found")
		return
	}

	// 单机版：检查用户是否是项目成员即可
	if !utils.CanManageStages(userID, stage.ProjectID) {
		utils.Forbidden(c, "Insufficient permissions to update stage")
		return
	}

	var req UpdateStageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "Invalid request data: "+err.Error())
		return
	}

	// 更新字段
	updates := make(map[string]interface{})

	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.Description != "" {
		updates["description"] = req.Description
	}
	if req.Color != "" {
		updates["color"] = req.Color
	}
	if req.TaskLimit != nil {
		updates["task_limit"] = *req.TaskLimit
	}
	if req.IsCompleted != nil {
		updates["is_completed"] = *req.IsCompleted
		if *req.IsCompleted {
			updates["completed_at"] = time.Now()
		} else {
			updates["completed_at"] = nil
		}
	}
	if req.MaxTasks != nil {
		updates["max_tasks"] = *req.MaxTasks
	}
	if req.AllowTaskCreation != nil {
		updates["allow_task_creation"] = *req.AllowTaskCreation
	}
	if req.AllowTaskDeletion != nil {
		updates["allow_task_deletion"] = *req.AllowTaskDeletion
	}
	if req.AllowTaskMovement != nil {
		updates["allow_task_movement"] = *req.AllowTaskMovement
	}
	if req.NotificationEnabled != nil {
		updates["notification_enabled"] = *req.NotificationEnabled
	}
	if req.AutoAssignStatus != nil {
		updates["auto_assign_status"] = *req.AutoAssignStatus
	}

	// 执行基础字段更新
	if len(updates) > 0 {
		if err := database.DB.Model(&stage).Updates(updates).Error; err != nil {
			utils.InternalServerError(c, "Failed to update stage")
			return
		}
	}

	// 处理排序更新
	if req.Position != nil {
		newPosition := *req.Position
		if newPosition < 1 {
			newPosition = 1
		}

		var stageCount int64
		if err := database.DB.Model(&models.Stage{}).
			Where("project_id = ?", stage.ProjectID).
			Count(&stageCount).Error; err != nil {
			utils.InternalServerError(c, "Failed to fetch stage count")
			return
		}

		if stageCount == 0 {
			utils.InternalServerError(c, "Stage count is zero")
			return
		}

		if newPosition > int(stageCount) {
			newPosition = int(stageCount)
		}

		if newPosition != stage.Position {
			tx := database.DB.Begin()
			if tx.Error != nil {
				utils.InternalServerError(c, "Failed to start transaction for position update")
				return
			}

			var shiftErr error
			if newPosition < stage.Position {
				shiftErr = tx.Model(&models.Stage{}).
					Where("project_id = ? AND position >= ? AND position < ? AND id <> ?", stage.ProjectID, newPosition, stage.Position, stage.ID).
					Update("position", gorm.Expr("position + 1")).Error
			} else {
				shiftErr = tx.Model(&models.Stage{}).
					Where("project_id = ? AND position <= ? AND position > ? AND id <> ?", stage.ProjectID, newPosition, stage.Position, stage.ID).
					Update("position", gorm.Expr("position - 1")).Error
			}

			if shiftErr != nil {
				tx.Rollback()
				utils.InternalServerError(c, "Failed to adjust other stage positions")
				return
			}

			if err := tx.Model(&models.Stage{}).
				Where("id = ?", stage.ID).
				Update("position", newPosition).Error; err != nil {
				tx.Rollback()
				utils.InternalServerError(c, "Failed to update stage position")
				return
			}

			if err := tx.Commit().Error; err != nil {
				utils.InternalServerError(c, "Failed to commit stage position update")
				return
			}

			stage.Position = newPosition
		}
	}

	// 重新加载阶段信息
	if err := database.DB.Preload("Project").First(&stage, stageID).Error; err != nil {
		utils.InternalServerError(c, "Failed to reload stage data")
		return
	}

	utils.Success(c, gin.H{
		"stage":   stage,
		"message": "Stage updated successfully",
	})
}

// DeleteStage 删除阶段
func (h *StageHandler) DeleteStage(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	stageID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid stage ID")
		return
	}

	// 查找阶段
	var stage models.Stage
	if err := database.DB.Preload("Project").First(&stage, stageID).Error; err != nil {
		utils.NotFound(c, "Stage not found")
		return
	}

	// 单机版：检查用户是否是项目成员即可
	if !utils.CanManageStages(userID, stage.ProjectID) {
		utils.Forbidden(c, "Insufficient permissions to delete stage")
		return
	}

	// 开始事务
	tx := database.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 先删除阶段内的所有任务
	if err := tx.Where("stage_id = ?", stageID).Delete(&models.Task{}).Error; err != nil {
		tx.Rollback()
		utils.InternalServerError(c, "Failed to delete stage tasks")
		return
	}

	// 删除阶段
	if err := tx.Delete(&stage).Error; err != nil {
		tx.Rollback()
		utils.InternalServerError(c, "Failed to delete stage")
		return
	}

	// 重新排序其他阶段
	if err := tx.Model(&models.Stage{}).
		Where("project_id = ? AND position > ?", stage.ProjectID, stage.Position).
		Update("position", "position - 1").Error; err != nil {
		tx.Rollback()
		utils.InternalServerError(c, "Failed to reorder stages")
		return
	}

	// 提交事务
	if err := tx.Commit().Error; err != nil {
		utils.InternalServerError(c, "Failed to commit transaction")
		return
	}

	utils.Success(c, gin.H{"message": "Stage deleted successfully"})
}

// ReorderStages 重新排序阶段
func (h *StageHandler) ReorderStages(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)

	var req ReorderStagesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "Invalid request data: "+err.Error())
		return
	}

	if len(req.StageOrders) == 0 {
		utils.BadRequest(c, "Stage orders cannot be empty")
		return
	}

	// 获取第一个阶段的项目ID
	var firstStage models.Stage
	if err := database.DB.First(&firstStage, req.StageOrders[0].StageID).Error; err != nil {
		utils.NotFound(c, "Stage not found")
		return
	}

	// 单机版：检查用户是否是项目成员即可
	if !utils.CanManageStages(userID, firstStage.ProjectID) {
		utils.Forbidden(c, "Insufficient permissions to reorder stages")
		return
	}

	// 开始事务
	tx := database.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 更新阶段排序
	for _, stageOrder := range req.StageOrders {
		if err := tx.Model(&models.Stage{}).
			Where("id = ? AND project_id = ?", stageOrder.StageID, firstStage.ProjectID).
			Update("position", stageOrder.Position).Error; err != nil {
			tx.Rollback()
			utils.InternalServerError(c, "Failed to update stage order")
			return
		}
	}

	// 提交事务
	if err := tx.Commit().Error; err != nil {
		utils.InternalServerError(c, "Failed to commit transaction")
		return
	}

	utils.Success(c, gin.H{"message": "Stages reordered successfully"})
}
