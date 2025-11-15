@echo off
chcp 65001 >nul
echo 正在启动项目（最小化窗口）...
echo.

echo [1/2] 启动后端服务（最小化窗口）...
start "后端服务" /min cmd /k "cd /d %~dp0backend && go run main.go"
timeout /t 2 /nobreak >nul

echo [2/2] 启动前端服务（最小化窗口）...
start "前端服务" /min cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo 前后端服务已启动（最小化窗口）！
echo 服务窗口已最小化到任务栏，可以随时点击查看日志
echo 关闭窗口即可停止对应的服务
echo.
pause

