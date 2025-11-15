@echo off
echo 正在重置数据库...
echo.

REM 检查数据库文件是否存在
if exist "data\project_manager.db" (
    echo 发现数据库文件: data\project_manager.db
    echo.
    echo 警告：此操作将删除所有数据！
    echo.
    set /p confirm="确定要删除数据库文件吗？(y/N): "
    if /i "%confirm%"=="y" (
        del "data\project_manager.db"
        echo 数据库文件已删除
        echo.
        echo 请重新启动后端服务，GORM 会自动创建新的数据库表
    ) else (
        echo 操作已取消
    )
) else (
    echo 数据库文件不存在，无需重置
)

pause

