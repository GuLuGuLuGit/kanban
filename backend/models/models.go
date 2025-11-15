package models

import (
	"time"

	"github.com/jinzhu/gorm"
)

// UserRole 用户角色枚举 - 简化为两个角色
type UserRole string

const (
	RoleAdmin UserRole = "admin" // 系统管理员
	RoleUser  UserRole = "user"  // 普通用户
)

// ProjectStatus 项目状态枚举
type ProjectStatus string

const (
	ProjectStatusActive   ProjectStatus = "active"
	ProjectStatusArchived ProjectStatus = "archived"
)

// ProjectMemberRole 项目成员角色枚举
type ProjectMemberRole string

const (
	ProjectMemberRoleOwner        ProjectMemberRole = "owner"        // 项目所有者
	ProjectMemberRoleManager      ProjectMemberRole = "manager"      // 项目管理员
	ProjectMemberRoleCollaborator ProjectMemberRole = "collaborator" // 协作者
)

// User 用户模型
type User struct {
	ID           uint      `json:"id" gorm:"primary_key;autoIncrement"`
	Username     string    `json:"username" gorm:"unique;not null"`
	Email        string    `json:"email" gorm:"unique;not null"`
	PasswordHash string    `json:"-" gorm:"not null"` // 密码不返回给前端
	Role         UserRole  `json:"role" gorm:"default:'user'"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`

	// 关联关系
	OwnedProjects []*Project       `json:"owned_projects,omitempty" gorm:"foreignkey:OwnerID"`
	Memberships   []*ProjectMember `json:"memberships,omitempty" gorm:"foreignkey:UserID"`
	AssignedTasks []*Task          `json:"assigned_tasks,omitempty" gorm:"foreignkey:AssigneeID"`
}

// UserCollaborator 用户协作人员关系模型
type UserCollaborator struct {
	ID             uint      `json:"id" gorm:"primary_key"`
	UserID         uint      `json:"user_id" gorm:"not null;index"`         // 用户ID
	CollaboratorID uint      `json:"collaborator_id" gorm:"not null;index"` // 协作人员ID
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`

	// 关联关系
	User         *User `json:"user,omitempty" gorm:"foreignkey:UserID"`
	Collaborator *User `json:"collaborator,omitempty" gorm:"foreignkey:CollaboratorID"`
}

// Project 项目模型
type Project struct {
	ID          uint          `json:"id" gorm:"primary_key;autoIncrement"`
	Name        string        `json:"name" gorm:"not null"`
	Description string        `json:"description" gorm:"type:text"`
	OwnerID     uint          `json:"owner_id" gorm:"not null"`
	Status      ProjectStatus `json:"status" gorm:"default:'active'"`
	StartDate   *time.Time    `json:"start_date"`
	EndDate     *time.Time    `json:"end_date"`
	Version     int64         `json:"version" gorm:"default:1"` // 版本号，用于乐观锁
	CreatedAt   time.Time     `json:"created_at"`
	UpdatedAt   time.Time     `json:"updated_at"`
	CreatedBy   uint          `json:"created_by"`
	// 关联关系
	Owner   *User            `json:"owner" gorm:"foreignkey:OwnerID"`
	Members []*ProjectMember `json:"members,omitempty" gorm:"foreignkey:ProjectID"`
	Stages  []*Stage         `json:"stages,omitempty" gorm:"foreignkey:ProjectID"`
	Tasks   []*Task          `json:"tasks,omitempty" gorm:"foreignkey:ProjectID"`
}

// ProjectMember 项目成员模型
type ProjectMember struct {
	ID        uint              `json:"id" gorm:"primary_key"`
	ProjectID uint              `json:"project_id" gorm:"not null"`
	UserID    uint              `json:"user_id" gorm:"not null"`
	Role      ProjectMemberRole `json:"role" gorm:"default:'collaborator'"`
	InvitedBy *uint             `json:"invited_by"`               // 邀请人ID
	Version   int64             `json:"version" gorm:"default:1"` // 版本号，用于乐观锁
	CreatedAt time.Time         `json:"created_at"`
	UpdatedAt time.Time         `json:"updated_at"`

	// 关联关系
	Project *Project `json:"project,omitempty" gorm:"foreignkey:ProjectID"`
	User    *User    `json:"user,omitempty" gorm:"foreignkey:UserID"`
	Inviter *User    `json:"inviter,omitempty" gorm:"foreignkey:InvitedBy"`
}

// Stage 阶段模型
type Stage struct {
	ID                  uint       `json:"id" gorm:"primary_key;autoIncrement"`
	ProjectID           uint       `json:"project_id" gorm:"not null;index"`
	Name                string     `json:"name" gorm:"not null;size:255"`
	Description         string     `json:"description" gorm:"type:text"`
	Color               string     `json:"color" gorm:"default:'#3B82F6';size:7"`
	Position            int        `json:"position" gorm:"default:0;index"`
	TaskLimit           *int       `json:"task_limit"`
	IsCompleted         bool       `json:"is_completed" gorm:"default:false;index"`
	CompletedAt         *time.Time `json:"completed_at"`
	CreatedBy           uint       `json:"created_by" gorm:"not null;index"`
	Version             int64      `json:"version" gorm:"default:1"` // 版本号，用于乐观锁
	CreatedAt           time.Time  `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt           time.Time  `json:"updated_at" gorm:"autoUpdateTime"`
	AllowTaskCreation   bool       `json:"allow_task_creation" gorm:"default:true"`
	MaxTasks            int        `json:"max_tasks"`
	AllowTaskDeletion   bool       `json:"allow_task_deletion" gorm:"default:true"`
	AllowTaskMovement   bool       `json:"allow_task_movement" gorm:"default:true"`
	NotificationEnabled bool       `json:"notification_enabled" gorm:"default:true"`
	AutoAssignStatus    string     `json:"auto_assign_status" gorm:"column:auto_assign_status;size:50"`
	// 关联关系
	Project *Project `json:"project,omitempty" gorm:"foreignkey:ProjectID"`
	Tasks   []*Task  `json:"tasks,omitempty" gorm:"foreignkey:StageID"`
}

