package services

import (
	"encoding/json"
	"fmt"
	"project-manager-backend/database"
	"project-manager-backend/models"
	"time"

	"github.com/gin-gonic/gin"
)

// TaskActivityService 任务活动记录服务
type TaskActivityService struct{}

// NewTaskActivityService 创建任务活动记录服务
func NewTaskActivityService() *TaskActivityService {
	return &TaskActivityService{}
}

// ActivityType 活动类型常量
const (
	ActivityTypeCreated      = "created"
	ActivityTypeUpdated      = "updated"
	ActivityTypeMoved        = "moved"
	ActivityTypeAssigned     = "assigned"
	ActivityTypeUnassigned   = "unassigned"
	ActivityTypeCompleted    = "completed"
	ActivityTypeReopened     = "reopened"
	ActivityTypeDeleted      = "deleted"
	ActivityTypeCommentAdded = "comment_added"
)

// LogTaskActivity 记录任务活动
func (s *TaskActivityService) LogTaskActivity(
	taskID, userID, projectID uint,
	actionType, description, fieldName, oldValue, newValue string,
	metadata map[string]interface{},
	c *gin.Context,
) error {
	// 获取客户端信息
	ipAddress := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")

	// 序列化元数据
	var metadataJSON string
	if metadata != nil {
		if data, err := json.Marshal(metadata); err == nil {
			metadataJSON = string(data)
		}
	}

	// 创建活动记录
	activity := &models.TaskActivity{
		TaskID:      taskID,
		UserID:      userID,
		ProjectID:   projectID,
		ActionType:  actionType,
		Description: description,
		FieldName:   fieldName,
		OldValue:    oldValue,
		NewValue:    newValue,
		Metadata:    metadataJSON,
		IPAddress:   ipAddress,
		UserAgent:   userAgent,
		CreatedAt:   time.Now(),
	}

	// 保存到数据库
	if err := database.DB.Create(activity).Error; err != nil {
		return fmt.Errorf("failed to log task activity: %v", err)
	}

	return nil
}

// LogTaskCreated 记录任务创建
func (s *TaskActivityService) LogTaskCreated(task *models.Task, userID uint, c *gin.Context) error {
	description := fmt.Sprintf("创建了任务 \"%s\"", task.Title)
	return s.LogTaskActivity(
		task.ID,
		userID,
		task.ProjectID,
		ActivityTypeCreated,
		description,
		"",
		"",
		"",
		nil,
		c,
	)
}

// translateStatusToChinese 将状态值转换为中文
func translateStatusToChinese(status string) string {
	statusMap := map[string]string{
		"todo":        "待办",
		"in_progress": "进行中",
		"review":      "审核中",
		"done":        "已完成",
		"cancelled":   "已取消",
	}
	if chinese, ok := statusMap[status]; ok {
		return chinese
	}
	return status
}

// translatePriorityToChinese 将优先级值转换为中文
func translatePriorityToChinese(priority string) string {
	priorityMap := map[string]string{
		"P1": "高",
		"P2": "中",
		"P3": "低",
	}
	if chinese, ok := priorityMap[priority]; ok {
		return chinese
	}
	return priority
}

// LogTaskUpdated 记录任务更新
func (s *TaskActivityService) LogTaskUpdated(
	taskID, userID, projectID uint,
	fieldName, oldValue, newValue string,
	c *gin.Context,
) error {
	var description string
	switch fieldName {
	case "title":
		description = fmt.Sprintf("将标题从 \"%s\" 修改为 \"%s\"", oldValue, newValue)
	case "description":
		description = "更新了任务描述"
	case "priority":
		oldValueCN := translatePriorityToChinese(oldValue)
		newValueCN := translatePriorityToChinese(newValue)
		description = fmt.Sprintf("将优先级从 \"%s\" 修改为 \"%s\"", oldValueCN, newValueCN)
	case "status":
		oldValueCN := translateStatusToChinese(oldValue)
		newValueCN := translateStatusToChinese(newValue)
		description = fmt.Sprintf("将状态从 \"%s\" 修改为 \"%s\"", oldValueCN, newValueCN)
	case "due_date":
		description = fmt.Sprintf("将截止日期从 \"%s\" 修改为 \"%s\"", oldValue, newValue)
	case "estimated_hours":
		description = fmt.Sprintf("将预估工时从 \"%s\" 修改为 \"%s\"", oldValue, newValue)
	default:
		description = fmt.Sprintf("更新了 %s", fieldName)
	}

	return s.LogTaskActivity(
		taskID,
		userID,
		projectID,
		ActivityTypeUpdated,
		description,
		fieldName,
		oldValue,
		newValue,
		nil,
		c,
	)
}

