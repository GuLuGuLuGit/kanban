package handlers

import (
	"project-manager-backend/database"
	"project-manager-backend/models"
	"project-manager-backend/utils"
	"strconv"

	"github.com/gin-gonic/gin"
)

// MemberHandler 协作人员处理器
type MemberHandler struct{}

// AddMemberRequest 添加成员请求
type AddMemberRequest struct {
	UserID uint                     `json:"user_id" binding:"required"`
	Role   models.ProjectMemberRole `json:"role" binding:"required"`
}

// UpdateMemberRoleRequest 更新成员角色请求
type UpdateMemberRoleRequest struct {
	Role models.ProjectMemberRole `json:"role" binding:"required"`
}

// GetProjectMembers 获取项目成员列表
func (h *MemberHandler) GetProjectMembers(c *gin.Context) {
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

	// 获取项目成员
	var members []models.ProjectMember
	if err := database.DB.Preload("User").Preload("Inviter").
		Where("project_id = ?", projectID).
		Order("created_at ASC").
		Find(&members).Error; err != nil {
		utils.InternalServerError(c, "Failed to fetch project members")
		return
	}

	utils.Success(c, gin.H{
		"project_id": projectID,
		"members":    members,
		"total":      len(members),
	})
}

// AddProjectMember 添加项目成员
func (h *MemberHandler) AddProjectMember(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	projectID, err := strconv.ParseUint(c.Param("projectId"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid project ID")
		return
	}

	// 单机版：检查用户是否是项目成员即可
	if !utils.CanInviteMembers(userID, uint(projectID)) {
		utils.Forbidden(c, "Insufficient permissions to add members")
		return
	}

	var req AddMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "Invalid request data: "+err.Error())
		return
	}

	// 单机版：默认使用 collaborator 角色
	if req.Role == "" {
		req.Role = models.ProjectMemberRoleCollaborator
	}

	// 检查项目是否存在
	var project models.Project
	if err := database.DB.Where("id = ? AND status = ?", projectID, models.ProjectStatusActive).First(&project).Error; err != nil {
		utils.NotFound(c, "Project not found")
		return
	}

	// 检查用户是否存在
	var user models.User
	if err := database.DB.First(&user, req.UserID).Error; err != nil {
		utils.NotFound(c, "User not found")
		return
	}

	// 检查用户是否已经是项目成员
	var existingMember models.ProjectMember
	if err := database.DB.Where("project_id = ? AND user_id = ?", projectID, req.UserID).First(&existingMember).Error; err == nil {
		utils.BadRequest(c, "User is already a project member")
		return
	}

	// 添加成员
	member := models.ProjectMember{
		ProjectID: uint(projectID),
		UserID:    req.UserID,
		Role:      req.Role,
		InvitedBy: &userID,
	}

	if err := database.DB.Create(&member).Error; err != nil {
		utils.InternalServerError(c, "Failed to add project member")
		return
	}

	// 重新加载成员信息
	if err := database.DB.Preload("User").Preload("Inviter").First(&member, member.ID).Error; err != nil {
		utils.InternalServerError(c, "Failed to reload member data")
		return
	}

	utils.Success(c, gin.H{
		"member":  member,
		"message": "Project member added successfully",
	})
}

// UpdateMemberRole 更新成员角色
func (h *MemberHandler) UpdateMemberRole(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	projectID, err := strconv.ParseUint(c.Param("projectId"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid project ID")
		return
	}

	memberUserID, err := strconv.ParseUint(c.Param("userId"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid user ID")
		return
	}

	// 单机版：检查用户是否是项目成员即可
	if !utils.CanInviteMembers(userID, uint(projectID)) {
		utils.Forbidden(c, "Insufficient permissions to update member role")
		return
	}

	var req UpdateMemberRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "Invalid request data: "+err.Error())
		return
	}

	// 单机版：默认使用 collaborator 角色
	if req.Role == "" {
		req.Role = models.ProjectMemberRoleCollaborator
	}

	// 检查项目是否存在
	var project models.Project
	if err := database.DB.Where("id = ? AND status = ?", projectID, models.ProjectStatusActive).First(&project).Error; err != nil {
		utils.NotFound(c, "Project not found")
		return
	}

	// 检查要更新的成员是否存在
	var member models.ProjectMember
	if err := database.DB.Where("project_id = ? AND user_id = ?", projectID, memberUserID).First(&member).Error; err != nil {
		utils.NotFound(c, "Project member not found")
		return
	}

	// 防止将项目所有者降级为其他角色
	if member.Role == models.ProjectMemberRoleOwner {
		utils.Forbidden(c, "Cannot change project owner role")
		return
	}

	// 更新成员角色
	if err := database.DB.Model(&member).Update("role", req.Role).Error; err != nil {
		utils.InternalServerError(c, "Failed to update member role")
		return
	}

	// 重新加载成员信息
	if err := database.DB.Preload("User").Preload("Inviter").First(&member, member.ID).Error; err != nil {
		utils.InternalServerError(c, "Failed to reload member data")
		return
	}

	utils.Success(c, gin.H{
		"member":  member,
		"message": "Member role updated successfully",
	})
}

