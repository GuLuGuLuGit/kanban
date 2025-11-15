@echo off
chcp 65001 >nul
echo ========================================
echo 项目管理系统 - 依赖安装脚本
echo ========================================
echo.

echo [1/3] 检查环境...
echo.

REM 检查 Go
where go >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: 未找到 Go，请先安装 Go 1.24+
    echo 下载地址: https://golang.org/dl/
    pause
    exit /b 1
)
go version
echo ✓ Go 已安装
echo.

REM 检查 Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: 未找到 Node.js，请先安装 Node.js 16+
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)
node --version
echo ✓ Node.js 已安装
echo.

REM 检查 npm
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: 未找到 npm
    pause
    exit /b 1
)
npm --version
echo ✓ npm 已安装
echo.

echo [2/3] 安装后端依赖...
cd /d %~dp0backend
if not exist go.mod (
    echo ❌ 错误: 未找到 go.mod 文件
    pause
    exit /b 1
)
go mod download
if %errorlevel% neq 0 (
    echo ❌ 后端依赖安装失败
    pause
    exit /b 1
)
echo ✓ 后端依赖安装完成
echo.

echo [3/3] 安装前端依赖...
cd /d %~dp0frontend
if not exist package.json (
    echo ❌ 错误: 未找到 package.json 文件
    pause
    exit /b 1
)
call npm install
if %errorlevel% neq 0 (
    echo ❌ 前端依赖安装失败
    pause
    exit /b 1
)
echo ✓ 前端依赖安装完成
echo.

cd /d %~dp0
echo ========================================
echo ✓ 所有依赖安装完成！
echo ========================================
echo.
echo 现在可以运行 start.bat 启动项目了
echo.
pause