// LogTaskMoved 记录任务移动
func (s *TaskActivityService) LogTaskMoved(
	taskID, userID, projectID uint,
	oldStageID, newStageID uint,
	oldStageName, newStageName string,
	c *gin.Context,
) error {
	description := fmt.Sprintf("将任务从 \"%s\" 移动到 \"%s\"", oldStageName, newStageName)
	metadata := map[string]interface{}{
		"old_stage_id":   oldStageID,
		"new_stage_id":   newStageID,
		"old_stage_name": oldStageName,
		"new_stage_name": newStageName,
	}

	return s.LogTaskActivity(
		taskID,
		userID,
		projectID,
		ActivityTypeMoved,
		description,
		"stage_id",
		fmt.Sprintf("%d", oldStageID),
		fmt.Sprintf("%d", newStageID),
		metadata,
		c,
	)
}

// LogTaskAssigned 记录任务分配
func (s *TaskActivityService) LogTaskAssigned(
	taskID, userID, projectID uint,
	assigneeID uint,
	assigneeName string,
	c *gin.Context,
) error {
	description := fmt.Sprintf("将任务分配给 \"%s\"", assigneeName)
	metadata := map[string]interface{}{
		"assignee_id":   assigneeID,
		"assignee_name": assigneeName,
	}

	return s.LogTaskActivity(
		taskID,
		userID,
		projectID,
		ActivityTypeAssigned,
		description,
		"assignee_id",
		"",
		fmt.Sprintf("%d", assigneeID),
		metadata,
		c,
	)
}

// LogTaskUnassigned 记录任务取消分配
func (s *TaskActivityService) LogTaskUnassigned(
	taskID, userID, projectID uint,
	oldAssigneeName string,
	c *gin.Context,
) error {
	description := fmt.Sprintf("取消了 \"%s\" 的任务分配", oldAssigneeName)

	return s.LogTaskActivity(
		taskID,
		userID,
		projectID,
		ActivityTypeUnassigned,
		description,
		"assignee_id",
		oldAssigneeName,
		"",
		nil,
		c,
	)
}

// LogTaskCompleted 记录任务完成
func (s *TaskActivityService) LogTaskCompleted(
	taskID, userID, projectID uint,
	c *gin.Context,
) error {
	description := "将任务标记为已完成"

	return s.LogTaskActivity(
		taskID,
		userID,
		projectID,
		ActivityTypeCompleted,
		description,
		"status",
		"in_progress",
		"completed",
		nil,
		c,
	)
}

// LogTaskReopened 记录任务重新打开
func (s *TaskActivityService) LogTaskReopened(
	taskID, userID, projectID uint,
	c *gin.Context,
) error {
	description := "重新打开了任务"

	return s.LogTaskActivity(
		taskID,
		userID,
		projectID,
		ActivityTypeReopened,
		description,
		"status",
		"completed",
		"in_progress",
		nil,
		c,
	)
}

// LogTaskDeleted 记录任务删除
func (s *TaskActivityService) LogTaskDeleted(
	taskID, userID, projectID uint,
	taskTitle string,
	c *gin.Context,
) error {
	description := fmt.Sprintf("删除了任务 \"%s\"", taskTitle)

	return s.LogTaskActivity(
		taskID,
		userID,
		projectID,
		ActivityTypeDeleted,
		description,
		"",
		"",
		"",
		nil,
		c,
	)
}

