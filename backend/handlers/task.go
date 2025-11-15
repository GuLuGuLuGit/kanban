package handlers

import (
	"log"
	"project-manager-backend/database"
	"project-manager-backend/models"
	"project-manager-backend/services"
	"project-manager-backend/utils"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// TaskHandler 任务处理器
type TaskHandler struct {
	ActivityService *services.TaskActivityService // 任务活动记录服务
}

// CreateTaskRequest 创建任务请求
type CreateTaskRequest struct {
	StageID        uint     `json:"stage_id" binding:"required"`
	ProjectID      uint     `json:"project_id" binding:"required"`
	Title          string   `json:"title" binding:"required"`
	Description    string   `json:"description"`
	Priority       string   `json:"priority"`
	AssigneeID     *uint    `json:"assignee_id"`
	DueDate        string   `json:"due_date"`
	Status         string   `json:"status"`
	EstimatedHours *float64 `json:"estimated_hours"`
}

// UpdateTaskRequest 更新任务请求
type UpdateTaskRequest struct {
	Title          string   `json:"title"`
	Description    string   `json:"description"`
	Priority       string   `json:"priority"`
	Status         string   `json:"status"`
	AssigneeID     *uint    `json:"assignee_id"`
	DueDate        string   `json:"due_date"`
	EstimatedHours *float64 `json:"estimated_hours"`
}

// MoveTaskRequest 移动任务请求
type MoveTaskRequest struct {
	NewStageID  uint `json:"new_stage_id" binding:"required"`
	NewOrder    int  `json:"new_order"`
	NewPosition int  `json:"new_position"`
}

// ReorderTasksRequest 重新排序任务请求
type ReorderTasksRequest struct {
	TaskOrders []TaskOrder `json:"task_orders" binding:"required"`
}

// TaskOrder 任务排序
type TaskOrder struct {
	TaskID   uint `json:"task_id" binding:"required"`
	Position int  `json:"position" binding:"required"`
}

// CreateTask 创建任务
func (h *TaskHandler) CreateTask(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)

	var req CreateTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "Invalid request data: "+err.Error())
		return
	}

	// 验证必填字段
	if req.ProjectID == 0 {
		utils.BadRequest(c, "Project ID is required and cannot be 0")
		return
	}
	if req.StageID == 0 {
		utils.BadRequest(c, "Stage ID is required and cannot be 0")
		return
	}
	if req.Title == "" {
		utils.BadRequest(c, "Title is required")
		return
	}

	// 单机版：所有登录用户都可以创建任务（不需要检查成员关系）
	// 在单机版中，只要用户已通过JWT认证，就可以执行创建任务操作
	// userID 会用于设置任务的 CreatedBy 字段和记录活动日志
	
	// 如果需要保留权限检查，可以取消下面的注释：
	// if !utils.CanManageTasks(userID, req.ProjectID) {
	// 	utils.Forbidden(c, "Insufficient permissions to create task")
	// 	return
	// }

	// 检查阶段是否存在
	var stage models.Stage
	if err := database.DB.Where("id = ? AND project_id = ?", req.StageID, req.ProjectID).First(&stage).Error; err != nil {
		utils.NotFound(c, "Stage not found")
		return
	}

	// 检查阶段是否允许创建任务
	if !stage.AllowTaskCreation {
		utils.BadRequest(c, "Task creation is not allowed in this stage")
		return
	}

	// 检查阶段任务数量限制
	var taskCount int64
	if err := database.DB.Model(&models.Task{}).Where("stage_id = ?", req.StageID).Count(&taskCount).Error; err != nil {
		utils.InternalServerError(c, "Failed to check stage task count")
		return
	}

	if stage.MaxTasks > 0 && int(taskCount) >= stage.MaxTasks {
		utils.BadRequest(c, "Stage has reached maximum task limit")
		return
	}

	// 解析截止日期
	var dueDate *time.Time
	if req.DueDate != "" {
		parsedDate, err := time.Parse("2006-01-02", req.DueDate)
		if err != nil {
			utils.BadRequest(c, "Invalid due date format")
			return
		}
		dueDate = &parsedDate
	}

	// 获取当前阶段的最大位置
	var maxPosition int
	database.DB.Model(&models.Task{}).Where("stage_id = ?", req.StageID).Select("COALESCE(MAX(position), 0)").Scan(&maxPosition)

	// 创建任务
	task := models.Task{
		StageID:        req.StageID,
		ProjectID:      req.ProjectID,
		Title:          req.Title,
		Description:    req.Description,
		Priority:       req.Priority,
		AssigneeID:     req.AssigneeID,
		DueDate:        dueDate,
		EstimatedHours: req.EstimatedHours,
		Status:         req.Status,
		Position:       maxPosition + 1, // 设置位置为当前最大值+1
		CreatedBy:      userID,          // 设置创建者ID
	}
	if task.Priority == "" {
		task.Priority = "P2" // 默认优先级
	}

	if err := database.DB.Create(&task).Error; err != nil {
		utils.InternalServerError(c, "Failed to create task: "+err.Error())
		return
	}

	// 验证任务ID是否被正确设置
	if task.ID == 0 {
		utils.InternalServerError(c, "Failed to get task ID after creation. Please check database table structure.")
		return
	}

	// 记录任务创建活动
	if h.ActivityService != nil {
		if err := h.ActivityService.LogTaskCreated(&task, userID, c); err != nil {
			log.Printf("Failed to log task creation activity: %v", err)
		}
	}

	// 重新加载任务信息
	if err := database.DB.Preload("Stage").Preload("Project").Preload("Assignee").First(&task, task.ID).Error; err != nil {
		utils.InternalServerError(c, "Failed to reload task data")
		return
	}

	utils.Success(c, gin.H{
		"task":    task,
		"message": "Task created successfully",
	})
}

