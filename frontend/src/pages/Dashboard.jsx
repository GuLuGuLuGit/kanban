import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useProjects } from '../contexts/ProjectsContext';
import { projectAPI, taskAPI } from '../services/api';
import { 
  Plus, 
  FolderOpen, 
  Users, 
  User,
  Calendar, 
  MoreVertical,
  Sparkles,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckSquare,
  PlayCircle,
  ListChecks,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import CreateProjectModal from '../components/CreateProjectModal';

const Dashboard = () => {
  const { projects, setProjects, loading } = useProjects();
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false); // 任务加载状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 视图模式：grid, list, kanban, timeline, calendar
  const [currentDate, setCurrentDate] = useState(new Date()); // 日历当前日期
  
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();

  // 日历相关辅助函数
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // 添加上个月的末尾几天
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i);
      days.push({
        date: prevDate,
        isCurrentMonth: false,
        isToday: false
      });
    }
    
    // 添加当前月的所有天
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      const today = new Date();
      days.push({
        date: currentDate,
        isCurrentMonth: true,
        isToday: currentDate.toDateString() === today.toDateString()
      });
    }
    
    // 添加下个月的开头几天，使日历完整
    const remainingDays = 42 - days.length; // 6行 x 7天 = 42天
    for (let day = 1; day <= remainingDays; day++) {
      const nextDate = new Date(year, month + 1, day);
      days.push({
        date: nextDate,
        isCurrentMonth: false,
        isToday: false
      });
    }
    
    return days;
  };

  const getTasksForDate = (date) => {
    return tasks.filter(task => {
      if (!task.due_date) return false;
      if (task.status === 'done') return false; // 不显示已完成的任务
      const taskDate = new Date(task.due_date);
      return taskDate.toDateString() === date.toDateString();
    });
  };

  // 获取任务状态颜色
  const getTaskStatusColor = (status) => {
    switch (status) {
      case 'todo':
        return 'bg-amber-100 text-amber-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'done':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setMonth(prevDate.getMonth() + direction);
      return newDate;
    });
  };

  // 添加调试信息
  console.log('Dashboard组件渲染，用户信息:', user);
  console.log('用户权限:', { 
    create_project: hasPermission('create_project')
  });

  // 项目列表由Layout组件管理，这里不需要获取

  // 当项目列表更新时，获取所有任务 - 添加防抖避免频繁调用
  useEffect(() => {
    if (projects.length > 0) {
      // 添加防抖，避免频繁的API调用导致抖动
      const timeoutId = setTimeout(() => {
        console.log('Dashboard: 项目列表变化，获取所有任务');
        fetchAllTasks();
      }, 100);
      
      return () => clearTimeout(timeoutId);
    } else {
      // 如果没有项目，清空任务列表
      setTasks([]);
    }
  }, [projects]);

  // 获取所有任务
  const fetchAllTasks = async () => {
    setTasksLoading(true);
    try {
      const allTasks = [];
      for (const project of projects) {
        try {
          const projectTasksResponse = await taskAPI.getProjectTasks(project.id);
          // 处理API返回的数据结构：{ project_id, tasks: [...], total }
          const projectTasks = projectTasksResponse.tasks || projectTasksResponse;
          const tasksWithProject = projectTasks.map(task => ({
            ...task,
            project_name: project.name,
            project_id: project.id
          }));
          allTasks.push(...tasksWithProject);
        } catch (error) {
          console.error(`获取项目 ${project.id} 的任务失败:`, error);
        }
      }
      setTasks(allTasks);
    } catch (error) {
      console.error('获取任务列表失败:', error);
    } finally {
      setTasksLoading(false);
    }
  };

  // 直接使用Layout组件已经排序好的项目列表，避免重新排序导致顺序变化
  const sortedProjects = projects;

  // fetchProjects函数已移除，项目数据由Layout组件管理

  // 创建项目
  const handleCreateProject = async (projectData) => {
    try {
      const response = await projectAPI.createProject(projectData);
      // 处理API返回的数据结构：response.project 或直接是 response
      const newProject = response.project || response;
      
      // 为新项目获取任务统计信息（保持与Layout组件的数据结构一致）
      let projectWithStats;
      try {
        const projectTasksResponse = await taskAPI.getProjectTasks(newProject.id);
        const projectTasks = projectTasksResponse.data ? projectTasksResponse.data.tasks : projectTasksResponse.tasks || [];
        
        // 计算任务统计
        const taskStats = {
          total: projectTasks.length,
          todo: projectTasks.filter(task => task.status === 'todo').length,
          in_progress: projectTasks.filter(task => task.status === 'in_progress').length,
          completed: projectTasks.filter(task => task.status === 'done').length,
          cancelled: projectTasks.filter(task => task.status === 'cancelled').length
        };
        
        // 检查过期任务
        const hasOverdueTasks = projectTasks.some(task => {
          if (!task.due_date) return false;
          const dueDate = new Date(task.due_date);
          const now = new Date();
          const isOverdue = dueDate < now;
          const isNotCompleted = task.status !== 'done';
          return isOverdue && isNotCompleted;
        });
        
        projectWithStats = {
          ...newProject,
          hasOverdueTasks,
          taskStats
        };
      } catch (error) {
        console.error('获取新项目任务统计失败:', error);
        // 如果获取失败，使用默认值
        projectWithStats = {
          ...newProject,
          hasOverdueTasks: false,
          taskStats: {
            total: 0,
            todo: 0,
            in_progress: 0,
            completed: 0,
            cancelled: 0
          }
        };
      }
      
      // 使用函数式更新，确保使用最新的项目列表
      setProjects(prev => {
        // 检查是否已存在（避免重复添加）
        const exists = prev.find(p => p.id === newProject.id);
        if (exists) {
          return prev;
        }
        // 将新项目添加到列表开头（最新的项目在前）
        return [projectWithStats, ...prev];
      });
      setShowCreateModal(false);
    } catch (error) {
      console.error('创建项目失败:', error);
    }
  };

  // 快速完成任务
  const handleQuickCompleteTask = async (taskId, e) => {
    e.stopPropagation(); // 阻止事件冒泡，避免触发任务点击
    
    try {
      // 更新任务状态为已完成
      await taskAPI.updateTask(taskId, { status: 'done' });
      
      // 更新本地任务状态
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId 
            ? { ...task, status: 'done' }
            : task
        )
      );
      
      // 重新加载项目数据以更新统计信息
      await loadProjects();
    } catch (error) {
      console.error('快速完成任务失败:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-white border-t-transparent"></div>
          </div>
          <p className="text-gray-600 font-medium">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100/50">
      <div className="py-8 pl-4">
        {/* 页面标题区域 */}
        {/* 页面标题 */}
        <div className="bg-gradient-to-r from-white to-gray-50 rounded-lg p-6 shadow-sm border border-gray-200 mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">项目仪表板</h1>
            </div>
            
            {/* 视图切换下拉框 */}
            <div className="flex items-center space-x-2">
              <div className="relative">
                 <select 
                   value={viewMode}
                   onChange={(e) => setViewMode(e.target.value)}
                   className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
                 >
                   <option value="grid">网格视图</option>
                   <option value="list">列表视图</option>
                   <option value="timeline">时间线视图</option>
                   <option value="calendar">日历视图</option>
                 </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* 日历视图 */}
        {viewMode === 'calendar' && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden flex flex-col max-h-[80vh]">
            {/* 日历头部 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50 flex-shrink-0">
              <h2 className="text-xl font-bold text-gray-900">
                {currentDate.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })}
              </h2>
              <div className="flex items-center space-x-4">
                {/* 任务状态图例 */}
                <div className="flex items-center space-x-3 text-sm">
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded bg-amber-100 border-l-2 border-amber-400"></div>
                    <span className="text-gray-600">待开始</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded bg-blue-100 border-l-2 border-blue-400"></div>
                    <span className="text-gray-600">进行中</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded bg-green-100 border-l-2 border-green-400"></div>
                    <span className="text-gray-600">已结束</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => navigateMonth(-1)}
                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <button
                    onClick={() => setCurrentDate(new Date())}
                    className="px-3 py-1 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                  >
                    今天
                  </button>
                  <button
                    onClick={() => navigateMonth(1)}
                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>

            {/* 日历网格 - 可滚动区域 */}
            <div className="flex-1 overflow-y-auto p-6 group/scrollbar">
              {/* 星期标题 */}
              <div className="grid grid-cols-7 gap-1 mb-4">
                {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
                  <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* 任务加载状态 */}
              {tasksLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <div className="animate-spin rounded-full h-8 w-8 border-4 border-white border-t-transparent"></div>
                    </div>
                    <p className="text-gray-600 font-medium">加载任务中...</p>
                    <p className="text-sm text-gray-500 mt-1">正在获取日历任务数据</p>
                  </div>
                </div>
              ) : (
                /* 日期网格 */
                <div className="grid grid-cols-7 gap-1">
                {getDaysInMonth(currentDate).map((day, index) => {
                  const dayTasks = getTasksForDate(day.date);
                  return (
                    <div
                      key={index}
                      className={`min-h-[140px] p-2 border border-gray-100 rounded-lg ${
                        day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                      } ${day.isToday ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
                    >
                      <div className={`text-sm font-medium mb-2 ${
                        day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                      } ${day.isToday ? 'text-blue-600' : ''}`}>
                        {day.date.getDate()}
                      </div>
                      
                      {/* 任务列表 */}
                      <div className="space-y-1">
                        {dayTasks.slice(0, 3).map((task) => (
                          <div
                            key={task.id}
                            className={`group relative text-xs p-2 rounded-lg cursor-pointer hover:shadow-md transition-all duration-200 ${getTaskStatusColor(task.status)}`}
                            onClick={() => navigate(`/projects/${task.project_id}`)}
                            title={`${task.title} - ${task.status === 'todo' ? '待开始' : task.status === 'in_progress' ? '进行中' : task.status === 'done' ? '已完成' : task.status === 'cancelled' ? '已取消' : '未知'}`}
                          >
                            <div className="flex items-center justify-between min-h-[20px]">
                              <span className="flex-1 truncate pr-1 font-medium max-w-[120px]" title={task.title}>{task.title}</span>
                              {/* 快速完成按钮 - 只在非已完成状态时显示 */}
                              {task.status !== 'done' && (
                                <button
                                  onClick={(e) => handleQuickCompleteTask(task.id, e)}
                                  className="opacity-0 group-hover:opacity-100 ml-1 p-1 rounded bg-green-500 hover:bg-green-600 transition-all duration-200 flex-shrink-0 shadow-sm z-10"
                                  title="快速完成"
                                  style={{ minWidth: '20px', minHeight: '20px' }}
                                >
                                  <CheckSquare className="h-3 w-3 text-white" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                        {dayTasks.length > 3 && (
                          <div className="text-xs text-gray-500 text-center">
                            +{dayTasks.length - 3} 更多
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 项目网格 */}
        {viewMode !== 'calendar' && sortedProjects.length === 0 ? (
          <div className="text-center py-20 bg-white/80 backdrop-blur-sm rounded-3xl border border-white/20 shadow-lg">
            <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-6">
              <FolderOpen className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              暂无项目
            </h3>
          </div>
        ) : viewMode !== 'calendar' ? (
          viewMode === 'list' ? (
            /* 列表视图 */
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              {/* 列表内容 */}
              <div className="max-h-[calc(100vh-250px)] overflow-y-auto group/scrollbar">
                <div className="p-4 space-y-3">
                  {sortedProjects.map((project) => {
                    const hasOverdueTasks = project.hasOverdueTasks || false;
                    const isTeamProject = project.project_type === 'team';
                    const isPersonalProject = project.project_type === 'personal';
                    
                    return (
                      <div
                        key={project.id}
                        className={`group relative bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-blue-300 transition-all duration-200 cursor-pointer ${
                          hasOverdueTasks 
                            ? 'border-red-200 bg-red-50/50' 
                            : isTeamProject
                              ? 'border-purple-200 bg-purple-50/30 hover:bg-purple-50/50'
                              : isPersonalProject
                                ? 'border-blue-200 bg-blue-50/30 hover:bg-blue-50/50'
                                : 'hover:bg-gray-50'
                        }`}
                        onClick={() => navigate(`/projects/${project.id}`)}
                      >
                        <div className="flex items-start justify-between">
                          {/* 左侧：项目信息 */}
                          <div className="flex-1 min-w-0 mr-4">
                            <div className="flex items-start space-x-3">
                              {/* 状态指示器 */}
                              <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${
                                hasOverdueTasks 
                                  ? 'bg-red-500' 
                                  : isTeamProject
                                    ? 'bg-purple-500'
                                    : isPersonalProject
                                      ? 'bg-blue-500'
                                      : 'bg-green-500'
                              }`}></div>
                              
                              {/* 项目详情 */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                  <h3 className="text-base font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                                    {project.name}
                                  </h3>
                                  {/* 项目类型标识 */}
                                  {isTeamProject && (
                                    <div className="flex items-center px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium flex-shrink-0">
                                      <Users className="h-3 w-3 mr-1" />
                                      团队
                                    </div>
                                  )}
                                  {isPersonalProject && (
                                    <div className="flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium flex-shrink-0">
                                      <User className="h-3 w-3 mr-1" />
                                      个人
                                    </div>
                                  )}
                                </div>
                                
                                {/* 描述 */}
                                <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed mb-2">
                                  {project.description || '暂无项目描述'}
                                </p>
                                
                                {/* 项目元信息 */}
                                <div className="flex items-center space-x-4 text-xs text-gray-500">
                                  <div className="flex items-center space-x-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>{project.created_at ? new Date(project.created_at).toLocaleDateString('zh-CN') : ''}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* 右侧：统计和状态 */}
                          <div className="flex items-center space-x-4 flex-shrink-0">
                            {/* 任务统计 */}
                            <div className="text-center">
                              <div className="flex items-center space-x-3 text-sm">
                                <div className="flex items-center space-x-1">
                                  <PlayCircle className="h-4 w-4 text-blue-500" />
                                  <span className="font-medium text-blue-600">{project.taskStats?.in_progress || 0}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <CheckSquare className="h-4 w-4 text-green-500" />
                                  <span className="font-medium text-green-600">{project.taskStats?.completed || 0}</span>
                                </div>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                总计 {project.taskStats?.total || 0}
                              </div>
                            </div>
                            
                            {/* 状态 */}
                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                              hasOverdueTasks 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {hasOverdueTasks ? '逾期' : '正常'}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : viewMode === 'timeline' ? (
            /* 时间线视图 */
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              {/* 时间线头部 */}
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900">项目时间线</h3>
                <p className="text-sm text-gray-600 mt-1">按创建时间顺序显示项目进展</p>
              </div>
              
              {/* 时间线内容 */}
              <div className="p-6 max-h-[70vh] overflow-y-auto group/scrollbar">
                <div className="relative">
                  {/* 时间线轴线 */}
                  <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-200 via-gray-200 to-gray-200"></div>
                  
                   {/* 时间线项目 */}
                   <div className="space-y-8">
                     {sortedProjects.map((project, index) => {
                      const hasOverdueTasks = project.hasOverdueTasks || false;
                      const isTeamProject = project.project_type === 'team';
                      const isPersonalProject = project.project_type === 'personal';
                      const createdDate = new Date(project.created_at);
                      const isLast = index === sortedProjects.length - 1;
                      
                      return (
                        <div key={project.id} className="relative">
                          {/* 时间线节点 */}
                          <div className={`absolute left-6 w-4 h-4 bg-white border-2 rounded-full flex items-center justify-center z-10 shadow-sm ${
                            hasOverdueTasks 
                              ? 'border-red-400' 
                              : isTeamProject
                                ? 'border-purple-400'
                                : isPersonalProject
                                  ? 'border-blue-400'
                                  : 'border-blue-400'
                          }`}>
                            <div className={`w-2 h-2 rounded-full ${
                              hasOverdueTasks 
                                ? 'bg-red-500' 
                                : isTeamProject
                                  ? 'bg-purple-500'
                                  : isPersonalProject
                                    ? 'bg-blue-500'
                                    : 'bg-blue-500'
                            }`}></div>
                          </div>
                          
                          {/* 连接线到下一个节点 */}
                          {!isLast && (
                            <div className="absolute left-8 top-4 w-0.5 h-8 bg-gradient-to-b from-gray-300 to-gray-200"></div>
                          )}
                          
                          {/* 项目卡片 */}
                          <div className={`ml-16 p-6 rounded-xl border-2 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer ${
                            hasOverdueTasks 
                              ? 'border-red-200 bg-gradient-to-br from-red-50 to-pink-50' 
                              : isTeamProject
                                ? 'border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 hover:border-purple-300'
                                : isPersonalProject
                                  ? 'border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 hover:border-blue-300'
                                  : 'border-gray-200 bg-gradient-to-br from-white to-gray-50 hover:border-blue-300'
                          }`}
                          onClick={() => navigate(`/projects/${project.id}`)}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                {/* 项目标题和日期 */}
                                <div className="flex items-center space-x-3 mb-3">
                                  <div className="flex items-center space-x-2">
                                    <h4 className="text-lg font-semibold text-gray-900">
                                      {project.name}
                                    </h4>
                                    {/* 项目类型标识 */}
                                    {isTeamProject && (
                                      <div className="flex items-center px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                                        <Users className="h-3 w-3 mr-1" />
                                        团队
                                      </div>
                                    )}
                                    {isPersonalProject && (
                                      <div className="flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                        <User className="h-3 w-3 mr-1" />
                                        个人
                                      </div>
                                    )}
                                  </div>
                                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    hasOverdueTasks 
                                      ? 'bg-red-100 text-red-800' 
                                      : 'bg-green-100 text-green-800'
                                  }`}>
                                    {hasOverdueTasks ? '逾期' : '正常'}
                                  </div>
                                </div>
                                
                                {/* 项目描述 */}
                                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                                  {project.description || '暂无项目描述'}
                                </p>
                                
                                {/* 项目统计 */}
                                <div className="grid grid-cols-3 gap-4 mb-4">
                                  <div className="text-center">
                                    <div className="text-2xl font-bold text-blue-600">
                                      {project.taskStats?.total || 0}
                                    </div>
                                    <div className="text-xs text-gray-500">总任务</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-2xl font-bold text-orange-600">
                                      {project.taskStats?.in_progress || 0}
                                    </div>
                                    <div className="text-xs text-gray-500">进行中</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-2xl font-bold text-green-600">
                                      {project.taskStats?.completed || 0}
                                    </div>
                                    <div className="text-xs text-gray-500">已完成</div>
                                  </div>
                                </div>
                                
                                {/* 项目信息 */}
                                <div className="flex items-center justify-between text-sm text-gray-500">
                                  <div className="flex items-center space-x-4">
                                    <div className="flex items-center space-x-1">
                                      <Users className="h-4 w-4" />
                                      <span>{project.members?.length || 0} 成员</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      <Calendar className="h-4 w-4" />
                                      <span>创建于 {createdDate.toLocaleDateString('zh-CN')}</span>
                                    </div>
                                  </div>
                                  <div className="text-xs">
                                    {project.end_date 
                                      ? `预计完成: ${new Date(project.end_date).toLocaleDateString('zh-CN')}`
                                      : '无截止日期'
                                    }
                                  </div>
                                </div>
                              </div>
                              
                              {/* 操作按钮 */}
                              <div className="ml-4 flex flex-col space-y-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/projects/${project.id}`);
                                  }}
                                  className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors duration-200"
                                >
                                  查看详情
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/projects/${project.id}?view=kanban`);
                                  }}
                                  className="px-3 py-1 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors duration-200"
                                >
                                  查看看板
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
             /* 网格视图 */
             <div className="max-h-[calc(100vh-250px)] overflow-y-auto group/scrollbar">
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6 justify-items-center">
                 {sortedProjects.map((project) => {
              const hasOverdueTasks = project.hasOverdueTasks || false;
              const isTeamProject = project.project_type === 'team';
              const isPersonalProject = project.project_type === 'personal';
              const totalTasks = project.taskStats?.total || 0;
              const completedTasks = project.taskStats?.completed || 0;
              const inProgressTasks = project.taskStats?.in_progress || 0;
              const effectiveTotal = totalTasks || completedTasks + inProgressTasks;
              const completedRatio = effectiveTotal ? Math.min(completedTasks / effectiveTotal, 1) : 0;
              const inProgressRatio = effectiveTotal
                ? Math.min(inProgressTasks / effectiveTotal, Math.max(1 - completedRatio, 0))
                : 0;
              const progressPercent = Math.round(completedRatio * 100);
              
              return (
                <div 
                  key={project.id} 
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      navigate(`/projects/${project.id}`);
                    }
                  }}
                  className={`group relative bg-white rounded-2xl border-2 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 w-full max-w-sm mx-auto cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-offset-2 focus:ring-offset-white ${
                    hasOverdueTasks 
                      ? 'border-red-200 bg-gradient-to-br from-red-50 to-pink-50' 
                      : isTeamProject
                        ? 'border-purple-200 hover:border-purple-300 bg-gradient-to-br from-purple-50 to-indigo-50'
                        : isPersonalProject
                          ? 'border-blue-200 hover:border-blue-300 bg-gradient-to-br from-blue-50 to-cyan-50'
                          : 'border-gray-200 hover:border-blue-300 bg-gradient-to-br from-white to-gray-50'
                  }`}
                >
                  {/* 过期标识 */}
                  {hasOverdueTasks && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                      <AlertTriangle className="h-3 w-3 text-white" />
                    </div>
                  )}

                  {/* 项目头部 */}
                  <div className="p-6 pb-4">
                    <div className="mb-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors flex-1 min-w-0">
                          {project.name}
                        </h3>
                        {/* 项目类型标识 */}
                        {isTeamProject && (
                          <div className="flex items-center px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium flex-shrink-0">
                            <Users className="h-3 w-3 mr-1" />
                            团队
                          </div>
                        )}
                        {isPersonalProject && (
                          <div className="flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium flex-shrink-0">
                            <User className="h-3 w-3 mr-1" />
                            个人
                          </div>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm leading-relaxed line-clamp-2 break-words">
                        {project.description || '暂无项目描述'}
                      </p>
                    </div>

                    {/* 任务进度展示 */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                        <div className="flex items-center space-x-1">
                          <TrendingUp className="h-3 w-3 text-emerald-500" />
                          <span>任务进度</span>
                        </div>
                        <span className="font-semibold text-gray-700">
                          {progressPercent}%
                        </span>
                      </div>
                      <div className="flex h-2 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full bg-green-500 transition-all duration-500"
                          style={{ width: `${Math.max(0, Math.min(completedRatio * 100, 100))}%` }}
                        />
                        <div
                          className="h-full bg-blue-400 transition-all duration-500"
                          style={{ width: `${Math.max(0, Math.min(inProgressRatio * 100, 100 - completedRatio * 100))}%` }}
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
                        <div className="flex items-center space-x-1">
                          <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                          <span>已完成 {completedTasks}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="inline-block h-2 w-2 rounded-full bg-blue-400" />
                          <span>进行中 {inProgressTasks}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 底部操作栏 */}
                  <div className="px-6 py-4 bg-gray-50/50 rounded-b-2xl border-t border-gray-100">
                    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>
                          {project.end_date 
                            ? new Date(project.end_date).toLocaleDateString('zh-CN', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })
                            : '无截止日期'
                          }
                        </span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <ListChecks className="h-4 w-4 text-gray-400" />
                          <span>任务 {totalTasks}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                 );
               })}
               </div>
             </div>
           )
        ) : null}


        {/* 创建项目模态框 */}
        <CreateProjectModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateProject}
        />


      </div>
    </div>
  );
};

export default Dashboard;
