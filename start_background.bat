@echo off
chcp 65001 >nul
echo 正在后台启动项目...
echo.

echo [1/2] 启动后端服务（后台运行）...
start /b "" cmd /c "cd /d %~dp0backend && go run main.go"
timeout /t 2 /nobreak >nul

echo [2/2] 启动前端服务（后台运行）...
start /b "" cmd /c "cd /d %~dp0frontend && npm run dev"

echo.
echo 前后端服务已在后台启动！
echo 注意：后台运行的服务无法直接查看日志
echo 如需停止服务，请在任务管理器中结束相关进程
echo.
pause

