package handlers

import (
	"project-manager-backend/database"
	"project-manager-backend/models"
	"project-manager-backend/utils"
	"strconv"

	"github.com/gin-gonic/gin"
)

// CollaboratorHandler 协作人员处理器
type CollaboratorHandler struct{}

// AddCollaboratorRequest 添加协作人员请求
type AddCollaboratorRequest struct {
	CollaboratorID uint `json:"collaborator_id" binding:"required"`
}

// GetUserCollaborators 获取用户的协作人员列表
func (h *CollaboratorHandler) GetUserCollaborators(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)

	var collaborators []models.UserCollaborator
	if err := database.DB.Preload("Collaborator").Where("user_id = ?", userID).Find(&collaborators).Error; err != nil {
		utils.InternalServerError(c, "Failed to fetch collaborators")
		return
	}

	// 提取协作人员用户信息
	var users []models.User
	for _, collab := range collaborators {
		if collab.Collaborator != nil {
			users = append(users, *collab.Collaborator)
		}
	}

	utils.Success(c, gin.H{
		"collaborators": users,
		"total":         len(users),
	})
}

// AddCollaborator 添加协作人员
func (h *CollaboratorHandler) AddCollaborator(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)

	var req AddCollaboratorRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "Invalid request data: "+err.Error())
		return
	}

	// 检查协作人员是否存在
	var collaboratorUser models.User
	if err := database.DB.First(&collaboratorUser, req.CollaboratorID).Error; err != nil {
		utils.NotFound(c, "Collaborator user not found")
		return
	}

	// 检查是否已经是协作人员
	var existing models.UserCollaborator
	if err := database.DB.Where("user_id = ? AND collaborator_id = ?", userID, req.CollaboratorID).First(&existing).Error; err == nil {
		utils.BadRequest(c, "User is already a collaborator")
		return
	}

	// 不能添加自己为协作人员
	if userID == req.CollaboratorID {
		utils.BadRequest(c, "Cannot add yourself as collaborator")
		return
	}

	// 创建协作人员关系
	collaborator := models.UserCollaborator{
		UserID:         userID,
		CollaboratorID: req.CollaboratorID,
	}

	if err := database.DB.Create(&collaborator).Error; err != nil {
		utils.InternalServerError(c, "Failed to add collaborator")
		return
	}

	utils.Success(c, gin.H{
		"message":      "Collaborator added successfully",
		"collaborator": collaboratorUser,
	})
}

// CheckCollaboratorProjectMemberships 检查协作人员的项目成员关系
func (h *CollaboratorHandler) CheckCollaboratorProjectMemberships(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	collaboratorID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid collaborator ID")
		return
	}

	// 检查协作关系是否存在
	var collaborator models.UserCollaborator
	if err := database.DB.Where("user_id = ? AND collaborator_id = ?", userID, collaboratorID).First(&collaborator).Error; err != nil {
		utils.NotFound(c, "Collaborator relationship not found")
		return
	}

	// 查找该协作人员在当前用户拥有的项目中的成员关系
	var projectMemberships []struct {
		ProjectID   uint   `json:"project_id"`
		ProjectName string `json:"project_name"`
		Role        string `json:"role"`
	}

	if err := database.DB.Table("project_members pm").
		Select("pm.project_id, p.name as project_name, pm.role").
		Joins("JOIN projects p ON pm.project_id = p.id").
		Where("pm.user_id = ? AND p.owner_id = ? AND p.status = ?", collaboratorID, userID, models.ProjectStatusActive).
		Find(&projectMemberships).Error; err != nil {
		utils.InternalServerError(c, "Failed to check project memberships")
		return
	}

	utils.Success(c, gin.H{
		"has_memberships": len(projectMemberships) > 0,
		"memberships":     projectMemberships,
		"total":           len(projectMemberships),
	})
}

// RemoveCollaborator 移除协作人员
func (h *CollaboratorHandler) RemoveCollaborator(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	collaboratorID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid collaborator ID")
		return
	}

	// 检查是否强制删除（前端传递的参数）
	forceDelete := c.Query("force") == "true"

	// 如果不是强制删除，先检查项目成员关系
	if !forceDelete {
		var projectMemberships []struct {
			ProjectID   uint   `json:"project_id"`
			ProjectName string `json:"project_name"`
			Role        string `json:"role"`
		}

		if err := database.DB.Table("project_members pm").
			Select("pm.project_id, p.name as project_name, pm.role").
			Joins("JOIN projects p ON pm.project_id = p.id").
			Where("pm.user_id = ? AND p.owner_id = ? AND p.status = ?", collaboratorID, userID, models.ProjectStatusActive).
			Find(&projectMemberships).Error; err != nil {
			utils.InternalServerError(c, "Failed to check project memberships")
			return
		}

		// 如果有项目成员关系，返回警告信息
		if len(projectMemberships) > 0 {
			c.JSON(400, gin.H{
				"success": false,
				"message": "该协作人员还是项目成员，需要确认删除",
				"data": gin.H{
					"memberships":           projectMemberships,
					"total":                 len(projectMemberships),
					"requires_confirmation": true,
				},
			})
			return
		}
	}

	// 开始事务处理级联删除
	tx := database.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 1. 删除该协作人员在当前用户拥有的项目中的成员关系
	if err := tx.Table("project_members pm").
		Joins("JOIN projects p ON pm.project_id = p.id").
		Where("pm.user_id = ? AND p.owner_id = ?", collaboratorID, userID).
		Delete(&models.ProjectMember{}).Error; err != nil {
		tx.Rollback()
		utils.InternalServerError(c, "Failed to remove project memberships")
		return
	}

	// 2. 删除协作人员关系
	if err := tx.Where("user_id = ? AND collaborator_id = ?", userID, collaboratorID).Delete(&models.UserCollaborator{}).Error; err != nil {
		tx.Rollback()
		utils.InternalServerError(c, "Failed to remove collaborator")
		return
	}

	// 提交事务
	if err := tx.Commit().Error; err != nil {
		utils.InternalServerError(c, "Failed to commit transaction")
		return
	}

	utils.Success(c, gin.H{
		"message": "Collaborator and related project memberships removed successfully",
	})
}
