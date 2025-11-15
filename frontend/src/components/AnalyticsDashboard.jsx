import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Calendar,
  Target,
  Activity,
  Download,
  RefreshCw
} from 'lucide-react';
import { analyticsAPI } from '../services/api';

const AnalyticsDashboard = ({ projectId }) => {
  const [projectStats, setProjectStats] = useState(null);
  const [taskStats, setTaskStats] = useState(null);
  const [stageStats, setStageStats] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('30');

  // 获取统计数据
  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [projectResponse, taskResponse, stageResponse, trendResponse] = await Promise.all([
        analyticsAPI.getProjectStats(projectId),
        analyticsAPI.getTaskStats(projectId),
        analyticsAPI.getStageStats(projectId),
        analyticsAPI.getTaskTrend(projectId, timeRange)
      ]);

      setProjectStats(projectResponse);
      setTaskStats(taskResponse);
      setStageStats(stageResponse);
      setTrendData(trendResponse.trend || []);
    } catch (err) {
      setError('获取统计数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchAnalytics();
    }
  }, [projectId, timeRange]);

  // 刷新数据
  const handleRefresh = () => {
    fetchAnalytics();
  };

  // 导出数据
  const handleExport = () => {
    // 这里可以实现数据导出功能
    console.log('导出数据');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
        <p>{error}</p>
        <button
          onClick={handleRefresh}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">项目统计</h2>
          <p className="text-gray-600">项目数据分析和趋势</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7">最近7天</option>
            <option value="30">最近30天</option>
            <option value="90">最近90天</option>
            <option value="365">最近一年</option>
          </select>
          <button
            onClick={handleRefresh}
            className="p-2 text-gray-400 hover:text-gray-600"
            title="刷新数据"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          <button
            onClick={handleExport}
            className="p-2 text-gray-400 hover:text-gray-600"
            title="导出数据"
          >
            <Download className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="总任务数"
          value={taskStats?.total_tasks || 0}
          icon={Target}
          color="text-blue-500"
          bgColor="bg-blue-50"
        />
        <StatCard
          title="已完成"
          value={taskStats?.completed_tasks || 0}
          icon={CheckCircle}
          color="text-green-500"
          bgColor="bg-green-50"
        />
        <StatCard
          title="进行中"
          value={taskStats?.in_progress_tasks || 0}
          icon={Clock}
          color="text-yellow-500"
          bgColor="bg-yellow-50"
        />
        <StatCard
          title="逾期任务"
          value={taskStats?.overdue_tasks || 0}
          icon={AlertTriangle}
          color="text-red-500"
          bgColor="bg-red-50"
        />
      </div>

      {/* 完成率 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">任务完成率</h3>
            <span className="text-2xl font-bold text-blue-600">
              {taskStats?.completion_rate?.toFixed(1) || 0}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${taskStats?.completion_rate || 0}%` }}
            ></div>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            {taskStats?.completed_tasks || 0} / {taskStats?.total_tasks || 0} 个任务已完成
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">项目成员</h3>
            <span className="text-2xl font-bold text-green-600">
              {projectStats?.total_members || 0}
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">总成员</span>
              <span className="font-medium">{projectStats?.total_members || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">活跃成员</span>
              <span className="font-medium text-green-600">{projectStats?.active_members || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">总评论</span>
              <span className="font-medium">{projectStats?.total_comments || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 阶段统计 */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">阶段统计</h3>
        <div className="space-y-4">
          {stageStats.map((stage) => (
            <div key={stage.stage_id} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">{stage.stage_name}</span>
                <span className="text-sm text-gray-600">
                  {stage.completed_tasks} / {stage.total_tasks}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${stage.completion_rate}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-500">
                完成率: {stage.completion_rate.toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 趋势图表 */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">任务趋势</h3>
        <div className="h-64">
          <SimpleLineChart data={trendData} />
        </div>
      </div>
    </div>
  );
};

// 统计卡片组件
const StatCard = ({ title, value, icon: Icon, color, bgColor }) => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
      <div className={`p-3 rounded-full ${bgColor}`}>
        <Icon className={`h-6 w-6 ${color}`} />
      </div>
    </div>
  </div>
);

// 简单折线图组件
const SimpleLineChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        暂无数据
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;

  return (
    <div className="h-full flex items-end space-x-1">
      {data.map((point, index) => {
        const height = ((point.value - minValue) / range) * 100;
        return (
          <div key={index} className="flex-1 flex flex-col items-center">
            <div
              className="w-full bg-blue-500 rounded-t"
              style={{ height: `${height}%` }}
            ></div>
            <div className="text-xs text-gray-500 mt-1 transform -rotate-45 origin-left">
              {point.date.split('-')[2]}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AnalyticsDashboard;
