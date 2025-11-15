import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useAuth } from '../contexts/AuthContext';
import { projectAPI, taskAPI, stageAPI } from '../services/api';
import {
    Plus,
    MoreVertical,
    Edit,
    Trash2,
    User,
    Calendar,
    ArrowLeft,
    Settings,
    GripVertical,
    Filter,
    X,
    ChevronDown,
    MessageSquare,
    Activity,
    CheckSquare,
    CheckCircle,
    Zap,
    RotateCcw,
    Search
} from 'lucide-react';
import CreateTaskModal from '../components/CreateTaskModal';
import EditTaskModal from '../components/EditTaskModal';
import CreateStageModal from '../components/CreateStageModal';
import TaskDetailModal from '../components/TaskDetailModal';
import StageDetailModal from '../components/StageDetailModal';
import StageSettingsModal from '../components/StageSettingsModal';
import ProjectMemberModal from '../components/ProjectMemberModal';

const ProjectBoard = () => {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const { user, hasProjectPermission } = useAuth();

    // 筛选逻辑函数
    const filterTasks = (taskList) => {
        return taskList.filter(task => {
            // 已完成的任务永远不在阶段中显示（除非明确选择显示）
            if (task.status === 'done') {
                // 只有在筛选器中明确选择了'done'状态时才显示
                return filters.status.includes('done');
            }
            
            // 状态筛选
            if (filters.status.length > 0 && !filters.status.includes(task.status)) {
                return false;
            }
            
            // 优先级筛选
            if (filters.priority.length > 0 && !filters.priority.includes(task.priority)) {
                return false;
            }
            
            // 截止日期筛选
            if (filters.dueDate) {
                const rawDueDate = task?.due_date ? new Date(task.due_date) : null;
                if (!rawDueDate || Number.isNaN(rawDueDate.getTime())) return false;

                const normalizeDate = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

                const today = (() => {
                    const now = new Date();
                    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
                })();

                const normalizedDueDate = normalizeDate(rawDueDate);

                const startOfWeek = new Date(today);
                // 将周视为周一开始、周日结束
                const weekDay = today.getDay();
                const offsetToMonday = (weekDay + 6) % 7; // 将 Sunday(0) 映射为 6，Monday(1) -> 0
                startOfWeek.setDate(today.getDate() - offsetToMonday);

                const startOfNextWeek = new Date(startOfWeek);
                startOfNextWeek.setDate(startOfWeek.getDate() + 7);

                const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                const startOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
                
                switch (filters.dueDate) {
                    case 'today':
                        if (normalizedDueDate.getTime() !== today.getTime()) return false;
                        break;
                    case 'week':
                        if (normalizedDueDate < startOfWeek || normalizedDueDate >= startOfNextWeek) return false;
                        break;
                    case 'month':
                        if (normalizedDueDate < startOfMonth || normalizedDueDate >= startOfNextMonth) return false;
                        break;
                    case 'overdue':
                        if (normalizedDueDate >= today) return false;
                        break;
                }
            }
            
            return true;
        });
    };

    const [project, setProject] = useState(null);
    const [projectUserRole, setProjectUserRole] = useState(null);
    const [stages, setStages] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // 筛选状态
    const [filters, setFilters] = useState({
        status: [],        // 任务状态数组
        priority: [],      // 优先级数组
        dueDate: null,     // 截止日期范围
        createdDate: null, // 创建日期范围
    });
    const [error, setError] = useState(null);
    const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
    const [showCreateStageModal, setShowCreateStageModal] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [showEditTaskModal, setShowEditTaskModal] = useState(false);
    const [selectedStageId, setSelectedStageId] = useState(null);
    const [viewingTask, setViewingTask] = useState(null);
    const [showTaskDetailModal, setShowTaskDetailModal] = useState(false);
    const [viewingStage, setViewingStage] = useState(null);
    const [showStageDetailModal, setShowStageDetailModal] = useState(false);
    const [editingStage, setEditingStage] = useState(null);
    const [showStageSettingsModal, setShowStageSettingsModal] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [draggedTask, setDraggedTask] = useState(null);
    const [dragPreview, setDragPreview] = useState({ sourceStageId: null, destStageId: null });
    const [dragOverStage, setDragOverStage] = useState(null);
    const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
    const [showDragGhost, setShowDragGhost] = useState(false);
    const [projectMembers, setProjectMembers] = useState([]);
    const [completedTasksCount, setCompletedTasksCount] = useState(0);
    const [completedTasks, setCompletedTasks] = useState([]);
    const [showCompletedTasksModal, setShowCompletedTasksModal] = useState(false);
    
    // 已完成任务筛选状态
    const [completedTasksFilters, setCompletedTasksFilters] = useState({
        stage: '',           // 按阶段筛选
        dateRange: '',       // 按完成日期筛选
        searchTerm: ''       // 搜索关键词
    });
    const [filteredCompletedTasks, setFilteredCompletedTasks] = useState([]);
    const [showMemberModal, setShowMemberModal] = useState(false);
    const [tasksLoaded, setTasksLoaded] = useState(false);
    
    // 获取项目详情和任务
    useEffect(() => {
        const loadProjectData = async () => {
            setTasksLoaded(false);
            await fetchProjectData();
            await fetchProjectTasks();
            await fetchProjectMembers();
        };
        
        loadProjectData();
        
        // 切换项目时重置筛选条件
        setFilters({
            status: [],
            assignee: [],
            priority: [],
            dueDate: null,
            createdDate: null,
        });
    }, [projectId]);

    // 调试：监听任务和阶段数据变化
    useEffect(() => {
        console.log('=== 数据状态更新 ===');
        console.log('阶段数量:', stages.length);
        console.log('任务数量:', tasks.length);
        console.log('系统用户角色:', user?.role);
        console.log('项目用户角色:', projectUserRole);
        console.log('权限检查函数:', typeof hasProjectPermission);
        console.log('阶段数据:', stages.map(s => ({ id: s.id, name: s.name, idType: typeof s.id })));
        console.log('任务数据:', tasks.map(t => ({ id: t.id, title: t.title, stage_id: t.stage_id, idType: typeof t.id, stageIdType: typeof t.stage_id })));
        
        // 检查拖拽相关的权限
        const canManageTasks = hasProjectPermission('manage_tasks', { user_role: projectUserRole });
        console.log('🔍 拖拽权限检查:', {
            canManageTasks,
            userRole: user?.role,
            projectUserRole,
            hasPermissionFunction: typeof hasProjectPermission
        });
        
        // 检查每个阶段的任务分布
        stages.forEach(stage => {
            const stageTasksRaw = tasks.filter(task => task.stage_id === stage.id);
            const stageTasksFiltered = filterTasks(stageTasksRaw);
            console.log(`📋 阶段 ${stage.name} 任务分布:`, {
                stageId: stage.id,
                rawTasksCount: stageTasksRaw.length,
                filteredTasksCount: stageTasksFiltered.length,
                tasks: stageTasksFiltered.map(t => ({ id: t.id, title: t.title }))
            });
        });
    }, [stages, tasks, user, projectUserRole, hasProjectPermission]);

    // 监听任务变化，更新已完成任务列表
    useEffect(() => {
        if (tasks && tasks.length >= 0) {
            const completedTasksList = tasks.filter(task => task.status === 'done');
            setCompletedTasks(completedTasksList);
            setCompletedTasksCount(completedTasksList.length);
            console.log('任务数据更新，已完成任务数量:', completedTasksList.length);
        }
    }, [tasks]);

    // 筛选已完成任务的函数
    const filterCompletedTasks = (taskList) => {
        return taskList.filter(task => {
            // 搜索关键词筛选
            if (completedTasksFilters.searchTerm) {
                const searchLower = completedTasksFilters.searchTerm.toLowerCase();
                const titleMatch = task.title.toLowerCase().includes(searchLower);
                const descMatch = task.description && task.description.toLowerCase().includes(searchLower);
                if (!titleMatch && !descMatch) return false;
            }
            
            // 阶段筛选
            if (completedTasksFilters.stage) {
                if (task.stage_id.toString() !== completedTasksFilters.stage) return false;
            }
            
            return true;
        });
    };

    // 监听已完成任务和筛选条件变化，更新筛选结果
    useEffect(() => {
        const filtered = filterCompletedTasks(completedTasks);
        setFilteredCompletedTasks(filtered);
    }, [completedTasks, completedTasksFilters]);

    // 监听任务加载完成状态，获取已完成任务统计
    useEffect(() => {
        if (tasksLoaded && tasks) {
            fetchCompletedTasksStats();
        }
    }, [tasksLoaded, tasks]);

    const fetchProjectData = async () => {
        try {
            setLoading(true);
            const projectData = await projectAPI.getProject(projectId);

            console.log('获取到的项目数据:', projectData);

            // 从API响应中提取项目数据和用户角色
            // API响应结构: {code: 200, message: "success", data: {project: {...}, user_role: "..."}}
            let actualProjectData;
            let userRole;
            
            if (projectData.data && projectData.data.project) {
                actualProjectData = projectData.data.project;
                userRole = projectData.data.user_role;
            } else if (projectData.project) {
                actualProjectData = projectData.project;
                userRole = projectData.user_role;
            } else {
                actualProjectData = projectData;
                userRole = projectData.user_role;
            }
            
            console.log('提取的项目数据:', actualProjectData);
            console.log('用户项目角色:', userRole);
            setProjectUserRole(userRole);
            console.log('项目数据中的阶段:', actualProjectData.stages);
            console.log('阶段数量:', actualProjectData.stages ? actualProjectData.stages.length : 0);
            setProject(actualProjectData);

            // 从项目数据中提取阶段和任务
            if (actualProjectData.stages && actualProjectData.stages.length > 0) {
                // 确保阶段数据有正确的ID类型
                const validStages = actualProjectData.stages.map(stage => ({
                    ...stage,
                    id: parseInt(stage.id) || stage.id,
                    position: stage.position || 0
                }));
                
                // 按 position 排序阶段，如果position相同则按创建时间排序，最后按ID排序
                const sortedStages = validStages.sort((a, b) => {
                    // 首先按 position 排序
                    if (a.position !== b.position) {
                        return a.position - b.position;
                    }
                    // 如果 position 相同，按创建时间排序
                    if (a.created_at && b.created_at) {
                        return new Date(a.created_at) - new Date(b.created_at);
                    }
                    // 如果创建时间也不可靠，按ID排序（通常ID越大越新）
                    return a.id - b.id;
                });
                setStages(sortedStages);
                console.log('设置阶段数据:', sortedStages);
                console.log('阶段ID类型检查:', sortedStages.map(s => ({ id: s.id, idType: typeof s.id })));
            } else {
                setStages([]);
            }

            // 任务数据现在通过fetchProjectTasks单独获取
        } catch (error) {
            console.error('获取项目数据失败:', error);
            setError('获取项目数据失败');
        } finally {
            setLoading(false);
        }
    };

    // 获取项目任务
    const fetchProjectTasks = async () => {
        try {
            const response = await taskAPI.getProjectTasks(projectId);
            console.log('获取到的任务数据:', response);
            
            if (response.tasks && Array.isArray(response.tasks)) {
                // 确保任务数据有正确的 ID 和 stage_id
                const validTasks = response.tasks.map(task => ({
                    ...task,
                    id: parseInt(task.id) || task.id,
                    stage_id: parseInt(task.stage_id) || task.stage_id,
                    position: task.position || 0
                }));
                
                // 按位置排序任务
                const sortedTasks = validTasks.sort((a, b) => {
                    // 先按阶段ID排序，再按位置排序
                    if (a.stage_id !== b.stage_id) {
                        return a.stage_id - b.stage_id;
                    }
                    return (a.position || 0) - (b.position || 0);
                });
                
                setTasks(sortedTasks);
                setTasksLoaded(true);
                console.log('设置任务数据:', sortedTasks);
                console.log('任务数量:', sortedTasks.length);
            } else {
                setTasks([]);
                setTasksLoaded(true);
                console.log('没有任务数据或数据格式不正确:', response);
            }
        } catch (error) {
            console.error('获取任务数据失败:', error);
            setTasks([]);
            setTasksLoaded(true);
        }
    };

    // 获取项目成员
    const fetchProjectMembers = async () => {
        try {
            const response = await projectAPI.getProjectMembers(projectId);
            console.log('获取项目成员原始响应:', response);
            
            // 处理后端返回的嵌套数据结构
            let members = [];
            if (response && response.members && Array.isArray(response.members)) {
                // 提取用户信息，使用 user_id 作为唯一标识
                members = response.members.map(member => ({
                    id: member.user_id,  // 使用 user_id 作为前端显示的ID
                    username: member.user?.username || `用户${member.user_id}`,
                    email: member.user?.email || '无邮箱',
                    projectRole: member.role,  // 项目中的角色
                    systemRole: member.user?.role || '未知'  // 系统角色
                }));
            }
            
            console.log('处理后的成员数据:', members);
            setProjectMembers(members);
        } catch (error) {
            console.error('获取项目成员失败:', error);
            // 如果获取成员失败，使用临时测试数据，不影响主要功能
            console.log('使用临时测试数据');
            setProjectMembers([
                { id: 1, username: '张三', email: 'zhangsan@example.com', projectRole: 'member', systemRole: 'member' },
                { id: 2, username: '李四', email: 'lisi@example.com', projectRole: 'member', systemRole: 'member' },
                { id: 3, username: '王五', email: 'wangwu@example.com', projectRole: 'member', systemRole: 'member' }
            ]);
        }
    };

    // 原生拖拽处理函数
    const handleDragStart = (e, task) => {
        console.log('=== 开始拖拽 ===', task);
        console.log('🎯 拖拽事件对象:', e);
        console.log('🎯 任务数据:', { id: task.id, title: task.title, stage_id: task.stage_id });
        
        // 确保拖拽数据正确设置
        try {
            // 阻止拖拽时触发点击事件
            e.stopPropagation();
            
            setIsDragging(true);
            setDraggedTask(task);
            setDragPreview({ 
                sourceStageId: task.stage_id, 
                destStageId: null 
            });
            
            // 设置拖拽数据
            const dragData = {
                taskId: task.id,
                sourceStageId: task.stage_id
            };
            console.log('🎯 设置拖拽数据:', dragData);
            e.dataTransfer.setData('text/plain', JSON.stringify(dragData));
            e.dataTransfer.effectAllowed = 'move';
            
            console.log('✅ 拖拽初始化完成');
        } catch (error) {
            console.error('❌ 拖拽初始化失败:', error);
        }
        
        // 显示拖拽幽灵
        setShowDragGhost(true);
        setDragPosition({ x: e.clientX, y: e.clientY });
        
        // 添加全局鼠标移动监听
        const handleMouseMove = (e) => {
            if (isDragging) {
                setDragPosition({ x: e.clientX, y: e.clientY });
            }
        };
        
        document.addEventListener('mousemove', handleMouseMove);
        
        // 存储事件监听器引用到任务对象，以便后续移除
        task._dragMouseMoveHandler = handleMouseMove;
        
        // 创建自定义拖拽图像
        const dragImage = e.currentTarget.cloneNode(true);
        dragImage.style.position = 'fixed';
        dragImage.style.top = '-1000px';
        dragImage.style.left = '-1000px';
        dragImage.style.width = e.currentTarget.offsetWidth + 'px';
        dragImage.style.height = e.currentTarget.offsetHeight + 'px';
        dragImage.style.opacity = '0.8';
        dragImage.style.transform = 'rotate(5deg)';
        dragImage.style.zIndex = '9999';
        dragImage.style.pointerEvents = 'none';
        dragImage.style.userSelect = 'none';
        
        document.body.appendChild(dragImage);
        e.dataTransfer.setDragImage(dragImage, e.currentTarget.offsetWidth / 2, e.currentTarget.offsetHeight / 2);
        
        // 延迟移除拖拽图像
        setTimeout(() => {
            if (document.body.contains(dragImage)) {
                document.body.removeChild(dragImage);
            }
        }, 100);
    };

    const handleDragOver = (e, stageId) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverStage(stageId);
        setDragPreview(prev => ({ ...prev, destStageId: stageId }));
    };

    const handleDragLeave = (e, stageId) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
            setDragOverStage(null);
            setDragPreview(prev => ({ ...prev, destStageId: null }));
        }
    };

    const handleDragEnd = (e) => {
        console.log('=== 拖拽取消 ===');
        // 清理拖拽状态和事件监听器
        setIsDragging(false);
        setDraggedTask(null);
        setDragPreview({ sourceStageId: null, destStageId: null });
        setDragOverStage(null);
        setShowDragGhost(false);
        
        // 移除全局鼠标移动监听器
        if (draggedTask && draggedTask._dragMouseMoveHandler) {
            document.removeEventListener('mousemove', draggedTask._dragMouseMoveHandler);
        }
    };

    const handleDrop = async (e, targetStageId) => {
        e.preventDefault();
        
        try {
            const dragDataStr = e.dataTransfer.getData('text/plain');
            if (!dragDataStr) {
                console.error('❌ 没有获取到拖拽数据');
                return;
            }
            
            const dragData = JSON.parse(dragDataStr);
            const { taskId, sourceStageId } = dragData;
            
            const numericSourceStageId = parseInt(sourceStageId);
            const numericTargetStageId = parseInt(targetStageId);
            
            if (numericSourceStageId === numericTargetStageId) {
                return; // 同阶段内拖拽，无需处理
            }
            
            // 计算目标位置
            const targetStageTasks = tasks.filter(task => task.stage_id === numericTargetStageId);
            const targetPosition = targetStageTasks.length;
            const numericTaskId = parseInt(taskId);
            
            // 🚀 乐观更新：立即更新UI
            setTasks(prevTasks => {
                return prevTasks.map(task => {
                    if (task.id === numericTaskId) {
                        return { 
                            ...task, 
                            stage_id: numericTargetStageId, 
                            position: targetPosition 
                        };
                    }
                    return task;
                });
            });
            
            // 清理拖拽状态（立即执行）
            setIsDragging(false);
            setDraggedTask(null);
            setDragPreview({ sourceStageId: null, destStageId: null });
            setDragOverStage(null);
            setShowDragGhost(false);
            
            // 异步调用API（不阻塞UI）
            const requestData = { 
                new_stage_id: numericTargetStageId,
                new_position: targetPosition
            };
            
            try {
                const moveResult = await taskAPI.moveTask(numericTaskId, requestData);
                
                // API调用成功后，使用服务器返回的数据更新状态
                if (moveResult && moveResult.task) {
                    setTasks(prevTasks => {
                        return prevTasks.map(task => {
                            if (task.id === numericTaskId) {
                                return { ...moveResult.task };
                            }
                            return task;
                        });
                    });
                }
            } catch (apiError) {
                console.error('API调用失败:', apiError);
                
                // API调用失败时，回滚到原始状态
                setTasks(prevTasks => {
                    return prevTasks.map(task => {
                        if (task.id === numericTaskId) {
                            return { 
                                ...task, 
                                stage_id: numericSourceStageId 
                            };
                        }
                        return task;
                    });
                });
                
                alert(`移动任务失败：${apiError.message || '请检查网络连接'}`);
            }
            
        } catch (error) {
            console.error('拖拽处理失败:', error);
        }
    };

    // 获取阶段颜色样式
    const getStageColor = (color) => {
        const colorMap = {
            blue: 'bg-blue-500',
            green: 'bg-green-500',
            yellow: 'bg-yellow-500',
            purple: 'bg-purple-500',
            orange: 'bg-orange-500',
            red: 'bg-red-500',
            indigo: 'bg-indigo-500',
            pink: 'bg-pink-500'
        };
        return colorMap[color] || 'bg-gray-500';
    };



    // 获取优先级样式 - 扁平化
    const getPriorityStyle = (priority) => {
        const priorityMap = {
            'P1': 'bg-red-500 text-white',
            'P2': 'bg-orange-500 text-white',
            'P3': 'bg-yellow-500 text-white'
        };
        return priorityMap[priority] || 'bg-gray-500 text-white';
    };

    // 获取状态样式 - 扁平化
    const getStatusStyle = (status) => {
        const statusMap = {
            'todo': 'bg-gray-500 text-white',
            'in_progress': 'bg-blue-500 text-white',
            'done': 'bg-green-500 text-white',
            'cancelled': 'bg-red-500 text-white'
        };
        return statusMap[status] || 'bg-gray-500 text-white';
    };

    // 获取状态显示文本
    const getStatusText = (status) => {
        const statusTextMap = {
            'todo': '待开始',
            'in_progress': '进行中',
            'done': '已完成',
            'cancelled': '已取消'
        };
        return statusTextMap[status] || '未知';
    };

    // 检查任务是否过期
    const isTaskOverdue = (task) => {
        if (!task.due_date) return false;
        if (task.status === 'done') return false;
        
        const dueDate = new Date(task.due_date);
        const now = new Date();
        
        // 设置时间为当天的23:59:59，给任务一些缓冲时间
        dueDate.setHours(23, 59, 59, 999);
        
        return now > dueDate;
    };

    // 获取已完成任务统计
    const fetchCompletedTasksStats = async () => {
        try {
            const response = await taskAPI.getCompletedTasksStats(projectId);
            console.log('获取已完成任务统计:', response);
            
            if (response && typeof response.completed_count === 'number') {
                setCompletedTasksCount(response.completed_count);
            } else {
                // 如果API没有返回统计数据，使用本地计算
                const completedTasksList = tasks.filter(task => task.status === 'done');
                setCompletedTasksCount(completedTasksList.length);
                setCompletedTasks(completedTasksList);
            }
        } catch (error) {
            console.error('获取已完成任务统计失败:', error);
            // 如果API失败，使用本地计算
            const completedTasksList = tasks.filter(task => task.status === 'done');
            setCompletedTasksCount(completedTasksList.length);
            setCompletedTasks(completedTasksList);
        }
    };

    // 恢复任务状态（从已完成改回其他状态）
    const handleRecoverTask = async (taskId, newStatus) => {
        try {
            setLoading(true);
            
            console.log(`开始恢复任务 ${taskId} 状态为 ${newStatus}`);
            
            // 调用API更新任务状态
            const response = await taskAPI.updateTask(taskId, { 
                status: newStatus,
                completed_at: null // 清除完成时间
            });
            
            console.log('恢复任务API响应:', response);
            
            // API拦截器已经处理了响应结构，直接检查success属性
            if (response && response.success !== false) {
                // 更新本地任务列表
                setTasks(prevTasks => {
                    return prevTasks.map(task => {
                        if (task.id === taskId) {
                            return {
                                ...task,
                                status: newStatus,
                                completed_at: null
                            };
                        }
                        return task;
                    });
                });
                
                // 重新获取任务数据以确保数据一致性
                await fetchProjectTasks();
                
                console.log('任务状态已恢复');
                console.log(`任务 ${taskId} 状态已从已完成恢复为 ${newStatus}`);
            } else {
                console.error('恢复任务失败，API响应:', response);
                setError(response?.message || '恢复任务状态失败');
            }
        } catch (error) {
            console.error('恢复任务状态失败:', error);
            setError('恢复任务状态失败，请重试');
        } finally {
            setLoading(false);
        }
    };

    // 创建任务
    const handleCreateTask = async (taskData, stageId) => {
        try {
            console.log('创建任务，项目ID:', projectId, '阶段ID:', stageId, '任务数据:', taskData);

            if (!stageId) {
                console.error('阶段ID未提供');
                return;
            }

            const newTask = await taskAPI.createTask(projectId, stageId, taskData);
            setTasks([...tasks, newTask]);
            setShowCreateTaskModal(false);
            setSelectedStageId(null);

        } catch (error) {
            console.error('创建任务失败:', error);
        }
    };

    // 更新任务
    const handleUpdateTask = async (taskId, taskData) => {
        try {
            console.log('=== 开始更新任务 ===');
            console.log('任务ID:', taskId);
            console.log('更新数据:', taskData);
            
            // 检查是否是删除操作
            if (taskData.deleted) {
                console.log('检测到删除操作，从任务列表中移除任务:', taskId);
                setTasks(prevTasks => prevTasks.filter(t => t.id !== taskId));
                
                // 通知父组件更新项目任务数量
                if (window.updateProjectTaskCount) {
                    window.updateProjectTaskCount(projectId, -1);
                }
                
                // 更新项目过期状态
                if (window.updateProjectOverdueStatus) {
                    window.updateProjectOverdueStatus(projectId);
                }
                return;
            }
            
            const response = await taskAPI.updateTask(taskId, taskData);
            console.log('API返回的完整响应:', response);
    
            // 从响应中提取任务数据
            const updatedTask = response.task || response;
            console.log('提取的任务数据:', updatedTask);
            
            if (!updatedTask) {
                console.error('响应中没有任务数据');
                return;
            }
            
            // 确保更新后的任务包含必要的字段
            const taskToUpdate = {
                ...updatedTask,
                // 如果后端返回的数据缺少某些字段，使用原任务的数据
                stage_id: updatedTask.stage_id || tasks.find(t => t.id === taskId)?.stage_id,
                project_id: updatedTask.project_id || tasks.find(t => t.id === taskId)?.project_id,
                // 确保assignee信息完整
                assignee: updatedTask.assignee || tasks.find(t => t.id === taskId)?.assignee
            };
            
            console.log('准备更新的任务数据:', taskToUpdate);
            
            // 更新任务列表
            setTasks(prevTasks => {
                const newTasks = prevTasks.map(t => 
                    t.id === taskId ? taskToUpdate : t
                );
                console.log('更新后的任务列表:', newTasks);
                return newTasks;
            });
            
            // 如果任务状态变为已完成，从阶段中移除
            if (taskData.status === 'done') {
                console.log('任务已完成，从阶段中移除:', taskId);
                // 更新已完成任务统计和列表
                fetchCompletedTasksStats();
            }
            
            setShowEditTaskModal(false);
            setEditingTask(null);
            
            // 更新项目过期状态
            if (window.updateProjectOverdueStatus) {
                window.updateProjectOverdueStatus(projectId);
            }
            
            console.log('=== 任务更新完成 ===');

        } catch (error) {
            console.error('更新任务失败:', error);
            setError(error.message || '任务更新失败，请重试');
        }
    };


    // 删除任务
    const handleDeleteTask = async (taskId) => {
        if (!window.confirm('确定要删除这个任务吗？')) {
            return;
        }

        try {
            await taskAPI.deleteTask(taskId);
            
            // 使用函数式更新确保使用最新状态
            setTasks(prevTasks => prevTasks.filter(t => t.id !== taskId));
            
            // 通知父组件更新项目任务数量
            if (window.updateProjectTaskCount) {
                window.updateProjectTaskCount(projectId, -1);
            }
            
            // 更新项目过期状态
            if (window.updateProjectOverdueStatus) {
                window.updateProjectOverdueStatus(projectId);
            }

        } catch (error) {
            console.error('删除任务失败:', error);
        }
    };

    // 快速完成任务
    const handleQuickComplete = async (taskId) => {
        try {
            // 调用API更新任务状态为完成
            const response = await taskAPI.updateTask(taskId, { status: 'done' });
            
            if (response.task) {
                // 更新本地任务状态
                setTasks(prevTasks => prevTasks.map(task => 
                    task.id === taskId ? { ...task, status: 'done' } : task
                ));
                
                // 更新项目过期状态
                if (window.updateProjectOverdueStatus) {
                    window.updateProjectOverdueStatus(projectId);
                }

                console.log('任务已完成');
            }
        } catch (error) {
            console.error('快速完成任务失败:', error);
            setError('完成任务失败，请重试');
        }
    };

    // 查看任务详情
    const handleViewTask = (task) => {
        setViewingTask(task);
        setShowTaskDetailModal(true);
    };

    // 查看阶段详情
    const handleViewStage = (stage) => {
        setViewingStage(stage);
        setShowStageDetailModal(true);
    };

    // 删除阶段
    const handleDeleteStage = async (stageId) => {
        if (!window.confirm('确定要删除这个阶段吗？删除后该阶段的所有任务也将被删除！')) {
            return;
        }

        try {
            await stageAPI.deleteStage(stageId);
            
            // 使用函数式更新确保使用最新状态
            setStages(prevStages => prevStages.filter(s => s.id !== stageId));
            // 同时删除该阶段的所有任务
            setTasks(prevTasks => prevTasks.filter(t => t.stage_id !== stageId));
        } catch (error) {
            console.error('删除阶段失败:', error);
        }
    };

    // 阶段设置
    const handleStageSettings = (stage) => {
        setEditingStage(stage);
        setShowStageSettingsModal(true);
    };

    // 创建阶段
    const handleCreateStage = async (stageData) => {
        try {
            console.log('=== ProjectBoard.handleCreateStage 开始 ===');
            console.log('项目ID:', projectId);
            console.log('阶段数据:', stageData);
            console.log('当前阶段列表长度:', stages.length);

            // 计算正确的position值，确保新阶段排在最后
            const maxPosition = stages.length > 0 ? Math.max(...stages.map(s => s.position || 0)) : -1;
            const nextPosition = maxPosition + 1;

            // 调用真实的阶段创建API
            const newStage = await stageAPI.createStage({
                project_id: parseInt(projectId),
                name: stageData.name,
                color: stageData.color || '#3B82F6',
                description: stageData.description || '',
                task_limit: 10
            });

            console.log('API返回的新阶段:', newStage);
            console.log('API响应结构分析:', {
                hasData: !!newStage.data,
                dataKeys: newStage.data ? Object.keys(newStage.data) : [],
                hasStage: !!(newStage.data && newStage.data.stage),
                hasDirectStage: !!newStage.stage,
                responseKeys: Object.keys(newStage)
            });
            
            // 从API响应中提取阶段数据
            // 实际API响应结构: {message: "Stage created successfully", stage: {...}}
            let newStageData;
            if (newStage.stage) {
                // 直接访问stage字段
                newStageData = newStage.stage;
            } else if (newStage.data && newStage.data.stage) {
                // 备用：如果被utils.Success包装的情况
                newStageData = newStage.data.stage;
            } else {
                console.error('无法从API响应中提取阶段数据:', newStage);
                console.error('响应数据结构:', JSON.stringify(newStage, null, 2));
                throw new Error('API返回的数据格式不正确');
            }
            
            console.log('提取的阶段数据:', newStageData);
            console.log('新阶段ID:', newStageData.id);
            console.log('新阶段名称:', newStageData.name);

            // 添加到阶段列表
            setStages(prevStages => {
                console.log('setStages回调执行，之前阶段数量:', prevStages.length);
                const updatedStages = [...prevStages, newStageData];
                console.log('更新后的阶段列表:', updatedStages);
                console.log('更新后阶段数量:', updatedStages.length);
                return updatedStages;
            });
            setShowCreateStageModal(false);
            console.log('阶段创建完成，模态框已关闭');
            console.log('=== ProjectBoard.handleCreateStage 结束 ===');
        } catch (error) {
            console.error('ProjectBoard.handleCreateStage 失败:', error);
            console.error('错误详情:', error.message);
            console.error('错误堆栈:', error.stack);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-3 text-gray-600">加载中...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <h3 className="text-lg font-medium text-red-900">加载失败</h3>
                <p className="text-red-600 mt-2">{error}</p>
                <button
                    onClick={() => {
                        setError(null);
                        fetchProjectData();
                    }}
                    className="mt-4 btn-secondary"
                >
                    重试
                </button>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="text-center py-12">
                <h3 className="text-lg font-medium text-gray-900">项目不存在</h3>
                <button
                    onClick={() => navigate('/dashboard')}
                    className="mt-4 btn-secondary"
                >
                    返回仪表板
                </button>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-gray-50">
            {/* 固定头部区域 */}
            <div className="fixed top-0 z-10 bg-gray-50 border-b border-gray-200" style={{left: '256px', right: '0'}}>
                {/* 页面导航和筛选工具栏 */}
                <div className="px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="w-8 h-8 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-800 rounded-lg shadow-sm hover:shadow-md border border-gray-200 flex items-center justify-center transition-all duration-200 hover:scale-105 group/back"
                            >
                                <ArrowLeft className="h-4 w-4 group-hover/back:-translate-x-1 transition-transform duration-200" />
                            </button>

                            {/* 筛选工具栏 - 紧凑样式 */}
                            <div className="flex items-center space-x-3">
                                {/* 状态筛选 */}
                                <div className="relative">
                                    <select
                                        value={filters.status.join(',')}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setFilters(prev => ({
                                                ...prev,
                                                status: value ? value.split(',') : []
                                            }));
                                        }}
                                        className="appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 min-w-[100px]"
                                    >
                                        <option value="">全部状态</option>
                                        <option value="todo">待开始</option>
                                        <option value="in_progress">进行中</option>
                                    </select>
                                    <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
                                </div>
                                
                                {/* 优先级筛选 */}
                                <div className="relative">
                                    <select
                                        value={filters.priority.join(',')}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setFilters(prev => ({
                                                ...prev,
                                                priority: value ? value.split(',') : []
                                            }));
                                        }}
                                        className="appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 min-w-[120px]"
                                    >
                                        <option value="">全部优先级</option>
                                        <option value="P1">高优先级</option>
                                        <option value="P2">中优先级</option>
                                        <option value="P3">低优先级</option>
                                    </select>
                                    <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
                                </div>
                                
                                {/* 截止日期筛选 */}
                                <div className="relative">
                                    <select
                                        value={filters.dueDate || ''}
                                        onChange={(e) => {
                                            setFilters(prev => ({
                                                ...prev,
                                                dueDate: e.target.value || null
                                            }));
                                        }}
                                        className="appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 min-w-[100px]"
                                    >
                                        <option value="">全部日期</option>
                                        <option value="today">今天到期</option>
                                        <option value="week">本周到期</option>
                                        <option value="month">本月到期</option>
                                        <option value="overdue">已过期</option>
                                    </select>
                                    <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
                                </div>
                                
                                {/* 清除筛选 */}
                                {(filters.status.length > 0 || filters.priority.length > 0 || filters.dueDate) && (
                                    <button
                                        onClick={() => setFilters({
                                            status: [],
                                            priority: [],
                                            dueDate: null,
                                            createdDate: null,
                                        })}
                                        className="flex items-center space-x-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors duration-200"
                                    >
                                        <X className="h-3 w-3" />
                                        <span>清除</span>
                                    </button>
                                )}
                            </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">

                            {/* 项目统计信息 - 紧凑样式 */}
                            <div className="flex items-center space-x-4">
                                {/* 阶段 */}
                                <div className="text-center">
                                    <div className="text-lg font-bold text-blue-600">{stages.length}</div>
                                    <div className="text-xs text-gray-500">阶段</div>
                                </div>
                                
                                {/* 任务 */}
                                <div className="text-center">
                                    <div className="text-lg font-bold text-green-600">{filterTasks(tasks).length}</div>
                                    <div className="text-xs text-gray-500">任务</div>
                                </div>
                                
                                {/* 已完成任务 */}
                                <div 
                                    className="text-center cursor-pointer hover:bg-gray-100 rounded-lg p-2 transition-colors duration-200"
                                    onClick={() => setShowCompletedTasksModal(true)}
                                    title="点击查看已完成任务"
                                >
                                    <div className="text-lg font-bold text-gray-600">
                                        {completedTasksCount}
                                    </div>
                                    <div className="text-xs text-gray-500">已完成</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 可滚动的看板区域 - 只有这部分可以横向滚动 */}
            <div className="flex-1 overflow-hidden pt-24 relative">
                
                <div 
                    className="h-full flex space-x-6 overflow-x-auto pb-6 px-4" 
                    style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#cbd5e1 #f1f5f9'
                    }}
                >
                {stages.length > 0 && (
                    stages.map((stage) => {
                    const stageTasks = filterTasks(tasks.filter(task => task.stage_id === stage.id));
                    
                    // 调试：记录阶段任务过滤信息
                    console.log(`阶段 ${stage.name} (ID: ${stage.id}) 的任务:`, {
                        totalTasks: tasks.length,
                        stageTasksCount: stageTasks.length,
                        stageTasks: stageTasks.map(t => ({ id: t.id, title: t.title, stage_id: t.stage_id }))
                    });

                return (
                        <div key={stage.id} className="flex-shrink-0 w-80 pt-2">
                            {/* 阶段标题栏 */}
                            <div className={`${getStageColor(stage.color)} rounded-xl px-4 py-3 mb-4 group relative shadow-sm hover:shadow-md transition-all duration-200`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-6 h-6 bg-white/20 rounded-md flex items-center justify-center">
                                            <div className="w-3 h-3 bg-white rounded-sm"></div>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white text-lg">
                                                {stage.name}
                                            </h3>
                                            <div className="flex items-center space-x-2 mt-1">
                                                <span className="text-white/80 text-sm font-medium">
                                                    {stageTasks.length} 个任务
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* 阶段操作按钮 - 悬停时显示 */}
                                    <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center space-x-2">
                                        <button
                                            onClick={() => handleViewStage(stage)}
                                            className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-all duration-200 hover:scale-110"
                                            title="阶段详情"
                                        >
                                            <MoreVertical className="h-4 w-4" />
                                        </button>

                                        {hasProjectPermission('manage_stages', { user_role: projectUserRole }) && (
                                            <button
                                                onClick={() => handleDeleteStage(stage.id)}
                                                className="p-2 text-white/80 hover:text-white hover:bg-red-500/80 rounded-lg transition-all duration-200 hover:scale-110"
                                                title="删除阶段"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}

                                        {hasProjectPermission('manage_stages', { user_role: projectUserRole }) && (
                                            <button
                                                onClick={() => handleStageSettings(stage)}
                                                className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-all duration-200 hover:scale-110"
                                                title="阶段设置"
                                            >
                                                <Settings className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* 任务列表 - 原生拖拽区域 */}
                            <div
                                className={`min-h-[220px] max-h-[calc(100vh-210px)] sm:max-h-[calc(100vh-220px)] md:max-h-[calc(100vh-230px)] lg:max-h-[calc(100vh-240px)] flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 transition-all duration-200 ${
                                    dragOverStage === stage.id 
                                        ? 'bg-blue-50 ring-2 ring-blue-300 ring-opacity-50 scale-[1.01] shadow-lg' 
                                        : 'hover:shadow-md'
                                }`}
                                onDragOver={(e) => handleDragOver(e, stage.id)}
                                onDragLeave={(e) => handleDragLeave(e, stage.id)}
                                onDrop={(e) => handleDrop(e, stage.id)}
                            >
                                {/* 任务滚动区域 */}
                                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 relative group/scrollbar" style={{
                                    scrollbarWidth: 'thin',
                                    scrollbarColor: '#cbd5e1 #f1f5f9'
                                }}>

                                {stageTasks.map((task, index) => {
                                    // 验证任务数据
                                    if (!task || !task.id) {
                                        console.error('无效的任务数据:', task);
                                        return null;
                                    }
                                    
                                    // 调试：记录任务渲染信息
                                    console.log(`渲染任务 ${task.id}:`, {
                                        title: task.title,
                                        stage_id: task.stage_id,
                                        assignee: task.assignee,
                                        hasAssignee: !!task.assignee,
                                        assigneeUsername: task.assignee?.username
                                    });

                                    // 检查拖拽权限
                                    const canDragTask = hasProjectPermission('manage_tasks', { user_role: projectUserRole });
                                    console.log(`🔍 任务 ${task.id} 拖拽权限:`, canDragTask);

                                    return (
                                        <div
                                            key={`task-${task.id}`}
                                            draggable={canDragTask}
                                            onDragStart={(e) => {
                                                if (!canDragTask) {
                                                    console.log('🚫 没有拖拽权限，阻止拖拽');
                                                    e.preventDefault();
                                                    return;
                                                }
                                                console.log('🎯 拖拽开始事件触发:', task.id, task.title);
                                                handleDragStart(e, task);
                                            }}
                                            onDragEnd={(e) => {
                                                console.log('🎯 拖拽结束事件触发:', task.id);
                                                handleDragEnd(e);
                                            }}
                                            className={`group/task p-4 rounded-xl shadow-sm border ${canDragTask ? 'cursor-move' : 'cursor-pointer'} select-none hover:shadow-md transition-all duration-200 relative ${
                                                isTaskOverdue(task)
                                                    ? 'bg-gradient-to-r from-red-50 to-pink-50 border-red-200 hover:border-red-300 hover:shadow-red-100' // 过期任务：红色主题
                                                    : draggedTask?.id === task.id && isDragging
                                                    ? 'bg-blue-50 border-blue-300 shadow-lg z-50 opacity-50 scale-105' // 拖拽中
                                                    : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-gray-50' // 正常任务
                                            }`}
                                            onClick={(e) => {
                                                // 如果正在拖拽，不处理点击事件
                                                if (isDragging) {
                                                    console.log('🚫 拖拽状态下阻止点击事件');
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    return;
                                                }
                                                handleViewTask(task);
                                            }}
                                        >
                                            {/* 用户编辑指示器 */}
                                            {/* <UserEditingIndicator
                                                projectId={projectId}
                                                taskId={task.id}
                                                taskTitle={task.title}
                                            /> */}
                                            {/* 任务标题、优先级和状态 */}
                                            <div className="flex items-start justify-between mb-3">
                                                <h4 className="text-sm font-semibold text-gray-900 line-clamp-2 hover:text-blue-600 transition-colors flex-1 mr-3 group-hover/task:text-blue-700">
                                                    {task.title}
                                                </h4>
                                                <div className="flex items-center space-x-2 flex-shrink-0">
                                                    {task.status && (
                                                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getStatusStyle(task.status)}`}>
                                                            {getStatusText(task.status)}
                                                        </span>
                                                    )}
                                                    {task.priority && (
                                                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getPriorityStyle(task.priority)}`}>
                                                            {task.priority}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* 任务描述 */}
                                            {task.description && (
                                                <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                                                    {task.description}
                                                </p>
                                            )}

                                            {/* 任务元信息 */}
                                            <div className="flex items-center justify-between text-xs text-gray-500">
                                                <div className="flex items-center space-x-3">
                                                    {task.assignee && (
                                                        <div className="flex items-center group/assignee">
                                                            <div className="w-5 h-5 bg-gray-100 rounded-lg flex items-center justify-center mr-2 group-hover/assignee:bg-blue-100 transition-colors">
                                                                <User className="h-3 w-3 text-gray-500 group-hover/assignee:text-blue-600" />
                                                            </div>
                                                            <span className="truncate max-w-20 font-medium text-gray-700 group-hover/assignee:text-blue-600 transition-colors">
                                                                {task.assignee.username}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {task.due_date && (
                                                        <div className="flex items-center group/due">
                                                            <div className="w-5 h-5 bg-gray-100 rounded-lg flex items-center justify-center mr-2 group-hover/due:bg-blue-100 transition-colors">
                                                                <Calendar className="h-3 w-3 text-gray-500 group-hover/due:text-blue-600" />
                                                            </div>
                                                            <span className="font-medium text-gray-700 group-hover/due:text-blue-600 transition-colors">
                                                                {new Date(task.due_date).toLocaleDateString('zh-CN')}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* 操作按钮 */}
                                                <div className="flex items-center space-x-2 opacity-0 group-hover/task:opacity-100 transition-all duration-300">
                                                    {/* 快速完成按钮 - 只对未完成的任务显示 */}
                                                    {task.status !== 'done' && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleQuickComplete(task.id);
                                                            }}
                                                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200 hover:scale-110"
                                                            title="快速完成"
                                                        >
                                                            <Zap className="h-3 w-3" />
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingTask(task);
                                                            setShowEditTaskModal(true);
                                                        }}
                                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 hover:scale-110"
                                                        title="编辑任务"
                                                        >
                                                            <Settings className="h-3 w-3" />
                                                        </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                
                                {/* 拖拽预览占位符 - 当拖拽到空阶段时显示 */}
                                {dragOverStage === stage.id && stageTasks.length === 0 && draggedTask && (
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-dashed border-blue-300 rounded-xl p-8 text-center transition-all duration-300 animate-pulse">
                                        <div className="text-blue-600 text-lg font-bold mb-2">
                                            📋 {draggedTask.title}
                                        </div>
                                        <div className="text-blue-500 text-sm">
                                            释放鼠标完成移动
                                        </div>
                                    </div>
                                )}

                                {/* 空阶段状态 */}
                                {!draggedTask && stageTasks.length === 0 && (
                                    <div className="flex-1 flex items-center justify-center p-8">
                                        {tasks.filter(task => task.stage_id === stage.id).length > 0 ? (
                                            // 有任务但被筛选掉了
                                            <div className="text-center text-gray-500">
                                                <Filter className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                                <p className="text-sm">没有符合筛选条件的任务</p>
                                                <p className="text-xs text-gray-400 mt-1">尝试调整筛选条件</p>
                                                
                                                {/* 筛选状态下的添加任务按钮 */}
                                                {(() => {
                                                    const canManageTasks = hasProjectPermission('manage_tasks', { user_role: projectUserRole });
                                                    return canManageTasks;
                                                })() && (
                                                    <button
                                                        onClick={() => {
                                                            console.log('点击筛选状态添加任务按钮，阶段ID:', stage.id);
                                                            setSelectedStageId(stage.id);
                                                            setShowCreateTaskModal(true);
                                                        }}
                                                        className="mt-4 px-6 py-3 text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 rounded-xl border border-blue-200 hover:border-blue-600 transition-all duration-300 flex items-center justify-center font-medium shadow-sm hover:shadow-md"
                                                    >
                                                        <Plus className="h-4 w-4 mr-2" />
                                                        添加任务
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            // 真的没有任务
                                            <div className="text-center text-gray-500">
                                                <p className="text-sm font-medium text-gray-600 mb-6">暂无任务</p>
                                                
                                                {/* 空阶段时的添加任务按钮 */}
                                                {(() => {
                                                    const canManageTasks = hasProjectPermission('manage_tasks', { user_role: projectUserRole });
                                                    return canManageTasks;
                                                })() && (
                                                    <button
                                                        onClick={() => {
                                                            console.log('点击空阶段添加任务按钮，阶段ID:', stage.id);
                                                            setSelectedStageId(stage.id);
                                                            setShowCreateTaskModal(true);
                                                        }}
                                                        className="px-6 py-3 text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 rounded-xl border border-blue-200 hover:border-blue-600 transition-all duration-300 flex items-center justify-center font-medium shadow-sm hover:shadow-md"
                                                    >
                                                        <Plus className="h-4 w-4 mr-2" />
                                                        创建第一个任务
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}


                                </div>
                                
                                {/* 添加任务按钮 - 只在有任务的阶段底部显示 */}
                                {stageTasks.length > 0 && (() => {
                                    const canManageTasks = hasProjectPermission('manage_tasks', { user_role: projectUserRole });
                                    console.log(`阶段 ${stage.name} 添加任务按钮权限检查:`, {
                                        systemUserRole: user?.role,
                                        projectUserRole: projectUserRole,
                                        isAdmin: user?.role === 'admin',
                                        canManageTasks,
                                        hasProjectPermission: typeof hasProjectPermission
                                    });
                                    return canManageTasks;
                                })() && (
                                    <div className="flex-shrink-0 p-4 pt-0">
                                        <button
                                            onClick={() => {
                                                console.log('点击添加任务按钮，阶段ID:', stage.id);
                                                setSelectedStageId(stage.id);
                                                setShowCreateTaskModal(true);
                                            }}
                                            className="w-full p-3 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-300 transition-all duration-300 flex items-center justify-center group/add hover:shadow-md"
                                            title="添加任务"
                                        >
                                            <div className="w-6 h-6 bg-gray-100 rounded-xl flex items-center justify-center group-hover/add:bg-blue-100 transition-colors">
                                                <Plus className="h-4 w-4 group-hover/add:text-blue-600" />
                                            </div>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                    })
                )}

                {/* 添加新阶段列 */}
                <div className="flex-shrink-0 w-80 pt-2">
                    <div className="h-full flex flex-col">
                        {hasProjectPermission('manage_stages', { user_role: projectUserRole }) ? (
                            <div
                                className="min-h-[160px] max-h-[240px] border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center hover:border-blue-400 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 transition-all duration-300 cursor-pointer group/add-stage hover:shadow-md"
                                onClick={() => setShowCreateStageModal(true)}
                            >
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center mb-4 group-hover/add-stage:from-blue-200 group-hover/add-stage:to-indigo-200 transition-all duration-300 shadow-sm group-hover/add-stage:shadow-md">
                                    <Plus className="h-6 w-6 text-blue-500 group-hover/add-stage:text-blue-600 group-hover/add-stage:scale-110 transition-all duration-300" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-700 group-hover/add-stage:text-blue-700 mb-2 transition-colors duration-300">
                                    添加新阶段
                                </h3>
                                <p className="text-sm text-gray-500 group-hover/add-stage:text-blue-600 text-center leading-relaxed transition-colors duration-300">
                                    创建新的工作阶段<br/>来组织项目任务
                                </p>
                            </div>
                        ) : (
                            <div className="min-h-[160px] max-h-[240px] border-2 border-dashed border-gray-200 rounded-lg p-4 flex flex-col items-center justify-center opacity-50">
                                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                                    <Plus className="h-6 w-6 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-400 mb-2">
                                    添加新阶段
                                </h3>
                                <p className="text-sm text-gray-400 text-center leading-relaxed">
                                    需要管理权限<br/>才能创建阶段
                                </p>
                            </div>
                        )}

                        {/* 拖拽提示 */}
                        <div className="flex-shrink-0 mt-6 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200">
                            <div className="flex items-center justify-center space-x-2 mb-2">
                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                            </div>
                            <p className="text-xs text-gray-600 text-center leading-relaxed">
                                拖拽任务卡片到其他阶段<br/>来移动任务
                            </p>
                        </div>
                    </div>
                </div>
                </div>
            </div>

            {/* 拖拽幽灵 - 跟随鼠标移动的卡片 */}
            {showDragGhost && draggedTask && (
                <div
                    className="fixed pointer-events-none z-[9999] bg-white p-4 rounded-lg shadow-2xl border-2 border-blue-300 opacity-90 transform -translate-x-1/2 -translate-y-1/2"
                    style={{
                        left: dragPosition.x,
                        top: dragPosition.y,
                        width: '320px', // 固定宽度，与阶段卡片宽度一致 (w-80 = 20rem = 320px)
                        maxWidth: '320px'
                    }}
                >
                    <div className="text-sm font-medium text-gray-900 mb-2 line-clamp-2">
                        {draggedTask.title}
                    </div>
                    {draggedTask.description && (
                        <div className="text-xs text-gray-600 mb-2 line-clamp-2">
                            {draggedTask.description}
                        </div>
                    )}
                    <div className="text-xs text-blue-600 font-medium">
                        📋 拖拽任务
                    </div>
                </div>
            )}

            {/* 模态框 */}
            <CreateTaskModal
                isOpen={showCreateTaskModal}
                onClose={() => {
                    setShowCreateTaskModal(false);
                    setSelectedStageId(null);
                }}
                onSuccess={(newTask) => {
                    console.log('收到新任务:', newTask);
                    
                    setTasks(prevTasks => {
                        // 检查任务是否已存在
                        const exists = prevTasks.some(task => task.id === newTask.id);
                        if (exists) {
                            console.log('⚠️ 任务已存在，跳过添加:', newTask.id);
                            return prevTasks;
                        }
                        
                        // 确保新任务有正确的字段
                        const taskToAdd = {
                            ...newTask,
                            stage_id: newTask.stage_id || selectedStageId
                        };
                        console.log('✅ 添加新任务到列表:', taskToAdd);
                        return [...prevTasks, taskToAdd];
                    });
                    
                    setShowCreateTaskModal(false);
                    setSelectedStageId(null);
                    
                    // 通知父组件更新项目任务数量
                    if (window.updateProjectTaskCount) {
                        window.updateProjectTaskCount(projectId, 1);
                    }
                    
                    // 更新项目过期状态
                    if (window.updateProjectOverdueStatus) {
                        window.updateProjectOverdueStatus(projectId);
                    }
                }}
                projectId={projectId}
                stage={stages.find(s => s.id === selectedStageId)}
                availableMembers={projectMembers}
            />

            <EditTaskModal
                isOpen={showEditTaskModal}
                onClose={() => {
                    setShowEditTaskModal(false);
                    setEditingTask(null);
                }}
                task={editingTask}
                onSubmit={handleUpdateTask}
                projectId={projectId}
                stages={stages}
                availableMembers={projectMembers}
            />

            <CreateStageModal
                isOpen={showCreateStageModal}
                onClose={() => setShowCreateStageModal(false)}
                onSubmit={handleCreateStage}
                projectId={projectId}
                projectName={project.name}
            />

            {/* 任务详情模态框 */}
            <TaskDetailModal
                isOpen={showTaskDetailModal}
                onClose={() => {
                    setShowTaskDetailModal(false);
                    setViewingTask(null);
                }}
                task={viewingTask}
                onEdit={() => {
                    setShowTaskDetailModal(false);
                    setViewingTask(null);
                    setEditingTask(viewingTask);
                    setShowEditTaskModal(true);
                }}
                onDelete={() => {
                    if (viewingTask) {
                        handleDeleteTask(viewingTask.id);
                    }
                    setShowTaskDetailModal(false);
                    setViewingTask(null);
                }}
                projectId={projectId}
                stages={stages}
            />

            {/* 阶段详情模态框 */}
            <StageDetailModal
                isOpen={showStageDetailModal}
                onClose={() => {
                    setShowStageDetailModal(false);
                    setViewingStage(null);
                }}
                stage={viewingStage}
                canManageStages={hasProjectPermission('manage_stages', { user_role: projectUserRole })}
                onEdit={() => {
                    setShowStageDetailModal(false);
                    setViewingStage(null);
                    setEditingStage(viewingStage);
                    setShowStageSettingsModal(true);
                }}
            />

            {/* 阶段设置模态框 */}
            <StageSettingsModal
                isOpen={showStageSettingsModal}
                onClose={() => {
                    setShowStageSettingsModal(false);
                    setEditingStage(null);
                }}
                stage={editingStage}
                onSubmit={async (stageData) => {
                    try {
                        console.log('更新阶段数据:', stageData);
                        
                        // 确保数字字段的类型转换
                        const processedStageData = {
                            ...stageData,
                            maxTasks: stageData.maxTasks ? parseInt(stageData.maxTasks, 10) : null
                        };

                        if (stageData.position !== undefined) {
                            const parsedPosition = parseInt(stageData.position, 10);
                            if (!Number.isNaN(parsedPosition)) {
                                processedStageData.position = parsedPosition;
                            } else {
                                delete processedStageData.position;
                            }
                        }
                        
                        const response = await stageAPI.updateStage(editingStage.id, processedStageData);
                        console.log('更新阶段API响应:', response);
                        
                        // 正确提取更新后的阶段数据
                        let updatedStage;
                        if (response.stage) {
                            updatedStage = response.stage;
                        } else if (response.data && response.data.stage) {
                            updatedStage = response.data.stage;
                        } else {
                            console.error('无法从响应中提取阶段数据:', response);
                            return;
                        }
                        
                        console.log('更新后的阶段数据:', updatedStage);
                        
                        // 更新阶段列表
                        setStages(prevStages => {
                            const updatedStages = prevStages.map(s =>
                                s.id === editingStage.id ? { ...s, ...updatedStage } : s
                            );
                            return [...updatedStages].sort((a, b) => (a.position || 0) - (b.position || 0));
                        });
                        
                        setShowStageSettingsModal(false);
                        setEditingStage(null);
                    } catch (error) {
                        console.error('更新阶段失败:', error);
                    }
                }}
            />
            
            
            {/* 通知管理功能已移除 */}
            
            {/* 已完成任务弹框 */}
            {showCompletedTasksModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full mx-4 h-[85vh] flex flex-col overflow-hidden">
                        {/* 弹框头部 */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                    <CheckSquare className="h-5 w-5 text-green-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">已完成任务</h2>
                                    <p className="text-sm text-gray-500">共 {completedTasksCount} 个任务已完成</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowCompletedTasksModal(false)}
                                className="p-2 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                            >
                                <X className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>
                        
                        {/* 筛选器 */}
                        <div className="flex-shrink-0 p-6 border-b border-gray-200 bg-white">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                {/* 搜索框 */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="搜索任务..."
                                        value={completedTasksFilters.searchTerm}
                                        onChange={(e) => setCompletedTasksFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    />
                                </div>
                                
                                {/* 阶段筛选 */}
                                <select
                                    value={completedTasksFilters.stage}
                                    onChange={(e) => setCompletedTasksFilters(prev => ({ ...prev, stage: e.target.value }))}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                >
                                    <option value="">所有阶段</option>
                                    {stages.map(stage => (
                                        <option key={stage.id} value={stage.id}>
                                            {stage.name}
                                        </option>
                                    ))}
                                </select>
                                
                            </div>
                            
                            {/* 筛选结果统计 */}
                            <div className="mt-3 text-sm text-gray-600">
                                显示 {filteredCompletedTasks.length} / {completedTasks.length} 个已完成任务
                            </div>
                        </div>
                        
                        {/* 弹框内容 */}
                        <div className="flex-1 p-6 overflow-y-auto group/scrollbar">
                            {filteredCompletedTasks.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckSquare className="h-8 w-8 text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">暂无已完成任务</h3>
                                    <p className="text-gray-500">完成任务后，它们会出现在这里</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {filteredCompletedTasks.map((task) => (
                                        <div
                                            key={task.id}
                                            className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors duration-200"
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                    <h4 className="font-medium text-gray-900">{task.title}</h4>
                                                </div>
                                                {task.description && (
                                                    <p className="text-sm text-gray-600 mt-1 ml-5 line-clamp-2">
                                                        {task.description}
                                                    </p>
                                                )}
                                                <div className="flex items-center space-x-4 mt-2 ml-5 text-xs text-gray-500">
                                                    {task.assignee && (
                                                        <div className="flex items-center space-x-1">
                                                            <User className="h-3 w-3" />
                                                            <span>{task.assignee.username || '未分配'}</span>
                                                        </div>
                                                    )}
                                                    {task.due_date && (
                                                        <div className="flex items-center space-x-1">
                                                            <Calendar className="h-3 w-3" />
                                                            <span>{new Date(task.due_date).toLocaleDateString('zh-CN')}</span>
                                                        </div>
                                                    )}
                                                    {task.completed_at && (
                                                        <div className="flex items-center space-x-1">
                                                            <CheckSquare className="h-3 w-3" />
                                                            <span>完成于 {new Date(task.completed_at).toLocaleDateString('zh-CN')}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                                    已完成
                                                </span>
                                                
                                                {/* 恢复按钮下拉菜单 */}
                                                <div className="relative group">
                                                    <button
                                                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors duration-200"
                                                        title="恢复任务状态"
                                                    >
                                                        <RotateCcw className="h-4 w-4" />
                                                    </button>
                                                    
                                                    {/* 下拉菜单 */}
                                                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                                                        <div className="py-1">
                                                            <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100">
                                                                恢复到状态：
                                                            </div>
                                                            <button
                                                                onClick={() => handleRecoverTask(task.id, 'todo')}
                                                                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                                                            >
                                                                <div className="flex items-center space-x-2">
                                                                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                                                    <span>待开始</span>
                                                                </div>
                                                            </button>
                                                            <button
                                                                onClick={() => handleRecoverTask(task.id, 'in_progress')}
                                                                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                                                            >
                                                                <div className="flex items-center space-x-2">
                                                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                                    <span>进行中</span>
                                                                </div>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {/* 成员管理弹框 */}
            <ProjectMemberModal
                isOpen={showMemberModal}
                onClose={() => setShowMemberModal(false)}
                project={project}
                onUpdate={() => {
                    // 刷新项目成员数据
                    fetchProjectMembers();
                }}
            />
            

        </div>
    );
};

export default ProjectBoard;