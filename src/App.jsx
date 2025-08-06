import React, { useState } from 'react';
import { Tabs, ConfigProvider, Spin } from 'antd';
import { FileTextOutlined, PictureOutlined, SettingOutlined } from '@ant-design/icons';
import FileManager from './components/FileManager';
import Gallery from './components/Gallery';
import Settings from './components/Settings';
import Login from './components/Login';
import { OSSProvider } from './contexts/OSSContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import './App.css';

const { TabPane } = Tabs;

// 主应用内容组件
const MainApp = () => {
  const [activeTab, setActiveTab] = useState('1');
  const { isAuthenticated, loading } = useAuth();

  const items = [
    {
      key: '1',
      label: (
        <span>
          <FileTextOutlined />
          文件管理
        </span>
      ),
      children: <FileManager />,
    },
    {
      key: '2',
      label: (
        <span>
          <PictureOutlined />
          相册
        </span>
      ),
      children: <Gallery />,
    },
    {
      key: '3',
      label: (
        <span>
          <SettingOutlined />
          设置
        </span>
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
          colorPrimary: '#1890ff',
        },
      }}
    >
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ConfigProvider>
  );
}

export default App;
