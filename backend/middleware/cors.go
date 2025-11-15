package middleware

import (
	"project-manager-backend/config"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// CORSMiddleware CORS跨域中间件
func CORSMiddleware() gin.HandlerFunc {
	config := config.LoadConfig()
	
	corsConfig := cors.DefaultConfig()
	corsConfig.AllowOrigins = []string{config.CORS.Origin}
	corsConfig.AllowMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}
	corsConfig.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization"}
	corsConfig.AllowCredentials = true
	
	return cors.New(corsConfig)
}
