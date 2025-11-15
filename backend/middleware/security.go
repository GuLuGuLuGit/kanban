package middleware

import (
	"project-manager-backend/config"

	"github.com/gin-gonic/gin"
)

// SecurityMiddleware 安全响应头中间件
func SecurityMiddleware() gin.HandlerFunc {
	cfg := config.LoadConfig()

	return gin.HandlerFunc(func(c *gin.Context) {
		// X-Frame-Options: 防止点击劫持攻击
		c.Header("X-Frame-Options", "DENY")

		// X-Content-Type-Options: 防止MIME类型嗅探
		c.Header("X-Content-Type-Options", "nosniff")

		// X-XSS-Protection: 启用浏览器的XSS过滤
		c.Header("X-XSS-Protection", "1; mode=block")

		// Referrer-Policy: 控制referrer信息的传递
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")

		// Permissions-Policy: 限制浏览器功能的使用
		c.Header("Permissions-Policy", "geolocation=(), microphone=(), camera=()")

		// Strict-Transport-Security (HSTS): 强制使用HTTPS（如果使用HTTPS）
		// 注意：如果站点不使用HTTPS，不要设置此头
		if cfg.Server.Mode == "release" {
			c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		}

		// Content-Security-Policy: 内容安全策略（可根据实际需求调整）
		if cfg.Server.Mode == "release" {
			c.Header("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self';")
		}

		c.Next()
	})
}