// GetTaskActivities 获取任务活动记录
func (s *TaskActivityService) GetTaskActivities(
	taskID uint,
	limit, offset int,
) ([]models.TaskActivity, error) {
	var activities []models.TaskActivity

	query := database.DB.Where("task_id = ?", taskID).
		Preload("User").
		Order("created_at DESC")

	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}

	if err := query.Find(&activities).Error; err != nil {
		return nil, fmt.Errorf("failed to get task activities: %v", err)
	}

	return activities, nil
}

// GetProjectActivities 获取项目活动记录
func (s *TaskActivityService) GetProjectActivities(
	projectID uint,
	limit, offset int,
) ([]models.TaskActivity, error) {
	var activities []models.TaskActivity

	query := database.DB.Where("project_id = ?", projectID).
		Preload("User").
		Preload("Task").
		Order("created_at DESC")

	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}

	if err := query.Find(&activities).Error; err != nil {
		return nil, fmt.Errorf("failed to get project activities: %v", err)
	}

	return activities, nil
}

// GetUserActivities 获取用户活动记录
func (s *TaskActivityService) GetUserActivities(
	userID uint,
	limit, offset int,
) ([]models.TaskActivity, error) {
	var activities []models.TaskActivity

	query := database.DB.Where("user_id = ?", userID).
		Preload("Task").
		Preload("Project").
		Order("created_at DESC")

	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}

	if err := query.Find(&activities).Error; err != nil {
		return nil, fmt.Errorf("failed to get user activities: %v", err)
	}

	return activities, nil
}

// GetActivityStats 获取活动统计
func (s *TaskActivityService) GetActivityStats(
	projectID uint,
	startDate, endDate time.Time,
) (map[string]interface{}, error) {
	var stats struct {
		TotalActivities int64 `json:"total_activities"`
		CreatedTasks    int64 `json:"created_tasks"`
		UpdatedTasks    int64 `json:"updated_tasks"`
		MovedTasks      int64 `json:"moved_tasks"`
		CompletedTasks  int64 `json:"completed_tasks"`
	}

	baseQuery := database.DB.Model(&models.TaskActivity{}).
		Where("project_id = ? AND created_at BETWEEN ? AND ?", projectID, startDate, endDate)

	// 总活动数
	if err := baseQuery.Count(&stats.TotalActivities).Error; err != nil {
		return nil, fmt.Errorf("failed to count total activities: %v", err)
	}

	// 创建任务数
	if err := baseQuery.Where("action_type = ?", ActivityTypeCreated).Count(&stats.CreatedTasks).Error; err != nil {
		return nil, fmt.Errorf("failed to count created tasks: %v", err)
	}

	// 更新任务数
	if err := baseQuery.Where("action_type = ?", ActivityTypeUpdated).Count(&stats.UpdatedTasks).Error; err != nil {
		return nil, fmt.Errorf("failed to count updated tasks: %v", err)
	}

	// 移动任务数
	if err := baseQuery.Where("action_type = ?", ActivityTypeMoved).Count(&stats.MovedTasks).Error; err != nil {
		return nil, fmt.Errorf("failed to count moved tasks: %v", err)
	}

	// 完成任务数
	if err := baseQuery.Where("action_type = ?", ActivityTypeCompleted).Count(&stats.CompletedTasks).Error; err != nil {
		return nil, fmt.Errorf("failed to count completed tasks: %v", err)
	}

	result := map[string]interface{}{
		"total_activities": stats.TotalActivities,
		"created_tasks":    stats.CreatedTasks,
		"updated_tasks":    stats.UpdatedTasks,
		"moved_tasks":      stats.MovedTasks,
		"completed_tasks":  stats.CompletedTasks,
	}

	return result, nil
}