// GetTasks 获取任务列表
func (h *TaskHandler) GetTasks(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	projectID, err := strconv.ParseUint(c.Param("projectId"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid project ID")
		return
	}

	// 验证项目ID是否有效
	if projectID == 0 {
		utils.BadRequest(c, "Invalid project ID: project ID cannot be 0")
		return
	}

	// 检查项目是否存在
	var project models.Project
	if err := database.DB.Where("id = ? AND status = ?", projectID, models.ProjectStatusActive).First(&project).Error; err != nil {
		utils.NotFound(c, "Project not found")
		return
	}

	// 单机版：检查用户是否是项目成员即可
	if !utils.CheckProjectMember(userID, uint(projectID)) && !utils.CheckProjectOwner(userID, uint(projectID)) {
		utils.Forbidden(c, "Access denied to this project")
		return
	}

	// 获取查询参数
	stageID := c.Query("stage_id")
	assigneeID := c.Query("assignee_id")
	priority := c.Query("priority")
	status := c.Query("status")

	// 构建查询
	query := database.DB.Preload("Stage").Preload("Project").Preload("Assignee").
		Where("project_id = ?", projectID)

	if stageID != "" {
		query = query.Where("stage_id = ?", stageID)
	}
	if assigneeID != "" {
		query = query.Where("assignee_id = ?", assigneeID)
	}
	if priority != "" {
		query = query.Where("priority = ?", priority)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}

	// 获取任务列表，按阶段和位置排序
	var tasks []models.Task
	if err := query.Order("stage_id ASC, position ASC").Find(&tasks).Error; err != nil {
		utils.InternalServerError(c, "Failed to fetch tasks")
		return
	}

	utils.Success(c, gin.H{
		"project_id": projectID,
		"tasks":      tasks,
		"total":      len(tasks),
	})
}

// UpdateTask 更新任务
func (h *TaskHandler) UpdateTask(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	taskID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid task ID")
		return
	}

	// 查找任务
	var task models.Task
	if err := database.DB.Preload("Stage").Preload("Project").First(&task, taskID).Error; err != nil {
		utils.NotFound(c, "Task not found")
		return
	}

	// 单机版：所有登录用户都可以更新任务（不需要检查成员关系）
	// 在单机版中，只要用户已通过JWT认证，就可以执行更新任务操作
	// userID 会用于记录任务更新活动日志
	
	// 如果需要保留权限检查，可以取消下面的注释：
	// if !utils.CanManageTasks(userID, task.ProjectID) {
	// 	utils.Forbidden(c, "Insufficient permissions to update task")
	// 	return
	// }

	var req UpdateTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "Invalid request data: "+err.Error())
		return
	}

	// 保存原始值用于活动记录
	originalTask := task

	// 更新字段
	updates := make(map[string]interface{})

	if req.Title != "" {
		updates["title"] = req.Title
	}
	if req.Description != "" {
		updates["description"] = req.Description
	}
	if req.Priority != "" {
		updates["priority"] = req.Priority
	}
	if req.Status != "" {
		updates["status"] = req.Status
	}
	if req.AssigneeID != nil {
		updates["assignee_id"] = req.AssigneeID
	}
	if req.DueDate != "" {
		parsedDate, err := time.Parse("2006-01-02", req.DueDate)
		if err != nil {
			utils.BadRequest(c, "Invalid due date format")
			return
		}
		updates["due_date"] = parsedDate
	}
	if req.EstimatedHours != nil {
		updates["estimated_hours"] = req.EstimatedHours
	}

	// 执行更新
	if len(updates) > 0 {
		if err := database.DB.Model(&task).Updates(updates).Error; err != nil {
			utils.InternalServerError(c, "Failed to update task")
			return
		}

		// 记录任务更新活动
		if h.ActivityService != nil {
			for field, newValue := range updates {
				var oldValue string
				switch field {
				case "title":
					oldValue = originalTask.Title
				case "description":
					oldValue = originalTask.Description
				case "priority":
					oldValue = originalTask.Priority
				case "status":
					oldValue = originalTask.Status
				case "assignee_id":
					if originalTask.AssigneeID != nil {
						oldValue = strconv.FormatUint(uint64(*originalTask.AssigneeID), 10)
					}
				case "due_date":
					if originalTask.DueDate != nil {
						oldValue = originalTask.DueDate.Format("2006-01-02")
					}
				case "estimated_hours":
					if originalTask.EstimatedHours != nil {
						oldValue = strconv.FormatFloat(*originalTask.EstimatedHours, 'f', 2, 64)
					}
				}

				var newValueStr string
				switch v := newValue.(type) {
				case string:
					newValueStr = v
				case *uint:
					if v != nil {
						newValueStr = strconv.FormatUint(uint64(*v), 10)
					}
				case time.Time:
					newValueStr = v.Format("2006-01-02")
				case *float64:
					if v != nil {
						newValueStr = strconv.FormatFloat(*v, 'f', 2, 64)
					}
				}

				if err := h.ActivityService.LogTaskUpdated(
					task.ID, userID, task.ProjectID,
					field, oldValue, newValueStr,
					c,
				); err != nil {
					log.Printf("Failed to log task update activity for field %s: %v", field, err)
				}
			}
		}
	}

	// 如果任务状态变为已完成，记录完成时间
	if req.Status == "done" {
		if err := database.DB.Model(&task).Update("completed_at", time.Now()).Error; err != nil {
			log.Printf("Failed to update completed_at for task %d: %v", taskID, err)
		}
	}

	// 重新加载任务信息
	if err := database.DB.Preload("Stage").Preload("Project").Preload("Assignee").First(&task, taskID).Error; err != nil {
		utils.InternalServerError(c, "Failed to reload task data")
		return
	}

	utils.Success(c, gin.H{
		"task":    task,
		"message": "Task updated successfully",
	})
}

