import React, { useState, useEffect } from 'react';
import { Tabs, ConfigProvider, Spin, App as AntdApp } from 'antd';
import { FileTextOutlined, PictureOutlined, SettingOutlined } from '@ant-design/icons';
import FileManager from './components/FileManager';
import Gallery from './components/Gallery';
import Settings from './components/Settings';
import Login from './components/Login';
import { OSSProvider } from './contexts/OSSContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { setMessageApi } from './utils/messageService';
import './App.css';

const { TabPane } = Tabs;

// 主应用内容组件
const MainApp = () => {
  const [activeTab, setActiveTab] = useState('1');
  const { isAuthenticated, loading } = useAuth();
  const { message } = AntdApp.useApp();

  // 设置全局message API
  useEffect(() => {
    setMessageApi(message);
  }, [message]);

  const items = [
    {
      key: '1',
      label: (
        <div className="tab-item">
          <FileTextOutlined className="tab-icon" />
          <span className="tab-text">文件管理</span>
        </div>
      ),
      children: <FileManager />,
    },
    {
      key: '2',
      label: (
        <div className="tab-item">
          <PictureOutlined className="tab-icon" />
          <span className="tab-text">相册</span>
        </div>
      ),
      children: <Gallery />,
    },
    {
      key: '3',
      label: (
        <div className="tab-item">
          <SettingOutlined className="tab-icon" />
          <span className="tab-text">设置</span>
        </div>
      ),
      children: <Settings />,
    },
  ];

  // 加载中状态
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <Spin size="large" />
      </div>
    );
  }

  // 未登录显示登录页面
  if (!isAuthenticated) {
    return <Login />;
  }

  // 已登录显示主应用
  return (
    <OSSProvider>
      <div className="app-container">
        <div className="app-header">
          <h1>OSS 移动端工具</h1>
        </div>
        <div className="app-content">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={items}
            tabPosition="bottom"
            size="large"
            className="bottom-tabs"
            destroyOnHidden={false}
          />
        </div>
      </div>
    </OSSProvider>
  );
};

// 根应用组件
function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#667eea',
          colorSuccess: '#52c41a',
          colorWarning: '#faad14',
          colorError: '#ff4d4f',
          borderRadius: 12,
          colorBgContainer: 'rgba(255, 255, 255, 0.9)',
          colorBorder: 'rgba(255, 255, 255, 0.2)',
          colorText: '#333',
          colorTextSecondary: '#666',
          boxShadow: '0 4px 32px rgba(0, 0, 0, 0.1)',
        },
        components: {
          Card: {
            colorBgContainer: 'rgba(255, 255, 255, 0.9)',
            boxShadow: '0 4px 32px rgba(0, 0, 0, 0.1)',
          },
          Button: {
            colorPrimary: '#667eea',
            colorPrimaryHover: '#764ba2',
          },
          Input: {
            colorBgContainer: 'rgba(255, 255, 255, 0.9)',
            colorBorder: 'rgba(102, 126, 234, 0.3)', /* 默认边框颜色 */
            colorBorderHover: 'rgba(102, 126, 234, 0.5)', /* 悬停边框颜色 */
            activeBorderColor: '#667eea', /* 聚焦边框颜色 */
            activeShadow: '0 0 0 2px rgba(102, 126, 234, 0.2)',
            boxShadow: 'none', /* 移除默认阴影 */
          },
        },
      }}
    >
      <AntdApp>
        <AuthProvider>
          <MainApp />
        </AuthProvider>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;
