package middleware

import (
	"project-manager-backend/config"
	"project-manager-backend/utils"
	"strings"

	"github.com/gin-gonic/gin"
)

// AuthMiddleware JWT认证中间件
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取Authorization头
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			utils.Unauthorized(c, "Authorization header is required")
			c.Abort()
			return
		}

		// 检查Bearer前缀
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			utils.Unauthorized(c, "Invalid authorization header format")
			c.Abort()
			return
		}

		token := parts[1]
		config := config.LoadConfig()

		// 验证JWT Token
		claims, err := utils.ValidateJWT(token, config.JWT.Secret)
		if err != nil {
			utils.Unauthorized(c, "Invalid or expired token")
			c.Abort()
			return
		}

		// 验证claims中的UserID是否有效
		if claims.UserID == 0 {
			utils.Unauthorized(c, "Invalid token: user ID is missing")
			c.Abort()
			return
		}

		// 将用户信息存储到上下文中
		c.Set("user_id", claims.UserID)
		c.Set("user_email", claims.Email)
		c.Set("user_role", claims.Role)

		c.Next()
	}
}

// AdminMiddleware 系统管理员权限中间件
func AdminMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, exists := c.Get("user_role")
		if !exists {
			utils.Unauthorized(c, "User role not found")
			c.Abort()
			return
		}

		role := userRole.(string)
		if role != "admin" {
			utils.Forbidden(c, "Admin access required")
			c.Abort()
			return
		}

		c.Next()
	}
}

// ProjectOwnerMiddleware 项目所有者权限中间件
func ProjectOwnerMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole := c.MustGet("user_role").(string)

		// 系统管理员拥有所有权限
		if userRole == "admin" {
			c.Next()
			return
		}

		// 获取项目ID
		projectIDStr := c.Param("projectId")
		if projectIDStr == "" {
			projectIDStr = c.Param("id")
		}

		if projectIDStr == "" {
			utils.BadRequest(c, "Project ID is required")
			c.Abort()
			return
		}

		// 检查用户是否是项目所有者
		// 这里需要在handler中实现具体的检查逻辑
		c.Set("project_id", projectIDStr)
		c.Next()
	}
}
