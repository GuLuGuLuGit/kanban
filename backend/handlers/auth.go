package handlers

import (
	"net/http"
	"project-manager-backend/config"
	"project-manager-backend/database"
	"project-manager-backend/models"
	"project-manager-backend/utils"

	"github.com/gin-gonic/gin"
)

// RegisterRequest 注册请求结构
type RegisterRequest struct {
	Username string `json:"username" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

// LoginRequest 登录请求结构
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// AuthHandler 认证处理器
type AuthHandler struct{}

// Register 用户注册
func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "Invalid request data: "+err.Error())
		return
	}

	// 检查邮箱是否已存在
	var existingUser models.User
	if !database.DB.Where("email = ?", req.Email).First(&existingUser).RecordNotFound() {
		utils.BadRequest(c, "Email already exists")
		return
	}

	// 检查用户名是否已存在
	if !database.DB.Where("username = ?", req.Username).First(&existingUser).RecordNotFound() {
		utils.BadRequest(c, "Username already exists")
		return
	}

	// 加密密码
	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		utils.InternalServerError(c, "Failed to hash password")
		return
	}

	// 创建用户
	user := models.User{
		Username:     req.Username,
		Email:        req.Email,
		PasswordHash: hashedPassword,
		Role:         models.RoleUser, // 默认角色为普通用户
	}

	if err := database.DB.Create(&user).Error; err != nil {
		utils.InternalServerError(c, "Failed to create user: "+err.Error())
		return
	}

	// 验证用户ID是否被正确设置
	if user.ID == 0 {
		utils.InternalServerError(c, "Failed to get user ID after creation. Please check database table structure.")
		return
	}

	// 自动将新用户添加到示例项目
	if err := database.AddUserToSampleProject(user.ID); err != nil {
		// 如果添加失败，记录日志但不影响注册流程
		// 因为示例项目可能不存在或已添加
	}

	// 返回成功响应
	utils.Success(c, gin.H{
		"message": "User registered successfully",
		"user": gin.H{
			"id":       user.ID,
			"username": user.Username,
			"email":    user.Email,
			"role":     user.Role,
		},
	})
}

// Login 用户登录
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "Invalid request data: "+err.Error())
		return
	}

	// 查找用户
	var user models.User
	if database.DB.Where("email = ?", req.Email).First(&user).RecordNotFound() {
		utils.Unauthorized(c, "Invalid email or password")
		return
	}

	// 验证用户ID是否有效
	if user.ID == 0 {
		utils.InternalServerError(c, "Invalid user ID in database. The database table structure needs to be recreated. Please delete 'backend/data/project_manager.db' and restart the server, then register a new user.")
		return
	}

	// 验证密码
	if !utils.CheckPassword(req.Password, user.PasswordHash) {
		utils.Unauthorized(c, "Invalid email or password")
		return
	}

	// 生成JWT Token
	config := config.LoadConfig()
	token, err := utils.GenerateJWT(
		user.ID,
		user.Email,
		string(user.Role),
		config.JWT.Secret,
		config.JWT.ExpireHours,
	)
	if err != nil {
		utils.InternalServerError(c, "Failed to generate token")
		return
	}

	// 返回前端需要的格式
	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"user": gin.H{
			"id":       user.ID,
			"username": user.Username,
			"email":    user.Email,
			"role":     user.Role,
		},
	})
}
