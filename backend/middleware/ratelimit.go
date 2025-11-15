package middleware

import (
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

// 简单的速率限制器（内存实现）
// 生产环境建议使用 Redis 实现分布式限流
var limiter *rate.Limiter

func init() {
	// 允许每秒10个请求，突发20个
	// 生产环境可以通过环境变量配置
	limiter = rate.NewLimiter(rate.Limit(10), 20)
}

// RateLimitMiddleware 请求速率限制中间件
func RateLimitMiddleware() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		// 创建带有超时的上下文
		ctx := c.Request.Context()

		// 尝试获取令牌
		err := limiter.WaitN(ctx, 1)
		if err != nil {
			c.AbortWithStatusJSON(429, gin.H{
				"code":    429,
				"message": "请求过于频繁，请稍后再试",
			})
			return
		}

		c.Next()
	})
}

// AuthRateLimitMiddleware 认证接口专用的速率限制
// 更严格的限制以防止暴力破解
var authLimiter *rate.Limiter

func init() {
	// 认证接口：每秒5个请求，突发10个
	authLimiter = rate.NewLimiter(rate.Limit(5), 10)
}

// AuthRateLimitMiddleware 认证接口速率限制
func AuthRateLimitMiddleware() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		// 创建带有超时的reservation
		reservation := authLimiter.Reserve()
		if !reservation.OK() {
			c.AbortWithStatusJSON(429, gin.H{
				"code":    429,
				"message": "请求过于频繁，请稍后再试",
			})
			return
		}

		// 等待到允许的时间
		delay := reservation.Delay()
		if delay > 0 {
			time.Sleep(delay)
		}

		c.Next()
	})
}