// RemoveProjectMember 移除项目成员
func (h *MemberHandler) RemoveProjectMember(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	projectID, err := strconv.ParseUint(c.Param("projectId"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid project ID")
		return
	}

	memberUserID, err := strconv.ParseUint(c.Param("userId"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid user ID")
		return
	}

	// 单机版：检查用户是否是项目成员即可
	if !utils.CanInviteMembers(userID, uint(projectID)) {
		utils.Forbidden(c, "Insufficient permissions to remove members")
		return
	}

	// 检查项目是否存在
	var project models.Project
	if err := database.DB.Where("id = ? AND status = ?", projectID, models.ProjectStatusActive).First(&project).Error; err != nil {
		utils.NotFound(c, "Project not found")
		return
	}

	// 检查要移除的成员是否存在
	var member models.ProjectMember
	if err := database.DB.Where("project_id = ? AND user_id = ?", projectID, memberUserID).First(&member).Error; err != nil {
		utils.NotFound(c, "Project member not found")
		return
	}

	// 防止移除项目所有者
	if member.Role == models.ProjectMemberRoleOwner {
		utils.Forbidden(c, "Cannot remove project owner")
		return
	}

	// 移除成员
	if err := database.DB.Delete(&member).Error; err != nil {
		utils.InternalServerError(c, "Failed to remove project member")
		return
	}

	utils.Success(c, gin.H{"message": "Project member removed successfully"})
}

// BatchAddMembers 批量添加成员
func (h *MemberHandler) BatchAddMembers(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	projectID, err := strconv.ParseUint(c.Param("projectId"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid project ID")
		return
	}

	// 单机版：检查用户是否是项目成员即可
	if !utils.CanInviteMembers(userID, uint(projectID)) {
		utils.Forbidden(c, "Insufficient permissions to add members")
		return
	}

	var req struct {
		Members []AddMemberRequest `json:"members" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "Invalid request data: "+err.Error())
		return
	}

	// 检查项目是否存在
	var project models.Project
	if err := database.DB.Where("id = ? AND status = ?", projectID, models.ProjectStatusActive).First(&project).Error; err != nil {
		utils.NotFound(c, "Project not found")
		return
	}

	// 开始事务
	tx := database.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	var addedMembers []models.ProjectMember
	var errors []string

	for _, memberReq := range req.Members {
		// 单机版：默认使用 collaborator 角色
		if memberReq.Role == "" {
			memberReq.Role = models.ProjectMemberRoleCollaborator
		}

		// 检查用户是否存在
		var user models.User
		if err := tx.First(&user, memberReq.UserID).Error; err != nil {
			errors = append(errors, "User not found: "+strconv.Itoa(int(memberReq.UserID)))
			continue
		}

		// 检查用户是否已经是项目成员
		var existingMember models.ProjectMember
		if err := tx.Where("project_id = ? AND user_id = ?", projectID, memberReq.UserID).First(&existingMember).Error; err == nil {
			errors = append(errors, "User already a member: "+strconv.Itoa(int(memberReq.UserID)))
			continue
		}

		// 添加成员
		member := models.ProjectMember{
			ProjectID: uint(projectID),
			UserID:    memberReq.UserID,
			Role:      memberReq.Role,
			InvitedBy: &userID,
		}

		if err := tx.Create(&member).Error; err != nil {
			errors = append(errors, "Failed to add user "+strconv.Itoa(int(memberReq.UserID)))
			continue
		}

		addedMembers = append(addedMembers, member)
	}

	// 提交事务
	if err := tx.Commit().Error; err != nil {
		utils.InternalServerError(c, "Failed to commit transaction")
		return
	}

	// 重新加载成员信息
	for i := range addedMembers {
		database.DB.Preload("User").Preload("Inviter").First(&addedMembers[i], addedMembers[i].ID)
	}

	utils.Success(c, gin.H{
		"added_members": addedMembers,
		"errors":        errors,
		"message":       "Batch add members completed",
	})
}
