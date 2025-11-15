package handlers

import (
	"project-manager-backend/database"
	"project-manager-backend/models"
	"project-manager-backend/utils"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// ProjectHandler 项目处理器
type ProjectHandler struct{}

// CreateProjectRequest 创建项目请求
type CreateProjectRequest struct {
	Name        string                 `json:"name" binding:"required"`
	Description string                 `json:"description"`
	Members     []ProjectMemberRequest `json:"members,omitempty"` // 协作人员列表（可选）
}

// ProjectMemberRequest 项目成员请求
type ProjectMemberRequest struct {
	UserID uint                     `json:"user_id"`
	Role   models.ProjectMemberRole `json:"role"`
}

// UpdateProjectRequest 更新项目请求
type UpdateProjectRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Status      string `json:"status"`
	EndDate     string `json:"endDate"`
	MemberIds   []uint `json:"memberIds"` // 项目成员ID列表
}

// CreateProject 创建项目
func (h *ProjectHandler) CreateProject(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)

	var req CreateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "Invalid request data: "+err.Error())
		return
	}

	// 开始事务
	tx := database.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 创建项目
	now := time.Now()
	project := models.Project{
		Name:        req.Name,
		Description: req.Description,
		OwnerID:     userID,
		Status:      models.ProjectStatusActive,
		StartDate:   &now,
		CreatedBy:   userID,
	}

	if err := tx.Create(&project).Error; err != nil {
		tx.Rollback()
		utils.InternalServerError(c, "Failed to create project: "+err.Error())
		return
	}

	// 验证项目ID是否被正确设置
	if project.ID == 0 {
		tx.Rollback()
		utils.InternalServerError(c, "Failed to get project ID after creation. Please check database table structure.")
		return
	}

	// 添加项目所有者作为成员
	ownerMember := models.ProjectMember{
		ProjectID: project.ID,
		UserID:    userID,
		Role:      models.ProjectMemberRoleOwner,
	}

	if err := tx.Create(&ownerMember).Error; err != nil {
		tx.Rollback()
		utils.InternalServerError(c, "Failed to add project owner as member")
		return
	}

	// 添加协作人员
	for _, memberReq := range req.Members {
		// 跳过无效的用户ID（0 或未设置）
		if memberReq.UserID == 0 {
			continue
		}

		// 验证角色，如果未设置则使用默认值
		if memberReq.Role == "" {
			memberReq.Role = models.ProjectMemberRoleCollaborator
		}

		// 检查用户是否存在
		var user models.User
		if err := tx.First(&user, memberReq.UserID).Error; err != nil {
			tx.Rollback()
			utils.BadRequest(c, "User not found: "+strconv.Itoa(int(memberReq.UserID)))
			return
		}

		// 检查用户是否已经是项目成员
		var existingMember models.ProjectMember
		if err := tx.Where("project_id = ? AND user_id = ?", project.ID, memberReq.UserID).First(&existingMember).Error; err == nil {
			tx.Rollback()
			utils.BadRequest(c, "User is already a project member")
			return
		}

		// 添加成员
		member := models.ProjectMember{
			ProjectID: project.ID,
			UserID:    memberReq.UserID,
			Role:      memberReq.Role,
			InvitedBy: &userID,
		}

		if err := tx.Create(&member).Error; err != nil {
			tx.Rollback()
			utils.InternalServerError(c, "Failed to add project member")
			return
		}
	}

	// 提交事务
	if err := tx.Commit().Error; err != nil {
		utils.InternalServerError(c, "Failed to commit transaction: "+err.Error())
		return
	}

	// 加载项目所有者信息
	var owner models.User
	if err := database.DB.First(&owner, userID).Error; err == nil {
		project.Owner = &owner
	}

	// 加载项目成员信息
	var members []models.ProjectMember
	if err := database.DB.Preload("User").Where("project_id = ?", project.ID).Find(&members).Error; err == nil {
		project.Members = make([]*models.ProjectMember, len(members))
		for i := range members {
			project.Members[i] = &members[i]
		}
	}

	utils.Success(c, gin.H{
		"project": project,
		"message": "Project created successfully",
	})
}

