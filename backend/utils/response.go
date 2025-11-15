package utils

import (
	"log"
	"net/http"
	"project-manager-backend/config"

	"github.com/gin-gonic/gin"
)

// Response 统一响应结构
type Response struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// Success 成功响应
func Success(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, Response{
		Code:    200,
		Message: "success",
		Data:    data,
	})
}

// Error 错误响应
func Error(c *gin.Context, code int, message string) {
	c.JSON(code, Response{
		Code:    code,
		Message: message,
	})
}

// BadRequest 400错误
func BadRequest(c *gin.Context, message string) {
	Error(c, http.StatusBadRequest, message)
}

// Unauthorized 401错误
func Unauthorized(c *gin.Context, message string) {
	Error(c, http.StatusUnauthorized, message)
}

// Forbidden 403错误
func Forbidden(c *gin.Context, message string) {
	Error(c, http.StatusForbidden, message)
}

// NotFound 404错误
func NotFound(c *gin.Context, message string) {
	Error(c, http.StatusNotFound, message)
}

// InternalServerError 500错误
func InternalServerError(c *gin.Context, message string) {
	Error(c, http.StatusInternalServerError, message)
}

// InternalServerErrorSafe 安全的500错误响应（生产环境不暴露详细错误信息）
func InternalServerErrorSafe(c *gin.Context, safeMessage string, internalError error) {
	cfg := config.LoadConfig()

	// 记录详细错误到日志
	if internalError != nil {
		log.Printf("Internal error: %v", internalError)
	}

	// 生产环境返回通用错误信息，开发环境返回详细错误
	var message string
	if cfg.Server.Mode == "release" {
		message = safeMessage
	} else {
		if internalError != nil {
			message = safeMessage + ": " + internalError.Error()
		} else {
			message = safeMessage
		}
	}

	Error(c, http.StatusInternalServerError, message)
}
