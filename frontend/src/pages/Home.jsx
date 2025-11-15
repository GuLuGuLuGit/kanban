import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, 
  Users, 
  Target, 
  TrendingUp, 
  Shield, 
  Zap,
  CheckCircle,
  ArrowRight,
  LogIn,
  UserPlus
} from 'lucide-react';

const Home = () => {
  const features = [
    {
      icon: Target,
      title: '智能项目管理',
      description: '清晰的任务结构，让团队工作井然有序'
    },
    {
      icon: Users,
      title: '团队协作',
      description: '实时同步，让团队成员保持高效沟通'
    },
    {
      icon: TrendingUp,
      title: '数据洞察',
      description: '可视化分析，助力团队做出更好决策'
    },
    {
      icon: Shield,
      title: '安全可靠',
      description: '企业级安全保障，数据安全无忧'
    },
    {
      icon: Zap,
      title: '快速响应',
      description: '实时更新，快速响应变化需求'
    },
    {
      icon: CheckCircle,
      title: '简单易用',
      description: '直观界面，轻松上手，立即开始'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* 顶部导航栏 */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">团队协作平台</span>
            </Link>

            {/* 右上角登录/注册按钮 */}
            <div className="flex items-center space-x-3">
              <Link
                to="/login"
                className="inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
              >
                <LogIn className="h-4 w-4 mr-2" />
                登录
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-blue-600 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                免费注册
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* 主要内容区域 */}
      <main>
        {/* 功能特性区域 */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                强大功能，助力团队协作
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                提供全方位的项目管理工具，让团队工作更高效
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={index}
                    className="bg-gray-50 rounded-2xl p-8 hover:shadow-lg transition-all duration-300 border border-gray-100"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA 区域 */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-600 to-indigo-700">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              准备开始了吗？
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              立即注册，免费开始您的项目管理之旅
            </p>
            <div className="flex items-center justify-center space-x-4">
              <Link
                to="/register"
                className="inline-flex items-center px-8 py-4 bg-white text-blue-600 text-lg font-semibold rounded-xl hover:bg-gray-50 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
              >
                免费注册
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center px-8 py-4 border-2 border-white text-white text-lg font-semibold rounded-xl hover:bg-white hover:text-blue-600 transition-all duration-200"
              >
                立即登录
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* 页脚 */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center space-y-4">
            {/* Logo 和品牌 */}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-semibold">团队协作平台</span>
            </div>
            
            {/* 版权信息 */}
            <p className="text-gray-400 text-sm">
              © 2024 团队协作平台. All rights reserved.
            </p>
            
            {/* 备案信息 */}
            <span className="text-gray-500 text-sm">
              本地部署版本（无需联网）
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