// GetProjects 获取项目列表
// 单机版：所有用户都可以看到所有活跃项目
func (h *ProjectHandler) GetProjects(c *gin.Context) {
	var projects []models.Project
	query := database.DB.Where("status = ?", models.ProjectStatusActive)

	if err := query.Find(&projects).Error; err != nil {
		utils.InternalServerError(c, "Failed to fetch projects: "+err.Error())
		return
	}

	// 为每个项目加载 Owner 和 Members 信息
	for i := range projects {
		// 加载 Owner
		if projects[i].OwnerID > 0 {
			var owner models.User
			if err := database.DB.First(&owner, projects[i].OwnerID).Error; err == nil {
				projects[i].Owner = &owner
			}
		}

		// 加载 Members（包含 User 信息）
		var members []models.ProjectMember
		if err := database.DB.Preload("User").Where("project_id = ?", projects[i].ID).Find(&members).Error; err == nil {
			projects[i].Members = make([]*models.ProjectMember, len(members))
			for j := range members {
				projects[i].Members[j] = &members[j]
			}
		}
	}

	utils.Success(c, gin.H{
		"projects": projects,
		"total":    len(projects),
	})
}

// GetProject 获取项目详情
func (h *ProjectHandler) GetProject(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	projectID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid project ID")
		return
	}

	// 获取项目详情
	var project models.Project
	if err := database.DB.Preload("Owner").Preload("Members.User").Preload("Stages").
		Where("id = ? AND status = ?", projectID, models.ProjectStatusActive).
		First(&project).Error; err != nil {
		utils.NotFound(c, "Project not found")
		return
	}

	// 单机版：所有用户都可以访问所有项目
	userRoleInProject, _ := utils.GetUserProjectRole(userID, uint(projectID))

	utils.Success(c, gin.H{
		"project":   project,
		"user_role": userRoleInProject,
	})
}

// GetProjectCollaborators 获取项目协作人员列表
func (h *ProjectHandler) GetProjectCollaborators(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	projectID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid project ID")
		return
	}

	// 单机版：检查用户是否是项目成员即可
	if !utils.CheckProjectMember(userID, uint(projectID)) && !utils.CheckProjectOwner(userID, uint(projectID)) {
		utils.Forbidden(c, "Access denied to this project")
		return
	}

	// 检查项目是否存在
	var project models.Project
	if err := database.DB.Where("id = ? AND status = ?", projectID, models.ProjectStatusActive).First(&project).Error; err != nil {
		utils.NotFound(c, "Project not found")
		return
	}

	// 获取项目成员列表
	var members []models.ProjectMember
	if err := database.DB.Preload("User").Where("project_id = ?", projectID).Find(&members).Error; err != nil {
		utils.InternalServerError(c, "Failed to fetch project members")
		return
	}

	// 过滤出协作人员（排除项目所有者）
	var collaborators []models.ProjectMember
	for _, member := range members {
		if member.Role != models.ProjectMemberRoleOwner {
			collaborators = append(collaborators, member)
		}
	}

	utils.Success(c, gin.H{
		"project_id":    projectID,
		"collaborators": collaborators,
		"total":         len(collaborators),
	})
}

// GetAvailableCollaborators 获取可用的协作人员列表（用于项目创建和编辑）
func (h *ProjectHandler) GetAvailableCollaborators(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)

	// 单机版：所有用户都可以查看可用协作人员
	// 获取所有活跃用户（排除当前用户）
	var users []models.User
	query := database.DB.Where("id != ?", userID)

	if err := query.Select("id, username, email, role, created_at").Find(&users).Error; err != nil {
		utils.InternalServerError(c, "Failed to fetch available users")
		return
	}

	utils.Success(c, gin.H{
		"users": users,
		"total": len(users),
	})
}

