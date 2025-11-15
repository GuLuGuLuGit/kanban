package database

import (
	"log"
	"project-manager-backend/models"
	"time"

	"golang.org/x/crypto/bcrypt"
)

// SeedDatabase 初始化种子数据
func SeedDatabase() {
	// 检查是否已存在示例项目
	var existingProject models.Project
	if err := DB.Where("name = ?", "示例项目：网站开发").First(&existingProject).Error; err == nil {
		log.Println("示例项目已存在，跳过种子数据初始化")
		return
	}

	log.Println("开始初始化种子数据...")

	// 创建系统用户（用于示例项目）
	systemUser := models.User{
		Username:     "system",
		Email:        "system@example.com",
		PasswordHash: generateSystemPasswordHash(),
		Role:         models.RoleAdmin,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	// 检查系统用户是否已存在
	var existingUser models.User
	if DB.Where("username = ? OR email = ?", "system", "system@example.com").First(&existingUser).RecordNotFound() {
		// 创建系统用户
		if err := DB.Create(&systemUser).Error; err != nil {
			log.Printf("创建系统用户失败: %v", err)
			return
		}
		log.Println("✓ 系统用户创建成功")
	} else {
		systemUser = existingUser
		log.Println("✓ 使用现有系统用户")
	}

	// 创建示例项目
	now := time.Now()
	project := models.Project{
		Name:        "示例项目：网站开发",
		Description: "这是一个示例项目，用于演示项目管理系统的功能。包含多个阶段和任务，帮助您快速了解系统的使用方法。",
		OwnerID:     systemUser.ID,
		Status:      models.ProjectStatusActive,
		StartDate:   &now,
		CreatedBy:   systemUser.ID,
		Version:     1,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := DB.Create(&project).Error; err != nil {
		log.Printf("创建项目失败: %v", err)
		return
	}
	log.Printf("✓ 示例项目创建成功 (ID: %d)", project.ID)

	// 创建项目成员（系统用户作为所有者）
	ownerMember := models.ProjectMember{
		ProjectID: project.ID,
		UserID:    systemUser.ID,
		Role:      models.ProjectMemberRoleOwner,
		Version:   1,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	if err := DB.Create(&ownerMember).Error; err != nil {
		log.Printf("创建项目成员失败: %v", err)
		return
	}

	// 创建阶段
	stages := []models.Stage{
		{
			ProjectID:           project.ID,
			Name:                "待开始",
			Description:         "待处理的任务",
			Color:               "#3B82F6",
			Position:            0,
			IsCompleted:         false,
			CreatedBy:           systemUser.ID,
			Version:             1,
			AllowTaskCreation:   true,
			MaxTasks:            0,
			AllowTaskDeletion:   true,
			AllowTaskMovement:   true,
			NotificationEnabled: true,
			CreatedAt:           time.Now(),
			UpdatedAt:           time.Now(),
		},
		{
			ProjectID:           project.ID,
			Name:                "进行中",
			Description:         "正在进行的任务",
			Color:               "#F59E0B",
			Position:            1,
			IsCompleted:         false,
			CreatedBy:           systemUser.ID,
			Version:             1,
			AllowTaskCreation:   true,
			MaxTasks:            0,
			AllowTaskDeletion:   true,
			AllowTaskMovement:   true,
			NotificationEnabled: true,
			CreatedAt:           time.Now(),
			UpdatedAt:           time.Now(),
		},
		{
			ProjectID:           project.ID,
			Name:                "进行中",
			Description:         "测试阶段的任务",
			Color:               "#8B5CF6",
			Position:            2,
			IsCompleted:         false,
			CreatedBy:           systemUser.ID,
			Version:             1,
			AllowTaskCreation:   true,
			MaxTasks:            0,
			AllowTaskDeletion:   true,
			AllowTaskMovement:   true,
			NotificationEnabled: true,
			CreatedAt:           time.Now(),
			UpdatedAt:           time.Now(),
		},
		{
			ProjectID:           project.ID,
			Name:                "已完成",
			Description:         "已完成的任务",
			Color:               "#10B981",
			Position:            3,
			IsCompleted:         false,
			CreatedBy:           systemUser.ID,
			Version:             1,
			AllowTaskCreation:   true,
			MaxTasks:            0,
			AllowTaskDeletion:   true,
			AllowTaskMovement:   true,
			NotificationEnabled: true,
			CreatedAt:           time.Now(),
			UpdatedAt:           time.Now(),
		},
	}

	for i := range stages {
		if err := DB.Create(&stages[i]).Error; err != nil {
			log.Printf("创建阶段失败: %v", err)
			continue
		}
		log.Printf("✓ 阶段创建成功: %s (ID: %d)", stages[i].Name, stages[i].ID)
	}

	// 创建任务
	tasks := []models.Task{
		// 待办阶段
		{
			StageID:     stages[0].ID,
			ProjectID:   project.ID,
			Title:       "设计数据库结构",
			Description: "设计并创建项目所需的数据库表结构",
			Status:      "todo",
			Priority:    "P1",
			AssigneeID:  &systemUser.ID,
			Position:    0,
			CreatedBy:   systemUser.ID,
			Version:     1,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			StageID:     stages[0].ID,
			ProjectID:   project.ID,
			Title:       "设计 UI 原型",
			Description: "使用设计工具创建用户界面原型",
			Status:      "todo",
			Priority:    "P1",
			AssigneeID:  &systemUser.ID,
			Position:    1,
			CreatedBy:   systemUser.ID,
			Version:     1,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			StageID:     stages[0].ID,
			ProjectID:   project.ID,
			Title:       "编写项目文档",
			Description: "编写项目需求文档和技术文档",
			Status:      "todo",
			Priority:    "P2",
			AssigneeID:  &systemUser.ID,
			Position:    2,
			CreatedBy:   systemUser.ID,
			Version:     1,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		// 进行中阶段
		{
			StageID:     stages[1].ID,
			ProjectID:   project.ID,
			Title:       "开发用户认证功能",
			Description: "实现用户注册、登录、JWT 认证等功能",
			Status:      "in_progress",
			Priority:    "P1",
			AssigneeID:  &systemUser.ID,
			Position:    0,
			CreatedBy:   systemUser.ID,
			Version:     1,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			StageID:     stages[1].ID,
			ProjectID:   project.ID,
			Title:       "开发项目管理模块",
			Description: "实现项目的创建、编辑、删除等功能",
			Status:      "in_progress",
			Priority:    "P1",
			AssigneeID:  &systemUser.ID,
			Position:    1,
			CreatedBy:   systemUser.ID,
			Version:     1,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			StageID:     stages[1].ID,
			ProjectID:   project.ID,
			Title:       "开发任务管理模块",
			Description: "实现任务的创建、编辑、移动等功能",
			Status:      "in_progress",
			Priority:    "P2",
			AssigneeID:  &systemUser.ID,
			Position:    2,
			CreatedBy:   systemUser.ID,
			Version:     1,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		// 测试中阶段
		{
			StageID:     stages[2].ID,
			ProjectID:   project.ID,
			Title:       "单元测试",
			Description: "编写并执行单元测试用例",
			Status:      "testing",
			Priority:    "P2",
			AssigneeID:  &systemUser.ID,
			Position:    0,
			CreatedBy:   systemUser.ID,
			Version:     1,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			StageID:     stages[2].ID,
			ProjectID:   project.ID,
			Title:       "集成测试",
			Description: "执行系统集成测试",
			Status:      "testing",
			Priority:    "P2",
			AssigneeID:  &systemUser.ID,
			Position:    1,
			CreatedBy:   systemUser.ID,
			Version:     1,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		// 已完成阶段
		{
			StageID:     stages[3].ID,
			ProjectID:   project.ID,
			Title:       "项目初始化",
			Description: "创建项目仓库，配置开发环境",
			Status:      "completed",
			Priority:    "P1",
			AssigneeID:  &systemUser.ID,
			Position:    0,
			CreatedBy:   systemUser.ID,
			Version:     1,
			CreatedAt:   time.Now().AddDate(0, 0, -7),
			UpdatedAt:   time.Now().AddDate(0, 0, -6),
		},
		{
			StageID:     stages[3].ID,
			ProjectID:   project.ID,
			Title:       "技术选型",
			Description: "确定使用的技术栈和框架",
			Status:      "completed",
			Priority:    "P1",
			AssigneeID:  &systemUser.ID,
			Position:    1,
			CreatedBy:   systemUser.ID,
			Version:     1,
			CreatedAt:   time.Now().AddDate(0, 0, -6),
			UpdatedAt:   time.Now().AddDate(0, 0, -5),
		},
	}

	for i := range tasks {
		if err := DB.Create(&tasks[i]).Error; err != nil {
			log.Printf("创建任务失败: %v", err)
			continue
		}
		log.Printf("✓ 任务创建成功: %s (ID: %d)", tasks[i].Title, tasks[i].ID)
	}

	log.Println("✓ 种子数据初始化完成")
}

// generateSystemPasswordHash 生成系统用户的密码哈希
// 系统用户不需要登录，所以使用一个随机哈希
func generateSystemPasswordHash() string {
	// 生成一个不可用的密码哈希（系统用户不能登录）
	hash, _ := bcrypt.GenerateFromPassword([]byte("system_user_no_login_"+time.Now().String()), bcrypt.DefaultCost)
	return string(hash)
}

// AddUserToSampleProject 将用户添加到示例项目
func AddUserToSampleProject(userID uint) error {
	// 查找示例项目
	var project models.Project
	if err := DB.Where("name = ?", "示例项目：网站开发").First(&project).Error; err != nil {
		// 如果示例项目不存在，不报错（可能种子数据未初始化）
		return nil
	}

	// 检查用户是否已经是项目成员
	var existingMember models.ProjectMember
	if err := DB.Where("project_id = ? AND user_id = ?", project.ID, userID).First(&existingMember).Error; err == nil {
		// 用户已经是成员，不需要重复添加
		return nil
	}

	// 添加用户为项目成员
	member := models.ProjectMember{
		ProjectID: project.ID,
		UserID:    userID,
		Role:      models.ProjectMemberRoleCollaborator,
		Version:   1,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := DB.Create(&member).Error; err != nil {
		log.Printf("添加用户到示例项目失败: %v", err)
		return err
	}

	log.Printf("✓ 用户 %d 已添加到示例项目", userID)
	return nil
}
