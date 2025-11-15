import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useProjects } from '../contexts/ProjectsContext';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  LayoutDashboard,
  FolderOpen,
  Plus,
  LogOut,
  User,
  Settings,
  Eye,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import CreateProjectModal from './CreateProjectModal';
import ProjectDetailModal from './ProjectDetailModal';
import CreateTaskModal from './CreateTaskModal';
import TaskDetailModal from './TaskDetailModal';
import EditStageModal from './EditStageModal';
import StageSettingsModal from './StageSettingsModal';
import CreateStageModal from './CreateStageModal';

import { projectAPI, userAPI, stageAPI, taskAPI } from '../services/api';

const Layout = () => {
  const { user, logout, hasPermission, updateUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // 侧边栏固定显示，不需要状态管理



  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const { projects, setProjects, loading, setLoading } = useProjects();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [showTaskDetailModal, setShowTaskDetailModal] = useState(false);
  const [showEditStageModal, setShowEditStageModal] = useState(false);
  const [showStageSettingsModal, setShowStageSettingsModal] = useState(false);
  const [showCreateStageModal, setShowCreateStageModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedStage, setSelectedStage] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [hoveredStage, setHoveredStage] = useState(null);

  // 任务数据状态 - 支持拖拽
  const [stages, setStages] = useState([]);


  // 获取项目数据
  useEffect(() => {
    fetchProjects();
  }, []);





  // 当选中项目变化时，重新获取阶段数据
  useEffect(() => {
    fetchStages();
  }, [selectedProject]);

  // 监听项目列表变化，如果选中的项目被删除，清空相关状态
  useEffect(() => {
    console.log('检查项目是否被删除:', {
      selectedProject: selectedProject?.name || 'null',
      selectedProjectId: selectedProject?.id,
      projectsCount: projects.length,
      projectIds: projects.map(p => p.id),
      showDetailModal: showDetailModal
    });

    if (selectedProject && !projects.find(p => p.id === selectedProject.id)) {
      console.log('⚠️ 选中的项目在列表中未找到');

      // 如果详情模态框正在显示，不要清空selectedProject，避免模态框闪现
      if (!showDetailModal) {
        console.log('详情模态框未打开，清空项目状态');
        clearProjectState();
        // 如果当前在已删除的项目页面，跳转到仪表板
        if (location.pathname.includes(`/projects/${selectedProject.id}`)) {
          navigate('/dashboard');
        }
      } else {
        console.log('详情模态框正在打开，保持selectedProject状态');
      }
    }
  }, [projects, selectedProject, location.pathname, navigate, showDetailModal]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await projectAPI.getProjects();

      // 添加调试信息
      console.log('获取到的项目列表数据:', data);

      // 后端已经返回 task_count，直接使用
      // 处理API返回的数据结构：data.projects 或直接是数组
      const projectsData = data.projects || data;
      if (projectsData && Array.isArray(projectsData)) {
        // 一次性检查过期任务和计算任务统计，避免多次更新导致的顺序变化
        console.log('开始检查项目过期任务状态和计算任务统计...');
        const projectsWithStats = await Promise.all(
          projectsData.map(async (project) => {
            try {
              // 获取项目的任务列表来检查过期状态和计算统计
              const projectTasksResponse = await taskAPI.getProjectTasks(project.id);
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

              return {
                ...project,
                hasOverdueTasks,
                taskStats
              };
            } catch (error) {
              console.error(`检查项目 ${project.id} 过期任务和计算统计失败:`, error);
              return {
                ...project,
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
          })
        );

        // 在设置项目列表前进行稳定排序，避免后续顺序变化
        const sortedProjects = projectsWithStats.sort((a, b) => {
          // 主要按创建时间倒序排列（最新的在前），保持稳定的基础顺序
          const aDate = new Date(a.created_at || 0);
          const bDate = new Date(b.created_at || 0);
          const timeSort = bDate - aDate;

          // 如果创建时间相同，再考虑过期状态（作为次要排序条件）
          if (timeSort === 0) {
            if (a.hasOverdueTasks && !b.hasOverdueTasks) return -1;
            if (!a.hasOverdueTasks && b.hasOverdueTasks) return 1;
          }

          return timeSort;
        });

        // 一次性设置完整的项目列表，避免多次更新
        setProjects(sortedProjects);
        console.log('项目列表设置完成，包含过期任务状态和稳定排序');
      } else {
        setProjects([]);
      }
    } catch (error) {
      console.error('获取项目列表失败:', error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };



  // 根据阶段获取任务状态
  const getStatusByStage = (stageId) => {
    switch (stageId) {
      case 'design': return '设计中';
      case 'development': return '开发中';
      case 'testing': return '测试中';
      case 'release': return '待发布';
      default: return '待开始';
    }
  };

  // 获取阶段颜色样式
  const getStageColor = (color) => {
    const colorMap = {
      yellow: 'bg-yellow-100 border-yellow-500 text-yellow-800',
      blue: 'bg-blue-100 border-blue-500 text-blue-800',
      purple: 'bg-purple-100 border-purple-500 text-purple-800',
      green: 'bg-green-100 border-green-500 text-green-800'
    };
    return colorMap[color] || 'bg-gray-100 border-gray-500 text-gray-800';
  };

  // 处理新任务创建成功
  const handleTaskCreated = (newTask) => {
    console.log('任务创建成功，开始更新状态:', { newTask, selectedStage, selectedProject });

    // 更新阶段中的任务列表
    if (selectedStage) {
      setStages(prevStages => {
        return prevStages.map(stage => {
          if (stage.id === selectedStage.id) {
            return {
              ...stage,
              tasks: [...stage.tasks, newTask]
            };
          }
          return stage;
        });
      });
    }

    // 更新项目列表中的任务数量
    const projectId = newTask.project_id || selectedProject?.id;
    if (projectId) {
      updateProjectTaskCount(projectId, 1);
    } else {
      console.warn('无法确定项目ID，跳过任务数量更新');
    }
  };

  // 处理任务拖拽结束
  const handleDragEnd = async (result) => {
    console.log('拖拽结束:', result);

    if (!result.destination) {
      console.log('没有目标位置，拖拽取消');
      return;
    }

    const { source, destination } = result;
    console.log('源位置:', source, '目标位置:', destination);

    // 如果拖拽到同一个位置，不做任何操作
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      console.log('拖拽到相同位置，无需更新');
      return;
    }

    // 保存原始状态，用于错误回滚
    const originalStages = stages;

    // 先进行乐观更新UI
    const optimisticStages = [...stages];
    const sourceStageIndex = optimisticStages.findIndex(stage => stage.id === source.droppableId);
    const destStageIndex = optimisticStages.findIndex(stage => stage.id === destination.droppableId);

    if (sourceStageIndex === -1 || destStageIndex === -1) {
      console.log('找不到阶段:', { sourceStageIndex, destStageIndex });
      return;
    }

    const sourceStage = { ...optimisticStages[sourceStageIndex] };
    const destStage = { ...optimisticStages[destStageIndex] };

    // 从源阶段移除任务
    const [movedTask] = sourceStage.tasks.splice(source.index, 1);

    // 如果拖拽到不同阶段，更新任务状态
    if (source.droppableId !== destination.droppableId) {
      movedTask.status = getStatusByStage(destination.droppableId);
    }

    // 添加到目标阶段
    destStage.tasks.splice(destination.index, 0, movedTask);

    // 更新阶段
    optimisticStages[sourceStageIndex] = sourceStage;
    optimisticStages[destStageIndex] = destStage;

    // 立即更新UI（乐观更新）
    setStages(optimisticStages);

    try {
      // 调用API移动任务，包含位置信息
      const response = await taskAPI.moveTask(result.draggableId, {
        newStageId: destination.droppableId,
        newPosition: destination.index
      });

      console.log('✅ 任务移动API调用成功:', response);

      // 如果API返回了更新后的任务数据，使用服务器数据更新本地状态
      if (response.data && response.data.task) {
        const serverTask = response.data.task;
        setStages(prevStages => {
          return prevStages.map(stage => {
            return {
              ...stage,
              tasks: stage.tasks.map(task =>
                task.id === serverTask.id ? { ...task, ...serverTask } : task
              )
            };
          });
        });
      }

      console.log('任务移动完成，数据已同步');
    } catch (error) {
      console.error('❌ 移动任务失败:', error);

      // 发生错误时回滚到原始状态
      console.log('回滚到原始状态');
      setStages(originalStages);

      // 显示更详细的错误信息
      const errorMessage = error.response?.data?.message || error.message || '移动任务失败，请稍后重试';
      alert(`检测到数据不一致，任务移动可能没有正确保存。请刷新页面或联系管理员。\n\n错误详情: ${errorMessage}`);
    }
  };

  // 处理任务更新
  const handleTaskUpdated = (updatedTask) => {
    setStages(prevStages => {
      return prevStages.map(stage => {
        return {
          ...stage,
          tasks: stage.tasks.map(task =>
            task.id === updatedTask.id ? updatedTask : task
          )
        };
      });
    });
  };

  // 处理任务删除
  const handleTaskDeleted = (taskId) => {
    console.log('任务删除成功，开始更新状态:', { taskId, selectedProject });

    // 更新阶段中的任务列表
    setStages(prevStages => {
      return prevStages.map(stage => {
        return {
          ...stage,
          tasks: stage.tasks.filter(task => task.id !== taskId)
        };
      });
    });

    // 更新项目列表中的任务数量
    if (selectedProject?.id) {
      updateProjectTaskCount(selectedProject.id, -1);
    } else {
      console.warn('无法确定项目ID，跳过任务数量更新');
    }
  };

  // 处理阶段编辑
  const handleEditStage = (stage) => {
    setSelectedStage(stage);
    setShowEditStageModal(true);
  };

  // 处理阶段删除
  const handleDeleteStage = async (stage) => {
    if (window.confirm(`确定要删除阶段 "${stage.name}" 吗？\n\n注意：删除阶段会同时删除该阶段下的所有任务，此操作不可撤销。`)) {
      try {
        await stageAPI.deleteStage(stage.id);
        setStages(prevStages => prevStages.filter(s => s.id !== stage.id));
      } catch (error) {
        console.error('删除阶段失败:', error);
        alert('删除阶段失败，请稍后重试');
      }
    }
  };

  // 处理阶段设置
  const handleStageSettings = (stage) => {
    setSelectedStage(stage);
    setShowStageSettingsModal(true);
  };

  // 处理阶段更新
  const handleStageUpdated = (updatedStage) => {
    setStages(prevStages => {
      return prevStages.map(stage =>
        stage.id === updatedStage.id ? updatedStage : stage
      );
    });
  };

  // 处理新阶段创建成功
  const handleStageCreated = (newStage) => {
    setStages(prevStages => [...prevStages, newStage]);
  };

  // 获取阶段数据
  const fetchStages = async () => {
    try {
      // 如果有选中的项目，获取该项目的阶段
      if (selectedProject?.id) {
        const response = await stageAPI.getProjectStages(selectedProject.id);
        console.log('获取阶段列表响应:', response);

        // 从API响应中提取阶段数据
        const stagesData = response.data ? response.data.stages : response;
        console.log('提取的阶段数据:', stagesData);

        setStages(stagesData || []);
      } else {
        // 如果没有选中项目，设置为空数组
        setStages([]);
      }
    } catch (error) {
      console.error('获取阶段列表失败:', error);
      // 如果API调用失败，设置为空数组
      setStages([]);
    }
  };

  // 清空项目相关状态
  const clearProjectState = () => {
    console.log('🚨 clearProjectState被调用，清空所有项目相关状态');
    setSelectedProject(null);
    setStages([]);
    setSelectedStage(null);
    setSelectedTask(null);
  };

  // 更新项目任务数量的通用函数
  const updateProjectTaskCount = (projectId, delta) => {
    console.log('更新项目任务数量:', { projectId, delta });
    setProjects(prevProjects => {
      return prevProjects.map(project => {
        if (project.id === projectId) {
          const newTaskCount = Math.max(0, (project.task_count || 0) + delta);
          console.log(`项目 ${project.name} 任务数量从 ${project.task_count} 更新为 ${newTaskCount}`);
          return {
            ...project,
            task_count: newTaskCount
          };
        }
        return project;
      });
    });
  };

  // 更新项目过期状态的函数
  const updateProjectOverdueStatus = async (projectId) => {
    try {
      console.log(`开始更新项目 ${projectId} 的过期状态`);
      const projectTasks = await taskAPI.getProjectTasks(projectId);
      console.log(`获取到的任务列表:`, projectTasks);

      const hasOverdueTasks = projectTasks.some(task => {
        console.log(`检查任务 ${task.title}:`, {
          dueDate: task.dueDate,
          status: task.status,
          hasDueDate: !!task.dueDate
        });

        if (!task.dueDate) {
          console.log(`任务 ${task.title} 没有截止日期，跳过`);
          return false;
        }

        const dueDate = new Date(task.dueDate);
        const now = new Date();
        const isOverdue = dueDate < now;
        const isNotCompleted = task.status !== 'completed';

        console.log(`任务 ${task.title} 检查结果:`, {
          dueDate: dueDate.toISOString(),
          now: now.toISOString(),
          isOverdue,
          isNotCompleted,
          shouldMarkAsOverdue: isOverdue && isNotCompleted
        });

        return isOverdue && isNotCompleted;
      });

      console.log(`项目 ${projectId} 最终过期状态:`, hasOverdueTasks);

      setProjects(prevProjects => {
        return prevProjects.map(project => {
          if (project.id === projectId) {
            console.log(`更新项目 ${project.name} 的过期状态为:`, hasOverdueTasks);
            return {
              ...project,
              hasOverdueTasks
            };
          }
          return project;
        });
      });
    } catch (error) {
      console.error(`更新项目 ${projectId} 过期状态失败:`, error);
    }
  };

  // 将函数暴露到全局，供ProjectBoard组件调用
  useEffect(() => {
    window.updateProjectTaskCount = updateProjectTaskCount;
    window.updateProjectOverdueStatus = updateProjectOverdueStatus;
    return () => {
      delete window.updateProjectTaskCount;
      delete window.updateProjectOverdueStatus;
    };
  }, [updateProjectTaskCount, updateProjectOverdueStatus]);

  return (
    <div className="min-h-screen bg-gray-50">


      {/* 侧边栏 - 完全固定 */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-slate-800 to-slate-900 text-white shadow-2xl flex flex-col h-screen">
        {/* 用户信息 - 放在最顶部 */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-slate-700/50 bg-slate-800/50">
          <div className="flex items-center justify-between">
            {/* 用户基本信息 */}
            <div className="flex items-center flex-1">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                  <User className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-semibold text-white">{user?.username}</p>
              </div>
            </div>

            {/* 功能按钮组 */}
            <div className="flex items-center space-x-1">
              {/* 仪表板按钮 */}
              <button
                onClick={() => navigate('/dashboard')}
                className={`p-2 rounded-lg transition-all duration-200 border ${
                  location.pathname === '/dashboard'
                    ? 'bg-blue-500/20 text-blue-300 border-blue-400/30'
                    : 'text-slate-400 hover:bg-slate-700/50 hover:text-white border-transparent'
                }`}
                title="仪表板"
              >
                <LayoutDashboard className="w-4 h-4" />
              </button>

            </div>
          </div>
        </div>

        {/* 主导航 */}
        <nav className="flex-1 px-3 py-4 flex flex-col min-h-0">
          {/* 固定导航按钮 */}
          <div className="flex-shrink-0 space-y-2 mb-4">
            {/* 预留位置供未来扩展 */}
          </div>

          {/* 项目列表 - 占用剩余空间 */}
          <div
            className="flex-1 min-h-0 overflow-y-auto scroll-smooth"
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onScroll={(e) => e.stopPropagation()}
          >
            <div className="space-y-1">
              {/* 加载状态 */}
              {loading ? (
                <div className="flex flex-col items-center justify-center py-8 space-y-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-slate-300 text-sm font-medium">加载项目中...</span>
                  </div>
                  <div className="text-xs text-slate-400 text-center">
                    正在获取您的项目列表
                  </div>
                </div>
              ) : projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 space-y-3">
                  <div className="w-12 h-12 bg-slate-700/50 rounded-xl flex items-center justify-center">
                    <span className="text-2xl">📁</span>
                  </div>
                  <div className="text-center">
                    <div className="text-slate-300 text-sm font-medium mb-1">暂无项目</div>
                    <div className="text-xs text-slate-400">创建您的第一个项目开始协作</div>
                  </div>
                </div>
              ) : (
                projects.map((project) => {
                // 添加调试信息
                console.log(`渲染项目 ${project.name}:`, {
                  id: project.id,
                  name: project.name,
                  task_count: project.task_count,
                  icon: project.icon,
                  project_type: project.project_type
                });

                // 检查项目类型
                const isTeamProject = project.project_type === 'team';
                const isPersonalProject = project.project_type === 'personal';

                return (
                  <div
                    key={project.id}
                    onClick={() => {
                      setSelectedProject(project);
                      navigate(`/projects/${project.id}`);
                      // 选择项目后立即获取阶段数据
                      setTimeout(() => fetchStages(), 100);
                    }}
                    className={`${
                      location.pathname === `/projects/${project.id}`
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg border border-blue-500/30'
                        : 'text-slate-200 hover:bg-slate-700/50 hover:text-white border border-transparent'
                    } group flex items-center px-4 py-3 text-sm font-medium rounded-xl w-full transition-all duration-200 cursor-pointer hover:shadow-md`}
                  >
                    <div className="flex-1 text-left truncate">{project.name}</div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded-lg font-medium ${
                        location.pathname === `/projects/${project.id}`
                          ? isTeamProject
                            ? 'bg-purple-500/30 text-white border border-purple-400/50'
                            : isPersonalProject
                              ? 'bg-blue-500/30 text-white border border-blue-400/50'
                              : 'bg-white/20 text-white border border-white/30'
                          : isTeamProject
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : isPersonalProject
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : 'bg-slate-700/50 text-slate-300 border border-slate-600/50'
                      }`}>
                        {project.owner_id === user?.id ? '主' : '协'}
                      </span>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          console.log('点击项目详情按钮:', project);

                          // 立即显示模态框，使用基本项目信息
                          setSelectedProject(project);
                          setShowDetailModal(true);
                          console.log('已设置模态框状态为打开');

                          try {
                            // 在后台异步获取完整信息
                            console.log('开始获取项目完整信息...');
                            const response = await projectAPI.getProject(project.id);
                            console.log('获取到完整项目信息响应:', response);
                            // API返回的是 { project: {...}, user_role: "..." }，提取项目数据和用户角色
                            const fullProject = response.project || response;
                            const userRole = response.user_role;
                            console.log('提取的项目数据:', fullProject);
                            console.log('用户在项目中的角色:', userRole);
                            // 将用户角色信息附加到项目对象中
                            const projectWithRole = { ...fullProject, user_role: userRole };
                            setSelectedProject(projectWithRole);
                          } catch (error) {
                            console.error('获取项目详情失败:', error);
                            // 如果获取失败，继续使用基本信息，不关闭模态框
                          }
                        }}
                        className={`p-1.5 rounded-lg transition-all duration-200 ${
                          selectedProject?.id === project.id || location.pathname === `/projects/${project.id}`
                            ? 'hover:bg-white/20 text-white'
                            : 'hover:bg-slate-700/50 text-slate-300 hover:text-white'
                        }`}
                        title="查看详情"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
                })
              )}
            </div>
          </div>
        </nav>

        {/* 创建项目按钮 - 固定在底部 */}
        {hasPermission('create_project') && (
          <div className="flex-shrink-0 px-3 pb-4">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-4 rounded-2xl shadow-xl border border-emerald-400/30">
              <div className="text-center">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <Plus className="h-6 w-6 text-white" />
                </div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="w-full bg-white/20 hover:bg-white/30 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all duration-200 border border-white/30 hover:border-white/50 hover:shadow-lg hover:scale-105"
                >
                  创建项目
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 底部操作 */}
        <div className="flex-shrink-0 p-4 border-t border-slate-700/50 bg-slate-800/50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-4 py-3 text-sm font-medium text-slate-300 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all duration-200 border border-slate-600/50 hover:border-red-500/30 group"
          >
            <LogOut className="mr-2 h-4 w-4 group-hover:text-red-300 transition-colors duration-200" />
            退出登录
          </button>
        </div>
      </div>



      {/* 主内容区域 - 为左侧侧边栏留出空间 */}
      <div className="ml-64 min-w-0">
        {/* 页面内容 */}
        <main className="h-screen overflow-hidden">
          <div className="h-full overflow-x-auto overflow-y-hidden" style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#64748b #1e293b'
          }}>
            <div className="min-w-max">
              {/* 使用 Outlet 渲染子路由 */}
              <Outlet />
            </div>
          </div>
        </main>
      </div>

      {/* 模态框 */}
      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={async (newProject) => {
          console.log('Layout收到新项目:', newProject);
          
          // 为新项目获取任务统计信息（保持与fetchProjects的数据结构一致）
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
          
          // 使用函数式更新，将新项目添加到列表开头（最新的在前）
          setProjects(prev => {
            // 检查是否已存在（避免重复添加）
            const exists = prev.find(p => p.id === newProject.id);
            if (exists) {
              return prev;
            }
            return [projectWithStats, ...prev];
          });
          setShowCreateModal(false);
        }}
      />

                     <ProjectDetailModal
          isOpen={showDetailModal}
          onClose={() => {
            console.log('关闭项目详情模态框');
            setShowDetailModal(false);
            setSelectedProject(null);
          }}
          project={selectedProject}
          onUpdate={(updatedProject) => {
            // 更新项目列表
            setProjects(prev => prev.map(p => {
              if (p.id === updatedProject.id) {
                // 保留原有的统计信息，只更新基本信息
                return {
                  ...p,
                  ...updatedProject,
                  // 保留任务统计信息（如果有）
                  taskStats: p.taskStats || updatedProject.taskStats,
                  hasOverdueTasks: p.hasOverdueTasks !== undefined ? p.hasOverdueTasks : updatedProject.hasOverdueTasks
                };
              }
              return p;
            }));
            
            // 如果当前选中的项目是更新的项目，同步更新 selectedProject
            if (selectedProject?.id === updatedProject.id) {
              setSelectedProject(prev => ({
                ...prev,
                ...updatedProject,
                // 保留原有的其他属性
                taskStats: prev?.taskStats || updatedProject.taskStats,
                hasOverdueTasks: prev?.hasOverdueTasks !== undefined ? prev.hasOverdueTasks : updatedProject.hasOverdueTasks
              }));
              
              // 通知 ProjectBoard 刷新项目数据（如果当前在项目页面）
              if (location.pathname.includes(`/projects/${updatedProject.id}`)) {
                // 通过 window 事件或直接调用刷新函数
                if (window.refreshProjectData) {
                  window.refreshProjectData();
                }
              }
            }
          }}
          onDelete={(projectId) => {
            // 删除项目后，清空相关状态
            setProjects(prev => prev.filter(p => p.id !== projectId));
            if (selectedProject?.id === projectId) {
              clearProjectState();
              // 如果当前在项目页面，跳转到仪表板
              if (location.pathname.includes(`/projects/${projectId}`)) {
                navigate('/dashboard');
              }
            }
          }}
        />

                               <CreateTaskModal
          isOpen={showCreateTaskModal}
          onClose={() => {
            setShowCreateTaskModal(false);
            setSelectedStage(null);
          }}
          onSuccess={handleTaskCreated}
          projectId={selectedProject?.id}
          stageId={selectedStage?.id}
          stageName={selectedStage?.name}
          availableMembers={[
            { id: 1, username: 'mayunfeng', email: 'mayunfeng_000@163.com' },
            { id: 2, username: 'developer1', email: 'dev1@example.com' },
            { id: 3, username: 'developer2', email: 'dev2@example.com' },
            { id: 4, username: 'designer1', email: 'design1@example.com' }
          ]}
        />

                 <TaskDetailModal
           isOpen={showTaskDetailModal}
           onClose={() => {
             setShowTaskDetailModal(false);
             setSelectedTask(null);
           }}
           task={selectedTask}
           onUpdate={handleTaskUpdated}
           onDelete={handleTaskDeleted}
           availableMembers={[
             { id: 1, username: 'mayunfeng', email: 'mayunfeng_000@163.com' },
             { id: 2, username: 'developer1', email: 'dev1@example.com' },
             { id: 3, username: 'developer2', email: 'dev2@example.com' },
             { id: 4, username: 'designer1', email: 'design1@example.com' }
           ]}
         />

         {/* 阶段编辑模态框 */}
         <EditStageModal
           isOpen={showEditStageModal}
           onClose={() => {
             setShowEditStageModal(false);
             setSelectedStage(null);
           }}
           stage={selectedStage}
           onUpdate={handleStageUpdated}
         />

                   {/* 阶段设置模态框 */}
          <StageSettingsModal
            isOpen={showStageSettingsModal}
            onClose={() => {
              setShowStageSettingsModal(false);
              setSelectedStage(null);
            }}
            stage={selectedStage}
            onUpdate={handleStageUpdated}
          />

                     {/* 创建阶段模态框 */}
           <CreateStageModal
             isOpen={showCreateStageModal}
             onClose={() => setShowCreateStageModal(false)}
             onSuccess={handleStageCreated}
             projectId={selectedProject?.id}
           />

         {/* 激活码功能已移除 */}

    </div>
  );
};

export default Layout;
