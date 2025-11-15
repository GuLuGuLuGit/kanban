package utils

import (
	"project-manager-backend/database"
	"project-manager-backend/models"
)

// CheckProjectPermission 检查用户在项目中的权限
func CheckProjectPermission(userID uint, projectID uint, requiredRole models.ProjectMemberRole) bool {
	// 检查用户是否是项目所有者
	var project models.Project
	if err := database.DB.Where("id = ? AND owner_id = ?", projectID, userID).First(&project).Error; err == nil {
		return true // 项目所有者拥有所有权限
	}

	// 检查用户是否是项目成员且角色满足要求
	var member models.ProjectMember
	if err := database.DB.Where("project_id = ? AND user_id = ?", projectID, userID).First(&member).Error; err != nil {
		return false // 用户不是项目成员
	}

	// 根据角色检查权限
	switch requiredRole {
	case models.ProjectMemberRoleOwner:
		return member.Role == models.ProjectMemberRoleOwner
	case models.ProjectMemberRoleManager:
		return member.Role == models.ProjectMemberRoleOwner || member.Role == models.ProjectMemberRoleManager
	case models.ProjectMemberRoleCollaborator:
		return true // 所有项目成员都可以操作任务
	default:
		return false
	}
}

// CheckProjectOwner 检查用户是否是项目所有者
func CheckProjectOwner(userID uint, projectID uint) bool {
	var project models.Project
	if err := database.DB.Where("id = ? AND owner_id = ?", projectID, userID).First(&project).Error; err != nil {
		return false
	}
	return true
}

// CheckProjectMember 检查用户是否是项目成员
func CheckProjectMember(userID uint, projectID uint) bool {
	var member models.ProjectMember
	if err := database.DB.Where("project_id = ? AND user_id = ?", projectID, userID).First(&member).Error; err != nil {
		return false
	}
	return true
}

// GetUserProjectRole 获取用户在项目中的角色
func GetUserProjectRole(userID uint, projectID uint) (models.ProjectMemberRole, bool) {
	// 直接查询project_members表，这样更准确且避免重复查询
	var member models.ProjectMember
	if err := database.DB.Where("project_id = ? AND user_id = ?", projectID, userID).First(&member).Error; err != nil {
		// 如果在project_members表中没找到，检查是否是项目所有者（兼容性处理）
		var project models.Project
		if err := database.DB.Where("id = ? AND owner_id = ?", projectID, userID).First(&project).Error; err != nil {
			return "", false
		}
		return models.ProjectMemberRoleOwner, true
	}

	return member.Role, true
}

// CanManageStages 检查用户是否可以管理阶段
// 单机版：所有项目成员都可以管理阶段
func CanManageStages(userID uint, projectID uint) bool {
	return CheckProjectMember(userID, projectID) || CheckProjectOwner(userID, projectID)
}

// CanManageTasks 检查用户是否可以管理任务
// 单机版：所有项目成员都可以管理任务
func CanManageTasks(userID uint, projectID uint) bool {
	return CheckProjectMember(userID, projectID) || CheckProjectOwner(userID, projectID)
}

// CanManageProject 检查用户是否可以管理项目（编辑、删除等）
// 单机版：所有项目成员都可以管理项目
func CanManageProject(userID uint, projectID uint) bool {
	return CheckProjectMember(userID, projectID) || CheckProjectOwner(userID, projectID)
}

// CanInviteMembers 检查用户是否可以邀请成员
// 单机版：所有项目成员都可以邀请成员
func CanInviteMembers(userID uint, projectID uint) bool {
	return CheckProjectMember(userID, projectID) || CheckProjectOwner(userID, projectID)
}
