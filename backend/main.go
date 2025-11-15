package main

import (
	"log"
	"project-manager-backend/config"
	"project-manager-backend/database"
	"project-manager-backend/routes"
)

func main() {
	// 加载配置
	cfg := config.LoadConfig()
	log.Println("Configuration loaded successfully")

	// 初始化数据库
	database.InitDatabase(cfg)
	defer database.CloseDatabase()

	// 设置路由
	r := routes.SetupRoutes(cfg)
	log.Println("Routes configured successfully")

	// 启动服务器
	port := ":" + cfg.Server.Port
	log.Printf("Server starting on port %s", cfg.Server.Port)
	log.Printf("Server mode: %s", cfg.Server.Mode)

	if err := r.Run(port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