// DeleteTask 删除任务
func (h *TaskHandler) DeleteTask(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	taskID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid task ID")
		return
	}

	// 查找任务
	var task models.Task
	if err := database.DB.Preload("Stage").Preload("Project").First(&task, taskID).Error; err != nil {
		utils.NotFound(c, "Task not found")
		return
	}

	// 单机版：所有登录用户都可以删除任务（不需要检查成员关系）
	// 在单机版中，只要用户已通过JWT认证，就可以执行删除任务操作
	// userID 会用于记录任务删除活动日志
	
	// 如果需要保留权限检查，可以取消下面的注释：
	// if !utils.CanManageTasks(userID, task.ProjectID) {
	// 	utils.Forbidden(c, "Insufficient permissions to delete task")
	// 	return
	// }

	// 检查阶段是否允许删除任务
	if !task.Stage.AllowTaskDeletion {
		utils.BadRequest(c, "Task deletion is not allowed in this stage")
		return
	}

	// 记录任务删除活动
	if h.ActivityService != nil {
		if err := h.ActivityService.LogTaskDeleted(
			task.ID, userID, task.ProjectID,
			task.Title,
			c,
		); err != nil {
			log.Printf("Failed to log task deletion activity: %v", err)
		}
	}

	// 删除任务
	if err := database.DB.Delete(&task).Error; err != nil {
		utils.InternalServerError(c, "Failed to delete task")
		return
	}

	utils.Success(c, gin.H{"message": "Task deleted successfully"})
}