// Task 任务模型
type Task struct {
	ID             uint       `json:"id" gorm:"primary_key;autoIncrement"`
	StageID        uint       `json:"stage_id" gorm:"not null"`
	ProjectID      uint       `json:"project_id" gorm:"not null"`
	Title          string     `json:"title" gorm:"not null"`
	Description    string     `json:"description" gorm:"type:text"`
	Status         string     `json:"status" gorm:"default:'todo'"`
	Priority       string     `json:"priority" gorm:"default:'P2'"`
	AssigneeID     *uint      `json:"assignee_id"`
	DueDate        *time.Time `json:"due_date"`
	EstimatedHours *float64   `json:"estimated_hours"`
	ActualHours    *float64   `json:"actual_hours"`
	Position       int        `json:"position" gorm:"default:0"`
	CreatedBy      uint       `json:"created_by"`
	Version        int64      `json:"version" gorm:"default:1"` // 版本号，用于乐观锁
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`

	// 关联关系
	Stage    *Stage   `json:"stage" gorm:"foreignkey:StageID"`
	Project  *Project `json:"project" gorm:"foreignkey:ProjectID"`
	Assignee *User    `json:"assignee,omitempty" gorm:"foreignkey:AssigneeID"`
}

// Comment 评论模型
type Comment struct {
	ID      uint   `json:"id" gorm:"primary_key;autoIncrement"`
	Content string `json:"content" gorm:"type:text;not null"`
	UserID  uint   `json:"user_id" gorm:"not null"`
	TaskID  uint   `json:"task_id" gorm:"not null"`

	// 媒体关联
	MediaID   *string `json:"media_id" gorm:"type:varchar(255)"`
	MediaType *string `json:"media_type" gorm:"type:varchar(50)"`
	MediaName *string `json:"media_name" gorm:"type:varchar(255)"`

	// 回复关联
	ReplyToID       *uint `json:"reply_to_id" gorm:"column:reply_to_id"`
	ParentCommentID *uint `json:"parent_comment_id" gorm:"column:parent_comment_id"`

	// 时间字段
	CreatedAt time.Time `json:"created_at" gorm:"column:created_at"`
	UpdatedAt time.Time `json:"updated_at" gorm:"column:updated_at"`

	// 关联关系
	User          User     `json:"user" gorm:"foreignKey:UserID"`
	Task          Task     `json:"task" gorm:"foreignKey:TaskID"`
	ReplyTo       *Comment `json:"reply_to" gorm:"foreignKey:ReplyToID;references:ID"`
	ParentComment *Comment `json:"parent_comment" gorm:"foreignKey:ParentCommentID;references:ID"`

	// 计算字段
	Replies []*Comment `json:"replies,omitempty" gorm:"-"`
}

// TableName 方法
func (User) TableName() string {
	return "users"
}

func (Project) TableName() string {
	return "projects"
}

func (ProjectMember) TableName() string {
	return "project_members"
}

func (Stage) TableName() string {
	return "stages"
}

func (Task) TableName() string {
	return "tasks"
}

func (Comment) TableName() string {
	return "comments"
}

func (UserCollaborator) TableName() string {
	return "user_collaborators"
}

// BeforeCreate 钩子
func (u *User) BeforeCreate(scope *gorm.Scope) error {
	scope.SetColumn("CreatedAt", time.Now())
	scope.SetColumn("UpdatedAt", time.Now())
	return nil
}

func (p *Project) BeforeCreate(scope *gorm.Scope) error {
	scope.SetColumn("CreatedAt", time.Now())
	scope.SetColumn("UpdatedAt", time.Now())
	return nil
}

func (pm *ProjectMember) BeforeCreate(scope *gorm.Scope) error {
	scope.SetColumn("CreatedAt", time.Now())
	scope.SetColumn("UpdatedAt", time.Now())
	return nil
}

func (s *Stage) BeforeCreate(scope *gorm.Scope) error {
	scope.SetColumn("CreatedAt", time.Now())
	scope.SetColumn("UpdatedAt", time.Now())
	return nil
}

func (t *Task) BeforeCreate(scope *gorm.Scope) error {
	scope.SetColumn("CreatedAt", time.Now())
	scope.SetColumn("UpdatedAt", time.Now())
	return nil
}

func (c *Comment) BeforeCreate(scope *gorm.Scope) error {
	scope.SetColumn("created_at", time.Now())
	scope.SetColumn("updated_at", time.Now())
	return nil
}

// BeforeUpdate 钩子
func (u *User) BeforeUpdate(scope *gorm.Scope) error {
	scope.SetColumn("UpdatedAt", time.Now())
	return nil
}

func (p *Project) BeforeUpdate(scope *gorm.Scope) error {
	scope.SetColumn("UpdatedAt", time.Now())
	return nil
}

func (pm *ProjectMember) BeforeUpdate(scope *gorm.Scope) error {
	scope.SetColumn("UpdatedAt", time.Now())
	return nil
}

func (s *Stage) BeforeUpdate(scope *gorm.Scope) error {
	scope.SetColumn("UpdatedAt", time.Now())
	return nil
}

func (t *Task) BeforeUpdate(scope *gorm.Scope) error {
	scope.SetColumn("UpdatedAt", time.Now())
	return nil
}

func (c *Comment) BeforeUpdate(scope *gorm.Scope) error {
	scope.SetColumn("updated_at", time.Now())
	return nil
}

// ==================== 协作状态相关模型 ====================

// CollaborationSessionStatus 协作会话状态枚举
type CollaborationSessionStatus string

const (
	CollaborationSessionStatusActive       CollaborationSessionStatus = "active"
	CollaborationSessionStatusIdle         CollaborationSessionStatus = "idle"
	CollaborationSessionStatusDisconnected CollaborationSessionStatus = "disconnected"
)

// OperationConfirmationStatus 操作确认状态枚举
type OperationConfirmationStatus string

const (
	OperationConfirmationStatusPending   OperationConfirmationStatus = "pending"
	OperationConfirmationStatusConfirmed OperationConfirmationStatus = "confirmed"
	OperationConfirmationStatusFailed    OperationConfirmationStatus = "failed"
	OperationConfirmationStatusTimeout   OperationConfirmationStatus = "timeout"
)

// UserOnlineStatus 用户在线状态模型
type UserOnlineStatus struct {
	ID            uint      `json:"id" gorm:"primary_key"`
	UserID        uint      `json:"user_id" gorm:"not null"`
	ProjectID     uint      `json:"project_id" gorm:"not null"`
	ConnectionID  string    `json:"connection_id" gorm:"not null;size:255"`
	IsOnline      bool      `json:"is_online" gorm:"default:true"`
	LastHeartbeat time.Time `json:"last_heartbeat" gorm:"not null"`
	LastActivity  time.Time `json:"last_activity" gorm:"not null"`
	UserAgent     string    `json:"user_agent" gorm:"type:text"`
	IPAddress     string    `json:"ip_address" gorm:"size:45"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`

	// 关联关系
	User    *User    `json:"user,omitempty" gorm:"foreignkey:UserID"`
	Project *Project `json:"project,omitempty" gorm:"foreignkey:ProjectID"`
}

// CollaborationSession 协作会话模型
type CollaborationSession struct {
	ID              uint                       `json:"id" gorm:"primary_key"`
	UserID          uint                       `json:"user_id" gorm:"not null"`
	ProjectID       uint                       `json:"project_id" gorm:"not null"`
	SessionToken    string                     `json:"session_token" gorm:"not null;unique;size:255"`
	ConnectionCount int                        `json:"connection_count" gorm:"default:1"`
	Status          CollaborationSessionStatus `json:"status" gorm:"default:'active'"`
	LastSyncTime    time.Time                  `json:"last_sync_time" gorm:"not null"`
	SyncVersion     int64                      `json:"sync_version" gorm:"default:1"`
	Metadata        string                     `json:"metadata" gorm:"type:json"`
	CreatedAt       time.Time                  `json:"created_at"`
	UpdatedAt       time.Time                  `json:"updated_at"`

	// 关联关系
	User    *User    `json:"user,omitempty" gorm:"foreignkey:UserID"`
	Project *Project `json:"project,omitempty" gorm:"foreignkey:ProjectID"`
}

// OperationConfirmation 操作确认模型
type OperationConfirmation struct {
	ID                    uint                        `json:"id" gorm:"primary_key"`
	OperationID           string                      `json:"operation_id" gorm:"not null;unique;size:255"`
	UserID                uint                        `json:"user_id" gorm:"not null"`
	ProjectID             uint                        `json:"project_id" gorm:"not null"`
	OperationType         string                      `json:"operation_type" gorm:"not null;size:50"`
	OperationData         string                      `json:"operation_data" gorm:"not null;type:json"`
	Status                OperationConfirmationStatus `json:"status" gorm:"default:'pending'"`
	ConfirmationCount     int                         `json:"confirmation_count" gorm:"default:0"`
	RequiredConfirmations int                         `json:"required_confirmations" gorm:"default:1"`
	TimeoutAt             time.Time                   `json:"timeout_at" gorm:"not null"`
	ConfirmedAt           *time.Time                  `json:"confirmed_at"`
	CreatedAt             time.Time                   `json:"created_at"`
	UpdatedAt             time.Time                   `json:"updated_at"`

	// 关联关系
	User    *User    `json:"user,omitempty" gorm:"foreignkey:UserID"`
	Project *Project `json:"project,omitempty" gorm:"foreignkey:ProjectID"`
}

// BeforeCreate 钩子
func (uos *UserOnlineStatus) BeforeCreate(scope *gorm.Scope) error {
	now := time.Now()
	scope.SetColumn("CreatedAt", now)
	scope.SetColumn("UpdatedAt", now)
	scope.SetColumn("LastHeartbeat", now)
	scope.SetColumn("LastActivity", now)
	return nil
}

func (cs *CollaborationSession) BeforeCreate(scope *gorm.Scope) error {
	now := time.Now()
	scope.SetColumn("CreatedAt", now)
	scope.SetColumn("UpdatedAt", now)
	scope.SetColumn("LastSyncTime", now)
	return nil
}

func (oc *OperationConfirmation) BeforeCreate(scope *gorm.Scope) error {
	now := time.Now()
	scope.SetColumn("CreatedAt", now)
	scope.SetColumn("UpdatedAt", now)
	// 设置默认超时时间为5分钟后
	scope.SetColumn("TimeoutAt", now.Add(5*time.Minute))
	return nil
}

// BeforeUpdate 钩子
func (uos *UserOnlineStatus) BeforeUpdate(scope *gorm.Scope) error {
	scope.SetColumn("UpdatedAt", time.Now())
	return nil
}

func (cs *CollaborationSession) BeforeUpdate(scope *gorm.Scope) error {
	scope.SetColumn("UpdatedAt", time.Now())
	return nil
}

func (oc *OperationConfirmation) BeforeUpdate(scope *gorm.Scope) error {
	scope.SetColumn("UpdatedAt", time.Now())
	return nil
}

// ==================== 冲突检测相关模型 ====================

// OperationLogStatus 操作日志状态枚举
type OperationLogStatus string

const (
	OperationLogStatusPending  OperationLogStatus = "pending"
	OperationLogStatusSuccess  OperationLogStatus = "success"
	OperationLogStatusFailed   OperationLogStatus = "failed"
	OperationLogStatusConflict OperationLogStatus = "conflict"
	OperationLogStatusRollback OperationLogStatus = "rollback"
)

// ConflictRecordStatus 冲突记录状态枚举
type ConflictRecordStatus string

const (
	ConflictRecordStatusDetected  ConflictRecordStatus = "detected"
	ConflictRecordStatusResolving ConflictRecordStatus = "resolving"
	ConflictRecordStatusResolved  ConflictRecordStatus = "resolved"
	ConflictRecordStatusAbandoned ConflictRecordStatus = "abandoned"
)

// OperationLog 操作日志模型
type OperationLog struct {
	ID                 uint               `json:"id" gorm:"primary_key"`
	OperationID        string             `json:"operation_id" gorm:"not null;unique;size:255"`
	UserID             uint               `json:"user_id" gorm:"not null"`
	ProjectID          uint               `json:"project_id" gorm:"not null"`
	OperationType      string             `json:"operation_type" gorm:"not null;size:50"`
	TargetType         string             `json:"target_type" gorm:"not null;size:50"`
	TargetID           uint               `json:"target_id" gorm:"not null"`
	OperationData      string             `json:"operation_data" gorm:"not null;type:json"`
	BeforeData         string             `json:"before_data" gorm:"type:json"`
	AfterData          string             `json:"after_data" gorm:"type:json"`
	Status             OperationLogStatus `json:"status" gorm:"default:'pending'"`
	ConflictWith       string             `json:"conflict_with" gorm:"size:255"`
	ResolutionStrategy string             `json:"resolution_strategy" gorm:"size:50"`
	VersionBefore      *int64             `json:"version_before"`
	VersionAfter       *int64             `json:"version_after"`
	ClientTimestamp    time.Time          `json:"client_timestamp" gorm:"not null"`
	ServerTimestamp    time.Time          `json:"server_timestamp" gorm:"not null"`
	IPAddress          string             `json:"ip_address" gorm:"size:45"`
	UserAgent          string             `json:"user_agent" gorm:"type:text"`
	SessionID          string             `json:"session_id" gorm:"size:255"`
	CreatedAt          time.Time          `json:"created_at"`
	UpdatedAt          time.Time          `json:"updated_at"`

	// 关联关系
	User    *User    `json:"user,omitempty" gorm:"foreignkey:UserID"`
	Project *Project `json:"project,omitempty" gorm:"foreignkey:ProjectID"`
}

// ConflictRecord 冲突记录模型
type ConflictRecord struct {
	ID                 uint                 `json:"id" gorm:"primary_key"`
	ConflictID         string               `json:"conflict_id" gorm:"not null;unique;size:255"`
	ProjectID          uint                 `json:"project_id" gorm:"not null"`
	TargetType         string               `json:"target_type" gorm:"not null;size:50"`
	TargetID           uint                 `json:"target_id" gorm:"not null"`
	Operation1ID       string               `json:"operation1_id" gorm:"not null;size:255"`
	Operation2ID       string               `json:"operation2_id" gorm:"not null;size:255"`
	User1ID            uint                 `json:"user1_id" gorm:"not null"`
	User2ID            uint                 `json:"user2_id" gorm:"not null"`
	ConflictType       string               `json:"conflict_type" gorm:"not null;size:50"`
	ConflictData       string               `json:"conflict_data" gorm:"not null;type:json"`
	Status             ConflictRecordStatus `json:"status" gorm:"default:'detected'"`
	ResolutionStrategy string               `json:"resolution_strategy" gorm:"size:50"`
	ResolutionData     string               `json:"resolution_data" gorm:"type:json"`
	ResolvedBy         *uint                `json:"resolved_by"`
	ResolvedAt         *time.Time           `json:"resolved_at"`
	CreatedAt          time.Time            `json:"created_at"`
	UpdatedAt          time.Time            `json:"updated_at"`

	// 关联关系
	Project  *Project `json:"project,omitempty" gorm:"foreignkey:ProjectID"`
	User1    *User    `json:"user1,omitempty" gorm:"foreignkey:User1ID"`
	User2    *User    `json:"user2,omitempty" gorm:"foreignkey:User2ID"`
	Resolver *User    `json:"resolver,omitempty" gorm:"foreignkey:ResolvedBy"`
}

// DistributedLock 分布式锁模型
type DistributedLock struct {
	ID         uint      `json:"id" gorm:"primary_key"`
	LockKey    string    `json:"lock_key" gorm:"not null;unique;size:255"`
	LockValue  string    `json:"lock_value" gorm:"not null;size:255"`
	OwnerID    uint      `json:"owner_id" gorm:"not null"`
	ProjectID  *uint     `json:"project_id"`
	TargetType string    `json:"target_type" gorm:"size:50"`
	TargetID   *uint     `json:"target_id"`
	AcquiredAt time.Time `json:"acquired_at" gorm:"not null"`
	ExpiresAt  time.Time `json:"expires_at" gorm:"not null"`
	SessionID  string    `json:"session_id" gorm:"size:255"`
	Metadata   string    `json:"metadata" gorm:"type:json"`

	// 关联关系
	Owner   *User    `json:"owner,omitempty" gorm:"foreignkey:OwnerID"`
	Project *Project `json:"project,omitempty" gorm:"foreignkey:ProjectID"`
}

// BeforeCreate 钩子
func (ol *OperationLog) BeforeCreate(scope *gorm.Scope) error {
	scope.SetColumn("CreatedAt", time.Now())
	scope.SetColumn("UpdatedAt", time.Now())
	scope.SetColumn("ServerTimestamp", time.Now())
	return nil
}

func (cr *ConflictRecord) BeforeCreate(scope *gorm.Scope) error {
	scope.SetColumn("CreatedAt", time.Now())
	scope.SetColumn("UpdatedAt", time.Now())
	return nil
}

func (dl *DistributedLock) BeforeCreate(scope *gorm.Scope) error {
	scope.SetColumn("AcquiredAt", time.Now())
	return nil
}

// BeforeUpdate 钩子
func (ol *OperationLog) BeforeUpdate(scope *gorm.Scope) error {
	scope.SetColumn("UpdatedAt", time.Now())
	return nil
}

func (cr *ConflictRecord) BeforeUpdate(scope *gorm.Scope) error {
	scope.SetColumn("UpdatedAt", time.Now())
	return nil
}

// ==================== 第三阶段：高级协作功能相关模型 ====================

// TaskPermissionType 任务权限类型枚举
type TaskPermissionType string

const (
	TaskPermissionRead    TaskPermissionType = "read"
	TaskPermissionWrite   TaskPermissionType = "write"
	TaskPermissionDelete  TaskPermissionType = "delete"
	TaskPermissionAssign  TaskPermissionType = "assign"
	TaskPermissionComment TaskPermissionType = "comment"
	TaskPermissionMove    TaskPermissionType = "move"
)

// RealtimeCollaborationStatusType 实时协作状态类型枚举
type RealtimeCollaborationStatusType string

const (
	RealtimeStatusActive    RealtimeCollaborationStatusType = "active"
	RealtimeStatusIdle      RealtimeCollaborationStatusType = "idle"
	RealtimeStatusPaused    RealtimeCollaborationStatusType = "paused"
	RealtimeStatusCompleted RealtimeCollaborationStatusType = "completed"
)

// TaskPermission 任务级权限模型
type TaskPermission struct {
	ID             uint               `json:"id" gorm:"primary_key"`
	TaskID         uint               `json:"task_id" gorm:"not null"`
	UserID         uint               `json:"user_id" gorm:"not null"`
	PermissionType TaskPermissionType `json:"permission_type" gorm:"not null"`
	GrantedBy      uint               `json:"granted_by" gorm:"not null"`
	GrantedAt      time.Time          `json:"granted_at" gorm:"not null"`
	ExpiresAt      *time.Time         `json:"expires_at"`
	IsActive       bool               `json:"is_active" gorm:"default:true"`
	Metadata       string             `json:"metadata" gorm:"type:json"`
	CreatedAt      time.Time          `json:"created_at"`
	UpdatedAt      time.Time          `json:"updated_at"`

	// 关联关系
	Task          *Task `json:"task,omitempty" gorm:"foreignkey:TaskID"`
	User          *User `json:"user,omitempty" gorm:"foreignkey:UserID"`
	GrantedByUser *User `json:"granted_by_user,omitempty" gorm:"foreignkey:GrantedBy"`
}

// RealtimeCollaborationStatus 实时协作状态模型
type RealtimeCollaborationStatus struct {
	ID             uint                            `json:"id" gorm:"primary_key"`
	UserID         uint                            `json:"user_id" gorm:"not null"`
	ProjectID      uint                            `json:"project_id" gorm:"not null"`
	TargetType     string                          `json:"target_type" gorm:"not null;size:50"`
	TargetID       uint                            `json:"target_id" gorm:"not null"`
	ActionType     string                          `json:"action_type" gorm:"not null;size:50"`
	Status         RealtimeCollaborationStatusType `json:"status" gorm:"default:'active'"`
	CursorPosition string                          `json:"cursor_position" gorm:"type:json"`
	SelectionRange string                          `json:"selection_range" gorm:"type:json"`
	EditingField   string                          `json:"editing_field" gorm:"size:100"`
	LastActivity   time.Time                       `json:"last_activity" gorm:"not null"`
	SessionID      string                          `json:"session_id" gorm:"not null;size:255"`
	ConnectionID   string                          `json:"connection_id" gorm:"not null;size:255"`
	Metadata       string                          `json:"metadata" gorm:"type:json"`
	CreatedAt      time.Time                       `json:"created_at"`
	UpdatedAt      time.Time                       `json:"updated_at"`

	// 关联关系
	User    *User    `json:"user,omitempty" gorm:"foreignkey:UserID"`
	Project *Project `json:"project,omitempty" gorm:"foreignkey:ProjectID"`
}

// CollaborationAnalytics 协作分析数据模型
type CollaborationAnalytics struct {
	ID             uint      `json:"id" gorm:"primary_key"`
	ProjectID      uint      `json:"project_id" gorm:"not null"`
	UserID         uint      `json:"user_id" gorm:"not null"`
	Date           time.Time `json:"date" gorm:"type:date;not null"`
	MetricType     string    `json:"metric_type" gorm:"not null;size:50"`
	MetricValue    float64   `json:"metric_value" gorm:"type:decimal(10,2);not null"`
	TargetType     string    `json:"target_type" gorm:"size:50"`
	TargetID       *uint     `json:"target_id"`
	AdditionalData string    `json:"additional_data" gorm:"type:json"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`

	// 关联关系
	Project *Project `json:"project,omitempty" gorm:"foreignkey:ProjectID"`
	User    *User    `json:"user,omitempty" gorm:"foreignkey:UserID"`
}

// ConflictResolutionRule 智能冲突解决规则模型
type ConflictResolutionRule struct {
	ID                 uint      `json:"id" gorm:"primary_key"`
	RuleName           string    `json:"rule_name" gorm:"not null;size:100"`
	RuleType           string    `json:"rule_type" gorm:"not null;size:50"`
	ConflictPattern    string    `json:"conflict_pattern" gorm:"not null;type:json"`
	ResolutionStrategy string    `json:"resolution_strategy" gorm:"not null;size:50"`
	Priority           int       `json:"priority" gorm:"default:0"`
	SuccessRate        float64   `json:"success_rate" gorm:"type:decimal(5,2);default:0.00"`
	UsageCount         int       `json:"usage_count" gorm:"default:0"`
	IsActive           bool      `json:"is_active" gorm:"default:true"`
	CreatedBy          uint      `json:"created_by" gorm:"not null"`
	ProjectID          *uint     `json:"project_id"`
	Conditions         string    `json:"conditions" gorm:"type:json"`
	Actions            string    `json:"actions" gorm:"type:json"`
	Metadata           string    `json:"metadata" gorm:"type:json"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`

	// 关联关系
	Creator *User    `json:"creator,omitempty" gorm:"foreignkey:CreatedBy"`
	Project *Project `json:"project,omitempty" gorm:"foreignkey:ProjectID"`
}

// CollaborationSessionDetail 协作会话详情模型
type CollaborationSessionDetail struct {
	ID                   uint       `json:"id" gorm:"primary_key"`
	SessionID            string     `json:"session_id" gorm:"not null;size:255"`
	UserID               uint       `json:"user_id" gorm:"not null"`
	ProjectID            uint       `json:"project_id" gorm:"not null"`
	StartTime            time.Time  `json:"start_time" gorm:"not null"`
	EndTime              *time.Time `json:"end_time"`
	DurationSeconds      int        `json:"duration_seconds" gorm:"default:0"`
	ActionsCount         int        `json:"actions_count" gorm:"default:0"`
	ConflictsEncountered int        `json:"conflicts_encountered" gorm:"default:0"`
	ConflictsResolved    int        `json:"conflicts_resolved" gorm:"default:0"`
	ProductivityScore    float64    `json:"productivity_score" gorm:"type:decimal(5,2);default:0.00"`
	CollaborationQuality float64    `json:"collaboration_quality" gorm:"type:decimal(5,2);default:0.00"`
	DeviceInfo           string     `json:"device_info" gorm:"type:json"`
	NetworkInfo          string     `json:"network_info" gorm:"type:json"`
	PerformanceMetrics   string     `json:"performance_metrics" gorm:"type:json"`
	CreatedAt            time.Time  `json:"created_at"`
	UpdatedAt            time.Time  `json:"updated_at"`

	// 关联关系
	User    *User    `json:"user,omitempty" gorm:"foreignkey:UserID"`
	Project *Project `json:"project,omitempty" gorm:"foreignkey:ProjectID"`
}

// BeforeCreate 钩子
func (tp *TaskPermission) BeforeCreate(scope *gorm.Scope) error {
	now := time.Now()
	scope.SetColumn("CreatedAt", now)
	scope.SetColumn("UpdatedAt", now)
	scope.SetColumn("GrantedAt", now)
	return nil
}

func (rcs *RealtimeCollaborationStatus) BeforeCreate(scope *gorm.Scope) error {
	now := time.Now()
	scope.SetColumn("CreatedAt", now)
	scope.SetColumn("UpdatedAt", now)
	scope.SetColumn("LastActivity", now)
	return nil
}

func (ca *CollaborationAnalytics) BeforeCreate(scope *gorm.Scope) error {
	now := time.Now()
	scope.SetColumn("CreatedAt", now)
	scope.SetColumn("UpdatedAt", now)
	return nil
}

func (crr *ConflictResolutionRule) BeforeCreate(scope *gorm.Scope) error {
	now := time.Now()
	scope.SetColumn("CreatedAt", now)
	scope.SetColumn("UpdatedAt", now)
	return nil
}

func (csd *CollaborationSessionDetail) BeforeCreate(scope *gorm.Scope) error {
	now := time.Now()
	scope.SetColumn("CreatedAt", now)
	scope.SetColumn("UpdatedAt", now)
	scope.SetColumn("StartTime", now)
	return nil
}

// BeforeUpdate 钩子
func (tp *TaskPermission) BeforeUpdate(scope *gorm.Scope) error {
	scope.SetColumn("UpdatedAt", time.Now())
	return nil
}

func (rcs *RealtimeCollaborationStatus) BeforeUpdate(scope *gorm.Scope) error {
	scope.SetColumn("UpdatedAt", time.Now())
	scope.SetColumn("LastActivity", time.Now())
	return nil
}

func (ca *CollaborationAnalytics) BeforeUpdate(scope *gorm.Scope) error {
	scope.SetColumn("UpdatedAt", time.Now())
	return nil
}

func (crr *ConflictResolutionRule) BeforeUpdate(scope *gorm.Scope) error {
	scope.SetColumn("UpdatedAt", time.Now())
	return nil
}

func (csd *CollaborationSessionDetail) BeforeUpdate(scope *gorm.Scope) error {
	scope.SetColumn("UpdatedAt", time.Now())
	return nil
}

// ==================== 任务操作记录相关模型 ====================

// TaskActivity 任务活动记录模型
type TaskActivity struct {
	ID          uint      `json:"id" gorm:"primary_key;AUTO_INCREMENT"`
	TaskID      uint      `json:"task_id" gorm:"not null;index"`
	UserID      uint      `json:"user_id" gorm:"not null;index"`
	ProjectID   uint      `json:"project_id" gorm:"not null;index"`
	ActionType  string    `json:"action_type" gorm:"size:255"`
	Description string    `json:"description" gorm:"type:text"`
	FieldName   string    `json:"field_name" gorm:"size:255"`
	OldValue    string    `json:"old_value" gorm:"type:text"`
	NewValue    string    `json:"new_value" gorm:"type:text"`
	Metadata    string    `json:"metadata" gorm:"type:json"`
	IPAddress   string    `json:"ip_address" gorm:"size:45"`
	UserAgent   string    `json:"user_agent" gorm:"size:255"`
	CreatedAt   time.Time `json:"created_at"`
}

func (TaskActivity) TableName() string {
	return "task_activities"
}