// UpdateProject 更新项目
func (h *ProjectHandler) UpdateProject(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	projectID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid project ID")
		return
	}

	// 单机版：检查用户是否是项目成员即可编辑
	if !utils.CanManageProject(userID, uint(projectID)) {
		utils.Forbidden(c, "Insufficient permissions to edit project")
		return
	}

	var req UpdateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "Invalid request data: "+err.Error())
		return
	}

	// 查找项目
	var project models.Project
	if err := database.DB.Where("id = ? AND status = ?", projectID, models.ProjectStatusActive).First(&project).Error; err != nil {
		utils.NotFound(c, "Project not found")
		return
	}

	// 开始事务，将所有更新操作放在同一个事务中
	tx := database.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 更新项目基本信息
	updates := make(map[string]interface{})

	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.Description != "" {
		updates["description"] = req.Description
	}
	if req.Status != "" {
		updates["status"] = models.ProjectStatus(req.Status)
	}
	if req.EndDate != "" {
		// 解析日期字符串
		if endDate, err := time.Parse("2006-01-02", req.EndDate); err == nil {
			updates["end_date"] = endDate
		} else {
			tx.Rollback()
			utils.BadRequest(c, "Invalid end date format")
			return
		}
	}

	// 执行项目信息更新
	if len(updates) > 0 {
		if err := tx.Model(&project).Updates(updates).Error; err != nil {
			tx.Rollback()
			utils.InternalServerError(c, "Failed to update project")
			return
		}
	}

	// 处理项目成员更新
	if req.MemberIds != nil {
		// 验证成员是否是当前用户的协作人员
		for _, memberID := range req.MemberIds {
			// 检查用户是否存在
			var user models.User
			if err := tx.First(&user, memberID).Error; err != nil {
				tx.Rollback()
				utils.BadRequest(c, "User not found: "+strconv.Itoa(int(memberID)))
				return
			}

			// 检查是否是项目所有者（防止重复添加）
			if memberID == project.OwnerID {
				tx.Rollback()
				utils.BadRequest(c, "Cannot add project owner as member")
				return
			}

			// 检查是否是当前用户的协作人员
			var collaborator models.UserCollaborator
			if err := tx.Where("user_id = ? AND collaborator_id = ?", userID, memberID).First(&collaborator).Error; err != nil {
				tx.Rollback()
				utils.BadRequest(c, "User "+strconv.Itoa(int(memberID))+" is not your collaborator")
				return
			}
		}

		// 删除现有的非所有者成员
		if err := tx.Where("project_id = ? AND role != ?", projectID, models.ProjectMemberRoleOwner).Delete(&models.ProjectMember{}).Error; err != nil {
			tx.Rollback()
			utils.InternalServerError(c, "Failed to remove existing members")
			return
		}

		// 添加新成员
		for _, memberID := range req.MemberIds {
			member := models.ProjectMember{
				ProjectID: uint(projectID),
				UserID:    memberID,
				Role:      models.ProjectMemberRoleCollaborator,
			}

			if err := tx.Create(&member).Error; err != nil {
				tx.Rollback()
				utils.InternalServerError(c, "Failed to add project member")
				return
			}
		}
	}

	// 提交事务
	if err := tx.Commit().Error; err != nil {
		utils.InternalServerError(c, "Failed to commit updates: "+err.Error())
		return
	}

	// 重新加载项目基本信息
	if err := database.DB.First(&project, projectID).Error; err != nil {
		utils.InternalServerError(c, "Failed to reload project: "+err.Error())
		return
	}

	// 加载项目所有者信息
	if project.OwnerID > 0 {
		var owner models.User
		if err := database.DB.First(&owner, project.OwnerID).Error; err == nil {
			project.Owner = &owner
		}
	}

	// 加载项目成员信息
	var members []models.ProjectMember
	if err := database.DB.Preload("User").Where("project_id = ?", projectID).Find(&members).Error; err == nil {
		project.Members = make([]*models.ProjectMember, len(members))
		for i := range members {
			project.Members[i] = &members[i]
		}
	}

	utils.Success(c, gin.H{
		"project": project,
		"message": "Project updated successfully",
	})
}

// DeleteProject 删除项目
func (h *ProjectHandler) DeleteProject(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	projectID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid project ID")
		return
	}

	// 查找项目
	var project models.Project
	if err := database.DB.Where("id = ?", projectID).First(&project).Error; err != nil {
		utils.NotFound(c, "Project not found")
		return
	}

	// 单机版：所有项目成员都可以删除项目
	if !utils.CanManageProject(userID, uint(projectID)) {
		utils.Forbidden(c, "Insufficient permissions to delete project")
		return
	}

	// 开始事务
	tx := database.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 删除项目成员
	if err := tx.Where("project_id = ?", projectID).Delete(&models.ProjectMember{}).Error; err != nil {
		tx.Rollback()
		utils.InternalServerError(c, "Failed to delete project members")
		return
	}

	// 删除项目
	if err := tx.Delete(&project).Error; err != nil {
		tx.Rollback()
		utils.InternalServerError(c, "Failed to delete project")
		return
	}

	// 提交事务
	if err := tx.Commit().Error; err != nil {
		utils.InternalServerError(c, "Failed to commit transaction")
		return
	}

	utils.Success(c, gin.H{"message": "Project deleted successfully"})
}