// MoveTask 移动任务
func (h *TaskHandler) MoveTask(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	taskID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid task ID")
		return
	}

	log.Printf("🔗 URL参数解析 - 原始ID: %s, 解析后ID: %d", c.Param("id"), taskID)

	var req MoveTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "Invalid request data: "+err.Error())
		return
	}

	log.Printf("🎯 收到移动任务请求 - 任务ID: %d, 目标阶段ID: %d, 目标位置: %d", taskID, req.NewStageID, req.NewPosition)

	// 查找任务
	var task models.Task
	if err := database.DB.Preload("Stage").Preload("Project").First(&task, taskID).Error; err != nil {
		utils.NotFound(c, "Task not found")
		return
	}

	// 单机版：所有登录用户都可以移动任务（不需要检查成员关系）
	// 在单机版中，只要用户已通过JWT认证，就可以执行移动任务操作
	// userID 会用于记录任务移动活动日志
	
	// 如果需要保留权限检查，可以取消下面的注释：
	// if !utils.CanManageTasks(userID, task.ProjectID) {
	// 	utils.Forbidden(c, "Insufficient permissions to move task")
	// 	return
	// }

	// 检查目标阶段是否存在
	var newStage models.Stage
	log.Printf("🔍 查找目标阶段 - 阶段ID: %d, 项目ID: %d", req.NewStageID, task.ProjectID)
	if err := database.DB.Where("id = ? AND project_id = ?", req.NewStageID, task.ProjectID).First(&newStage).Error; err != nil {
		log.Printf("❌ 目标阶段不存在 - 阶段ID: %d, 项目ID: %d, 错误: %v", req.NewStageID, task.ProjectID, err)
		utils.NotFound(c, "Target stage not found")
		return
	}
	log.Printf("✅ 找到目标阶段 - 阶段名称: %s, ID: %d", newStage.Name, newStage.ID)

	// 检查目标阶段是否允许移动任务
	if !newStage.AllowTaskMovement {
		utils.BadRequest(c, "Task movement is not allowed to this stage")
		return
	}

	// 检查目标阶段任务数量限制
	if newStage.MaxTasks > 0 {
		var taskCount int64
		if err := database.DB.Model(&models.Task{}).Where("stage_id = ?", req.NewStageID).Count(&taskCount).Error; err != nil {
			utils.InternalServerError(c, "Failed to check target stage task count")
			return
		}

		if int(taskCount) >= newStage.MaxTasks {
			utils.BadRequest(c, "Target stage has reached maximum task limit")
			return
		}
	}

	// 保存移动前的StageID用于广播和活动记录
	oldStageID := task.StageID
	oldStageName := task.Stage.Name

	// 开始事务
	tx := database.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 处理任务位置逻辑
	newPosition := req.NewPosition
	log.Printf("🔄 移动任务位置处理 - 任务ID: %d, 目标阶段: %d, 指定位置: %d", taskID, req.NewStageID, req.NewPosition)
	log.Printf("🔄 请求参数详情 - NewStageID: %d (类型: %T), NewPosition: %d (类型: %T)", req.NewStageID, req.NewStageID, req.NewPosition, req.NewPosition)

	if newPosition < 0 {
		// 如果没有指定位置，获取目标阶段的最大位置+1
		var maxPosition int
		tx.Model(&models.Task{}).Where("stage_id = ?", req.NewStageID).Select("COALESCE(MAX(position), 0)").Scan(&maxPosition)
		newPosition = maxPosition + 1
		log.Printf("🔄 自动计算位置: %d (最大位置: %d)", newPosition, maxPosition)
	} else {
		// 如果指定了位置，需要调整目标阶段其他任务的位置
		// 将目标位置及之后的任务位置+1（使用 SQLite 兼容的 SQL）
		adjustSQL := "UPDATE tasks SET position = position + 1, updated_at = datetime('now') WHERE stage_id = ? AND position >= ?"
		adjustResult := tx.Exec(adjustSQL, req.NewStageID, newPosition)
		if adjustResult.Error != nil {
			log.Printf("❌ 调整其他任务位置失败: %v", adjustResult.Error)
		} else {
			log.Printf("🔄 调整了 %d 个任务的位置", adjustResult.RowsAffected)
		}
	}

	// 更新任务阶段和位置 - 使用明确的字段更新
	log.Printf("🔄 更新任务 - ID: %d, 新阶段: %d, 新位置: %d", taskID, req.NewStageID, newPosition)
	log.Printf("🔄 更新前任务状态 - 当前阶段: %d, 当前位置: %d", task.StageID, task.Position)

	// 使用原生SQL确保更新的原子性和可见性（SQLite 使用 datetime('now') 而不是 NOW()）
	updateSQL := "UPDATE tasks SET stage_id = ?, position = ?, updated_at = datetime('now') WHERE id = ?"
	result := tx.Exec(updateSQL, req.NewStageID, newPosition, taskID)

	if result.Error != nil {
		log.Printf("❌ 更新任务失败: %v", result.Error)
		tx.Rollback()
		utils.InternalServerError(c, "Failed to move task: "+result.Error.Error())
		return
	}

	// 检查是否真的更新了行
	if result.RowsAffected == 0 {
		log.Printf("⚠️ 警告：没有行被更新！可能的原因：")
		log.Printf("   - 任务ID不存在: %d", taskID)
		log.Printf("   - 数据库约束问题")
		log.Printf("   - 并发更新冲突")

		// 尝试直接查询任务是否存在
		var checkTask models.Task
		if err := tx.First(&checkTask, taskID).Error; err != nil {
			log.Printf("❌ 任务不存在: %v", err)
			tx.Rollback()
			utils.NotFound(c, "Task not found")
			return
		}
		log.Printf("🔍 任务存在，当前数据: StageID=%d, Position=%d", checkTask.StageID, checkTask.Position)

		// 如果任务存在但没有更新，可能是数据没有变化
		if checkTask.StageID == req.NewStageID && checkTask.Position == newPosition {
			log.Printf("ℹ️ 数据没有变化，跳过更新")
		} else {
			log.Printf("❌ 数据更新失败，可能存在并发问题")
			tx.Rollback()
			utils.InternalServerError(c, "Task update failed due to concurrent modification")
			return
		}
	} else {
		log.Printf("✅ 成功更新了 %d 行", result.RowsAffected)
	}

	// 提交事务
	if err := tx.Commit().Error; err != nil {
		log.Printf("❌ 提交事务失败: %v", err)
		utils.InternalServerError(c, "Failed to commit transaction")
		return
	}

	log.Printf("✅ 任务移动事务提交成功 - 任务ID: %d", taskID)

	// 重新加载任务信息 - 使用新的变量避免GORM缓存问题
	var reloadedTask models.Task

	// 强制从数据库重新读取数据，避免缓存
	log.Printf("🔄 强制从数据库重新加载任务数据 - 任务ID: %d", taskID)
	if err := database.DB.Set("gorm:query_hint", "/*+ USE_INDEX(tasks, PRIMARY) */").
		Preload("Stage").Preload("Project").Preload("Assignee").
		First(&reloadedTask, taskID).Error; err != nil {
		log.Printf("❌ 重新加载任务数据失败: %v", err)
		utils.InternalServerError(c, "Failed to reload task data")
		return
	}

	// 使用重新加载的任务数据
	task = reloadedTask

	// 验证重新加载的数据是否正确
	log.Printf("🔍 重新加载的任务数据验证 - 任务ID: %d, 当前阶段: %d, 期望阶段: %d",
		task.ID, task.StageID, req.NewStageID)

	if task.StageID != req.NewStageID {
		log.Printf("❌ 警告：重新加载的任务数据不正确！数据库更新可能失败")
		log.Printf("❌ 任务 %d 的阶段应该是 %d，但实际是 %d", task.ID, req.NewStageID, task.StageID)

		// 额外验证：直接查询数据库中的原始数据
		var dbStageID uint
		var dbPosition int
		err := database.DB.Raw("SELECT stage_id, position FROM tasks WHERE id = ?", taskID).
			Row().Scan(&dbStageID, &dbPosition)
		if err != nil {
			log.Printf("❌ 直接数据库查询失败: %v", err)
			utils.InternalServerError(c, "Failed to verify task update")
			return
		} else {
			log.Printf("🔍 直接数据库查询结果 - StageID: %d, Position: %d", dbStageID, dbPosition)
			if dbStageID == req.NewStageID && dbPosition == newPosition {
				log.Printf("✅ 直接查询证实数据库已正确更新，使用数据库数据")
				// 使用数据库中的实际数据
				task.StageID = dbStageID
				task.Position = dbPosition
			} else {
				log.Printf("❌ 直接查询确认数据库更新失败")
				utils.InternalServerError(c, "Task move verification failed")
				return
			}
		}
	} else {
		log.Printf("✅ 重新加载的任务数据验证通过")
	}

	// 记录任务移动活动
	if h.ActivityService != nil {
		if err := h.ActivityService.LogTaskMoved(
			task.ID, userID, task.ProjectID,
			oldStageID, req.NewStageID,
			oldStageName, newStage.Name,
			c,
		); err != nil {
			log.Printf("Failed to log task move activity: %v", err)
		}
	}

	utils.Success(c, gin.H{
		"task":    task,
		"message": "Task moved successfully",
	})
}

