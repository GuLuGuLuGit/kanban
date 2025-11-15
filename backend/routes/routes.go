package routes

import (
	"project-manager-backend/config"
	"project-manager-backend/database"
	"project-manager-backend/handlers"
	"project-manager-backend/middleware"
	"project-manager-backend/models"
	"time"

	"github.com/gin-gonic/gin"
)

// SetupRoutes 设置路由
func SetupRoutes(cfg *config.Config) *gin.Engine {
	r := gin.Default()

	// 中间件
	r.Use(middleware.CORSMiddleware())
	r.Use(middleware.SecurityMiddleware())
	r.Use(middleware.RateLimitMiddleware())

	// 认证路由（无需JWT验证，但需要速率限制）
	auth := r.Group("/api/auth")
	auth.Use(middleware.AuthRateLimitMiddleware())
	{
		authHandler := &handlers.AuthHandler{}
		auth.POST("/register", authHandler.Register)
		auth.POST("/login", authHandler.Login)
	}

	// 健康检查路由（无需认证）
	r.GET("/api/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":    "ok",
			"message":   "服务正常运行",
			"timestamp": time.Now().Format(time.RFC3339),
		})
	})

	// 数据库连接检查路由（无需认证）
	r.GET("/api/health/database", func(c *gin.Context) {
		// 测试数据库连接
		if database.DB == nil {
			c.JSON(500, gin.H{
				"status":  "error",
				"message": "数据库连接未初始化",
			})
			return
		}

		// 测试数据库查询
		var count int64
		if err := database.DB.Model(&models.Task{}).Count(&count).Error; err != nil {
			c.JSON(500, gin.H{
				"status":  "error",
				"message": "数据库查询失败: " + err.Error(),
			})
			return
		}

		c.JSON(200, gin.H{
			"status":     "ok",
			"message":    "数据库连接正常",
			"task_count": count,
			"timestamp":  time.Now().Format(time.RFC3339),
		})
	})

	// 需要认证的API路由
	api := r.Group("/api")
	api.Use(middleware.AuthMiddleware())
	{
		// 用户相关路由
		users := api.Group("/users")
		{
			userHandler := &handlers.UserHandler{}
			users.POST("/search", userHandler.SearchUsers) // 搜索用户
			users.GET("", userHandler.GetUsers)            // 获取用户列表（管理员）
			users.POST("", userHandler.CreateUser)         // 创建用户（管理员）
			users.PUT("/:id", userHandler.UpdateUser)      // 更新用户（管理员）
			users.DELETE("/:id", userHandler.DeleteUser)   // 删除用户（管理员）
		}

		// 用户在线状态相关路由
		userStatus := api.Group("/user-status")
		{
			userStatusHandler := &handlers.UserOnlineStatusHandler{}
			userStatus.PUT("/online", userStatusHandler.UpdateUserOnlineStatus) // 更新在线状态
			userStatus.GET("/online", userStatusHandler.GetOnlineUsers)         // 获取在线用户列表
			userStatus.GET("/my", userStatusHandler.GetUserOnlineStatus)        // 获取我的在线状态
			userStatus.PUT("/offline", userStatusHandler.SetUserOffline)        // 设置离线状态

			// 管理员专用路由
			adminStatus := userStatus.Group("")
			adminStatus.Use(middleware.AdminMiddleware())
			{
				adminStatus.DELETE("/cleanup", userStatusHandler.CleanupOfflineUsers) // 清理离线用户
				adminStatus.GET("/stats", userStatusHandler.GetUserActivityStats)     // 获取用户活动统计
			}
		}

		// 项目相关路由
		projects := api.Group("/projects")
		{
			projectHandler := &handlers.ProjectHandler{}
			projects.GET("", projectHandler.GetProjects)                               // 获取项目列表
			projects.POST("", projectHandler.CreateProject)                            // 创建项目
			projects.GET("/:id", projectHandler.GetProject)                            // 获取项目详情
			projects.PUT("/:id", projectHandler.UpdateProject)                         // 更新项目
			projects.DELETE("/:id", projectHandler.DeleteProject)                      // 删除项目
			projects.GET("/:id/collaborators", projectHandler.GetProjectCollaborators) // 获取项目协作人员
		}

		// 协作人员相关路由
		collaborators := api.Group("/collaborators")
		{
			projectHandler := &handlers.ProjectHandler{}
			collaboratorHandler := &handlers.CollaboratorHandler{}
			collaborators.GET("/available", projectHandler.GetAvailableCollaborators)                      // 获取可用的协作人员列表
			collaborators.GET("/my", collaboratorHandler.GetUserCollaborators)                             // 获取我的协作人员
			collaborators.GET("/:id/memberships", collaboratorHandler.CheckCollaboratorProjectMemberships) // 检查协作人员项目成员关系
			collaborators.POST("", collaboratorHandler.AddCollaborator)                                    // 添加协作人员
			collaborators.DELETE("/:id", collaboratorHandler.RemoveCollaborator)                           // 移除协作人员
		}

		// 项目成员管理路由（独立的路由组）
		projectMembers := api.Group("/project-members")
		projectMembers.Use(middleware.AuthMiddleware())
		{
			memberHandler := &handlers.MemberHandler{}
			projectMembers.GET("/:projectId", memberHandler.GetProjectMembers)              // 获取项目成员
			projectMembers.POST("/:projectId", memberHandler.AddProjectMember)              // 添加单个成员
			projectMembers.POST("/:projectId/batch", memberHandler.BatchAddMembers)         // 批量添加成员
			projectMembers.PUT("/:projectId/:userId/role", memberHandler.UpdateMemberRole)  // 更新成员角色
			projectMembers.DELETE("/:projectId/:userId", memberHandler.RemoveProjectMember) // 移除成员
		}

		// 阶段相关路由
		stages := api.Group("/stages")
		{
			stageHandler := &handlers.StageHandler{}
			stages.POST("", stageHandler.CreateStage)
			stages.PUT("/:id", stageHandler.UpdateStage)
			stages.DELETE("/:id", stageHandler.DeleteStage)
			stages.POST("/reorder", stageHandler.ReorderStages)
		}

		// 项目阶段相关路由（独立的路由组）
		projectStages := api.Group("/project-stages")
		projectStages.Use(middleware.AuthMiddleware())
		{
			stageHandler := &handlers.StageHandler{}
			projectStages.GET("/:projectId", stageHandler.GetProjectStages)
		}

		// 任务相关路由
		tasks := api.Group("/tasks")
		{
			taskHandler := &handlers.TaskHandler{
				ActivityService: handlers.NewTaskActivityHandler().ActivityService,
			}
			tasks.GET("", taskHandler.GetTasks)
			tasks.POST("", taskHandler.CreateTask)
			tasks.PUT("/:id", taskHandler.UpdateTask)
			tasks.DELETE("/:id", taskHandler.DeleteTask)
			tasks.PATCH("/:id/move", taskHandler.MoveTask)
			tasks.POST("/reorder", taskHandler.ReorderTasks)
		}

		// 项目任务相关路由（独立的路由组）
		projectTasks := api.Group("/project-tasks")
		projectTasks.Use(middleware.AuthMiddleware())
		{
			taskHandler := &handlers.TaskHandler{}
			projectTasks.GET("/:projectId", taskHandler.GetTasks)
			projectTasks.GET("/:projectId/completed-stats", taskHandler.GetCompletedTasksStats)
		}

		// 任务评论路由（独立的路由组）
		taskComments := api.Group("/task-comments")
		taskComments.Use(middleware.AuthMiddleware())
		{
			commentHandler := &handlers.CommentHandler{}
			taskComments.GET("/:taskId", commentHandler.GetTaskComments)
			taskComments.POST("/:taskId", commentHandler.CreateComment)
			taskComments.DELETE("/:taskId/:commentId", commentHandler.DeleteTaskComment)
		}

		// 任务活动记录路由
		taskActivities := api.Group("/task-activities")
		{
			activityHandler := handlers.NewTaskActivityHandler()
			taskActivities.GET("/task/:taskId", activityHandler.GetTaskActivities)            // 获取任务活动记录
			taskActivities.GET("/project/:projectId", activityHandler.GetProjectActivities)   // 获取项目活动记录
			taskActivities.GET("/user/:userId", activityHandler.GetUserActivities)            // 获取用户活动记录
			taskActivities.GET("/user", activityHandler.GetUserActivities)                    // 获取当前用户活动记录
			taskActivities.GET("/project/:projectId/stats", activityHandler.GetActivityStats) // 获取活动统计
		}

		// 评论相关路由
		comments := api.Group("/comments")
		{
			commentHandler := &handlers.CommentHandler{}
			comments.PUT("/:id", commentHandler.UpdateComment)
			comments.DELETE("/:id", commentHandler.DeleteComment)
		}

		// 统计相关路由
		analytics := api.Group("/analytics")
		{
			analyticsHandler := &handlers.AnalyticsHandler{}
			analytics.GET("/project-stats/:projectId", analyticsHandler.GetProjectStats) // 获取项目统计
			analytics.GET("/project-tasks/:projectId", analyticsHandler.GetTaskStats)    // 获取任务统计
			analytics.GET("/project-stages/:projectId", analyticsHandler.GetStageStats)  // 获取阶段统计
			analytics.GET("/project-trend/:projectId", analyticsHandler.GetTaskTrend)    // 获取任务趋势
			analytics.GET("/users", analyticsHandler.GetUserStats)                       // 获取用户统计（仅管理员）
		}

	}

	return r
}
