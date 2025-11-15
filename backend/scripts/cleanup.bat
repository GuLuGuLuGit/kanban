@echo off
echo 性能监控数据清理工具
echo ====================

REM 设置默认保留天数
set RETENTION_DAYS=7

REM 如果提供了参数，使用参数值
if not "%1"=="" set RETENTION_DAYS=%1

echo 清理 %RETENTION_DAYS% 天前的数据...
echo.

REM 切换到项目根目录
cd /d "%~dp0.."

REM 运行清理程序
go run scripts/cleanup_performance_data.go %RETENTION_DAYS%

echo.
echo 清理完成！
pause
