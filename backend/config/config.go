package config

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net"
	"os"
	"strconv"
	"strings"
)

// Config 应用配置结构�?
type Config struct {
	Server     ServerConfig
	Database   DatabaseConfig
	JWT        JWTConfig
	CORS       CORSConfig
	Monitoring MonitoringConfig
}

// ServerConfig 服务器配�?
type ServerConfig struct {
	Port string
	Mode string
}

// DatabaseConfig 数据库配�?
type DatabaseConfig struct {
	Type string // 数据库类型（sqlite3）
	Path string // SQLite 数据库文件路径
}

// JWTConfig JWT配置
type JWTConfig struct {
	Secret      string
	ExpireHours int
}

// CORSConfig 跨域配置
type CORSConfig struct {
	Origin string
}

// MonitoringConfig 性能监控配置
type MonitoringConfig struct {
	Enabled           bool
	CleanupEnabled    bool
	CleanupInterval   int // 清理间隔（小时）
	DataRetentionDays int // 数据保留天数
}

// LoadConfig 加载配置
func LoadConfig() *Config {
	config := &Config{
		Server: ServerConfig{
			Port: getEnv("PORT", "8080"),
			Mode: getEnv("MODE", "debug"),
		},
		Database: DatabaseConfig{
			Type: getEnv("DB_TYPE", "sqlite3"),
			Path: getEnv("DB_PATH", "data/project_manager.db"),
		},
		JWT: JWTConfig{
			Secret:      getEnv("JWT_SECRET", ""),
			ExpireHours: getEnvAsInt("JWT_EXPIRE_HOURS", 24),
		},
		CORS: CORSConfig{
			Origin: getEnv("CORS_ORIGIN", "*"),
		},
		Monitoring: MonitoringConfig{
			Enabled:           getEnvAsBool("MONITORING_ENABLED", true),
			CleanupEnabled:    getEnvAsBool("MONITORING_CLEANUP_ENABLED", true),
			CleanupInterval:   getEnvAsInt("MONITORING_CLEANUP_INTERVAL", 24),
			DataRetentionDays: getEnvAsInt("MONITORING_DATA_RETENTION_DAYS", 7),
		},
	}

	if config.JWT.Secret == "" {
		config.JWT.Secret = generateLocalSecret()
	}

	// 验证配置
	validateConfig(config)

	return config
}

// getEnv 获取环境变量，如果不存在则返回默认�?
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// getEnvAsInt 获取环境变量并转换为整数
func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

// getEnvAsBool 获取环境变量并转换为布尔�?
func getEnvAsBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if boolValue, err := strconv.ParseBool(value); err == nil {
			return boolValue
		}
	}
	return defaultValue
}

func generateLocalSecret() string {
	hostname, _ := os.Hostname()

	var macs []string
	if ifaces, err := net.Interfaces(); err == nil {
		for _, iface := range ifaces {
			if len(iface.HardwareAddr) > 0 {
				macs = append(macs, iface.HardwareAddr.String())
			}
		}
	}

	source := hostname + strings.Join(macs, "")
	if source == "" {
		source = "local_default_secret_seed"
	}

	hash := sha256.Sum256([]byte(source))
	return hex.EncodeToString(hash[:])
}

// validateConfig 验证配置，确保关键环境变量已正确设置
func validateConfig(config *Config) {
	var errors []string

	// 检查JWT密钥
	if len(config.JWT.Secret) < 16 {
		errors = append(errors, "JWT密钥未设置或太短，请设置 JWT_SECRET 环境变量（至少16位）")
	}

	// 检查生产环境模式
	if config.Server.Mode == "release" {
		if strings.Contains(config.CORS.Origin, "localhost") {
			errors = append(errors, "生产环境不应使用localhost作为CORS源")
		}
	}

	if len(errors) > 0 {
		fmt.Println("配置验证失败:")
		for _, err := range errors {
			fmt.Printf("  - %s\n", err)
		}
		fmt.Println("\n提示: 所有配置都有默认值，无需额外配置即可运行")
		os.Exit(1)
	}

	fmt.Println("配置验证通过 ✓")
}
