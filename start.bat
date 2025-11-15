@echo off
chcp 65001 >nul
echo ========================================
echo 项目管理系统 - 启动脚本
echo ========================================
echo.

REM 检查是否已安装依赖
if not exist "backend\go.mod" (
    echo ❌ 错误: 未找到后端项目文件
    echo 请先运行 install.bat 安装依赖
    pause
    exit /b 1
)

if not exist "frontend\node_modules" (
    echo ⚠️  警告: 前端依赖未安装
    echo 正在自动安装前端依赖...
    cd /d %~dp0frontend
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ 前端依赖安装失败，请手动运行 install.bat
        pause
        exit /b 1
    )
    cd /d %~dp0
    echo ✓ 前端依赖安装完成
    echo.
)

echo [1/2] 启动后端服务...
echo 后端服务将在 http://localhost:8080 启动
start "后端服务" cmd /k "cd /d %~dp0backend && go run main.go"
timeout /t 3 /nobreak >nul

echo [2/2] 启动前端服务...
echo 前端服务将在 http://localhost:3000 启动
start "前端服务" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ========================================
echo ✓ 前后端服务已启动！
echo ========================================
echo.
echo 访问地址: http://localhost:3000
echo 后端 API: http://localhost:8080
echo.
echo 提示：
echo   - 关闭窗口即可停止对应的服务
echo   - 如需后台运行，请使用 start_background.bat
echo   - 如需最小化窗口运行，请使用 start_minimized.bat
echo.
pause
