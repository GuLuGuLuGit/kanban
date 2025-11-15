package handlers

import (
	"project-manager-backend/database"
	"project-manager-backend/models"
	"project-manager-backend/utils"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

// UserHandler 用户处理器
type UserHandler struct{}

// SearchUsersRequest 搜索用户请求
type SearchUsersRequest struct {
	Query string `json:"query" binding:"required"`
}

// SearchUsersResponse 搜索用户响应
type SearchUsersResponse struct {
	Users []UserSearchResult `json:"users"`
	Total int                `json:"total"`
}

// UserSearchResult 用户搜索结果
type UserSearchResult struct {
	ID       uint   `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Role     string `json:"role"`
}

// SearchUsers 搜索用户
func (h *UserHandler) SearchUsers(c *gin.Context) {
	var req SearchUsersRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "Invalid request data: "+err.Error())
		return
	}

	query := strings.TrimSpace(req.Query)
	if len(query) < 2 {
		utils.BadRequest(c, "Query must be at least 2 characters")
		return
	}

	// 搜索用户（精确匹配邮箱或用户名）
	var users []models.User

	if err := database.DB.Select("id, username, email, role").
		Where("email = ? OR username = ?", query, query).
		Limit(20).
		Find(&users).Error; err != nil {
		utils.InternalServerError(c, "Failed to search users")
		return
	}

	// 构建响应数据
	var results []UserSearchResult
	for _, user := range users {
		results = append(results, UserSearchResult{
			ID:       user.ID,
			Username: user.Username,
			Email:    user.Email,
			Role:     string(user.Role),
		})
	}

	utils.Success(c, SearchUsersResponse{
		Users: results,
		Total: len(results),
	})
}

// GetUsers 获取用户列表（用于管理）
func (h *UserHandler) GetUsers(c *gin.Context) {
	userRole := c.MustGet("user_role").(string)

	// 只有系统管理员可以查看所有用户
	if userRole != "admin" {
		utils.Forbidden(c, "Admin access required")
		return
	}

	// 获取分页参数
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	offset := (page - 1) * pageSize

	// 查询用户
	var users []models.User
	var total int64

	// 获取总数
	if err := database.DB.Model(&models.User{}).Count(&total).Error; err != nil {
		utils.InternalServerError(c, "Failed to count users")
		return
	}

	// 获取用户列表
	if err := database.DB.Select("id, username, email, role, created_at").
		Offset(offset).
		Limit(pageSize).
		Order("created_at DESC").
		Find(&users).Error; err != nil {
		utils.InternalServerError(c, "Failed to fetch users")
		return
	}

	utils.Success(c, gin.H{
		"users":     users,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

// CreateUser 创建用户（系统管理员功能）
func (h *UserHandler) CreateUser(c *gin.Context) {
	userRole := c.MustGet("user_role").(string)

	// 只有系统管理员可以创建用户
	if userRole != "admin" {
		utils.Forbidden(c, "Admin access required")
		return
	}

	var req struct {
		Username string `json:"username" binding:"required"`
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required,min=6"`
		Role     string `json:"role" binding:"required,oneof=admin user"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "Invalid request data: "+err.Error())
		return
	}

	// 检查邮箱是否已存在
	var existingUser models.User
	if err := database.DB.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		utils.BadRequest(c, "Email already exists")
		return
	}

	// 检查用户名是否已存在
	if err := database.DB.Where("username = ?", req.Username).First(&existingUser).Error; err == nil {
		utils.BadRequest(c, "Username already exists")
		return
	}

	// 创建用户
	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		utils.InternalServerError(c, "Failed to hash password")
		return
	}

	user := models.User{
		Username:     req.Username,
		Email:        req.Email,
		PasswordHash: hashedPassword,
		Role:         models.UserRole(req.Role),
	}

	if err := database.DB.Create(&user).Error; err != nil {
		utils.InternalServerError(c, "Failed to create user")
		return
	}

	// 返回用户信息（不包含密码）
	utils.Success(c, gin.H{
		"id":         user.ID,
		"username":   user.Username,
		"email":      user.Email,
		"role":       user.Role,
		"created_at": user.CreatedAt,
	})
}

// UpdateUser 更新用户（系统管理员功能）
func (h *UserHandler) UpdateUser(c *gin.Context) {
	userRole := c.MustGet("user_role").(string)

	// 只有系统管理员可以更新用户
	if userRole != "admin" {
		utils.Forbidden(c, "Admin access required")
		return
	}

	userID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid user ID")
		return
	}

	var req struct {
		Username string `json:"username"`
		Email    string `json:"email" binding:"omitempty,email"`
		Role     string `json:"role" binding:"omitempty,oneof=admin user"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "Invalid request data: "+err.Error())
		return
	}

	// 查找用户
	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		utils.NotFound(c, "User not found")
		return
	}

	// 更新字段
	updates := make(map[string]interface{})

	if req.Username != "" && req.Username != user.Username {
		// 检查用户名是否已存在
		var existingUser models.User
		if err := database.DB.Where("username = ? AND id != ?", req.Username, userID).First(&existingUser).Error; err == nil {
			utils.BadRequest(c, "Username already exists")
			return
		}
		updates["username"] = req.Username
	}

	if req.Email != "" && req.Email != user.Email {
		// 检查邮箱是否已存在
		var existingUser models.User
		if err := database.DB.Where("email = ? AND id != ?", req.Email, userID).First(&existingUser).Error; err == nil {
			utils.BadRequest(c, "Email already exists")
			return
		}
		updates["email"] = req.Email
	}

	if req.Role != "" {
		updates["role"] = models.UserRole(req.Role)
	}

	// 执行更新
	if len(updates) > 0 {
		if err := database.DB.Model(&user).Updates(updates).Error; err != nil {
			utils.InternalServerError(c, "Failed to update user")
			return
		}
	}

	// 重新加载用户信息
	if err := database.DB.First(&user, userID).Error; err != nil {
		utils.InternalServerError(c, "Failed to reload user data")
		return
	}

	utils.Success(c, gin.H{
		"id":         user.ID,
		"username":   user.Username,
		"email":      user.Email,
		"role":       user.Role,
		"updated_at": user.UpdatedAt,
	})
}

// DeleteUser 删除用户（系统管理员功能）
func (h *UserHandler) DeleteUser(c *gin.Context) {
	userRole := c.MustGet("user_role").(string)

	// 只有系统管理员可以删除用户
	if userRole != "admin" {
		utils.Forbidden(c, "Admin access required")
		return
	}

	userID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid user ID")
		return
	}

	// 查找用户
	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		utils.NotFound(c, "User not found")
		return
	}

	// 检查用户是否有项目
	var projectCount int64
	if err := database.DB.Model(&models.Project{}).Where("owner_id = ?", userID).Count(&projectCount).Error; err != nil {
		utils.InternalServerError(c, "Failed to check user projects")
		return
	}

	if projectCount > 0 {
		utils.BadRequest(c, "Cannot delete user with existing projects")
		return
	}

	// 删除用户
	if err := database.DB.Delete(&user).Error; err != nil {
		utils.InternalServerError(c, "Failed to delete user")
		return
	}

	utils.Success(c, gin.H{"message": "User deleted successfully"})
}
