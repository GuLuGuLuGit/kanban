import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProjectsProvider } from './contexts/ProjectsContext';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ProjectBoard from './pages/ProjectBoard';
// 暂时隐藏协作相关页面的导入
// import AdvancedCollaboration from './pages/AdvancedCollaboration';
// import CollaborationTest from './pages/CollaborationTest';
import Layout from './components/Layout';

// 受保护的路由组件
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-600">加载中...</div>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// 公共路由组件（已登录用户重定向到仪表板）
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-600">加载中...</div>
      </div>
    );
  }
  
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* 公共路由 */}
      <Route path="/" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />
      <Route path="/register" element={
        <PublicRoute>
          <Register />
        </PublicRoute>
      } />
      
      {/* 受保护的路由 */}
      <Route path="/*" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="projects/:projectId" element={<ProjectBoard />} />
        {/* 暂时隐藏协作相关路由 */}
        {/* <Route path="projects/:projectId/advanced-collaboration" element={<AdvancedCollaboration />} /> */}
        {/* <Route path="collaboration-test" element={<CollaborationTest />} /> */}
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <ProjectsProvider>
            <AppRoutes />
          </ProjectsProvider>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
