package database

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"project-manager-backend/config"
	"project-manager-backend/models"
	"time"

	"github.com/jinzhu/gorm"
	_ "modernc.org/sqlite"
)

var DB *gorm.DB

// InitDatabase 初始化数据库连接
func InitDatabase(config *config.Config) {
	var err error

	// SQLite 数据库路径
	dbPath := config.Database.Path
	if dbPath == "" {
		dbPath = filepath.Join("data", "project_manager.db")
	}
	
	// 创建数据库目录
	if err := os.MkdirAll(filepath.Dir(dbPath), 0755); err != nil {
		log.Fatal("Failed to create database directory:", err)
	}

	// 连接数据库（使用纯 Go SQLite 驱动，无需 CGO）
	// modernc.org/sqlite 注册的驱动名是 "sqlite"
	// 先使用 database/sql 打开连接
	sqlDB, err := sql.Open("sqlite", dbPath)
	if err != nil {
		log.Fatal("Failed to open database:", err)
	}

	// 使用 GORM v1 的方式：通过 sql.DB 创建 GORM 实例
	// GORM v1 支持通过 sql.DB 创建实例
	DB, err = gorm.Open("sqlite", sqlDB)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// 设置连接池参数（SQLite 只需要单个连接）
	// 注意：这里使用之前创建的 sqlDB，而不是 DB.DB()
	sqlDB.SetMaxIdleConns(1)
	sqlDB.SetMaxOpenConns(1)
	sqlDB.SetConnMaxLifetime(time.Hour)

	// 启用日志
	DB.LogMode(true)

	// 测试数据库连接
	if err := sqlDB.Ping(); err != nil {
		log.Fatal("Failed to ping database:", err)
	}

	// 验证数据库事务支持
	if err := testTransactionSupport(); err != nil {
		log.Fatal("Database transaction test failed:", err)
	}

	// 自动迁移表结构
	AutoMigrate()

	// 初始化种子数据（示例项目）
	SeedDatabase()

	log.Printf("Database connected successfully using SQLite at %s\n", dbPath)
}

// AutoMigrate 自动迁移数据库表
func AutoMigrate() {
	DB.AutoMigrate(
		// 基础表
		&models.User{},
		&models.Project{},
		&models.ProjectMember{},
		&models.UserCollaborator{},
		&models.Stage{},
		&models.Task{},
		&models.Comment{},

		// STAGE2 冲突检测相关表
		&models.OperationLog{},
		&models.ConflictRecord{},
		&models.DistributedLock{},

		// STAGE3 高级协作相关表
		&models.UserOnlineStatus{},
		&models.CollaborationSession{},
		&models.OperationConfirmation{},
		&models.RealtimeCollaborationStatus{},
		&models.TaskPermission{},
		&models.CollaborationAnalytics{},
		&models.ConflictResolutionRule{},
		&models.CollaborationSessionDetail{},

		// 文件管理和任务活动记录表
		&models.TaskActivity{},
	)
	log.Println("Database tables migrated successfully")
}

// testTransactionSupport 测试数据库事务支持
func testTransactionSupport() error {
	tx := DB.Begin()
	if tx.Error != nil {
		return fmt.Errorf("failed to begin transaction: %v", tx.Error)
	}

	// 测试事务回滚
	if err := tx.Rollback().Error; err != nil {
		return fmt.Errorf("failed to rollback transaction: %v", err)
	}

	// 测试事务提交
	tx = DB.Begin()
	if tx.Error != nil {
		return fmt.Errorf("failed to begin second transaction: %v", tx.Error)
	}

	if err := tx.Commit().Error; err != nil {
		return fmt.Errorf("failed to commit transaction: %v", err)
	}

	log.Println("Database transaction support verified")
	return nil
}

// CloseDatabase 关闭数据库连接
func CloseDatabase() {
	if DB != nil {
		DB.Close()
		log.Println("Database connection closed")
	}
}