// ReorderTasks 重新排序任务
func (h *TaskHandler) ReorderTasks(c *gin.Context) {

	var req ReorderTasksRequest
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

	// 批量更新任务位置
	for _, taskOrder := range req.TaskOrders {
		if err := tx.Model(&models.Task{}).Where("id = ?", taskOrder.TaskID).
			Update("position", taskOrder.Position).Error; err != nil {
			tx.Rollback()
			utils.InternalServerError(c, "Failed to reorder tasks")
			return
		}
	}

	// 提交事务
	if err := tx.Commit().Error; err != nil {
		utils.InternalServerError(c, "Failed to commit transaction")
		return
	}

	utils.Success(c, gin.H{
		"message": "Tasks reordered successfully",
	})
}

// GetCompletedTasksStats 获取已完成任务统计
func (h *TaskHandler) GetCompletedTasksStats(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	projectID, err := strconv.ParseUint(c.Param("projectId"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "Invalid project ID")
		return
	}

	// 单机版：检查用户是否是项目成员即可
	if !utils.CheckProjectMember(userID, uint(projectID)) && !utils.CheckProjectOwner(userID, uint(projectID)) {
		utils.Forbidden(c, "Access denied to this project")
		return
	}

	// 获取已完成任务数量
	var completedCount int64
	if err := database.DB.Model(&models.Task{}).
		Where("project_id = ? AND status = ?", projectID, "done").
		Count(&completedCount).Error; err != nil {
		utils.InternalServerError(c, "Failed to get completed tasks count")
		return
	}

	// 获取最近完成的任务（最近7天）
	var recentCompletedCount int64
	sevenDaysAgo := time.Now().AddDate(0, 0, -7)
	if err := database.DB.Model(&models.Task{}).
		Where("project_id = ? AND status = ? AND completed_at >= ?", projectID, "done", sevenDaysAgo).
		Count(&recentCompletedCount).Error; err != nil {
		utils.InternalServerError(c, "Failed to get recent completed tasks count")
		return
	}

	utils.Success(c, gin.H{
		"project_id":             projectID,
		"completed_count":        completedCount,
		"recent_completed_count": recentCompletedCount,
		"total_tasks":            completedCount, // 这里可以添加总任务数
	})
}
