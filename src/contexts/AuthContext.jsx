import React, { createContext, useContext, useState, useEffect } from 'react';
import { showMessage } from '../utils/messageService';
import { verifyPassword } from '../utils/crypto';
import usersData from '../data/users.json';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 检查本地存储中的登录状态
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    const loginTime = localStorage.getItem('loginTime');
    
    if (savedUser && loginTime) {
      const now = new Date().getTime();
      const loginTimestamp = parseInt(loginTime);
      // 登录有效期为24小时
      const validDuration = 24 * 60 * 60 * 1000;
      
      if (now - loginTimestamp < validDuration) {
        setCurrentUser(JSON.parse(savedUser));
        setIsAuthenticated(true);
      } else {
        // 登录已过期，清除本地存储
        localStorage.removeItem('currentUser');
        localStorage.removeItem('loginTime');
      }
    }
    setLoading(false);
  }, []);

  // 登录函数
  const login = async (username, password) => {
    try {
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 查找用户
      const user = usersData.find(
        u => u.username === username && verifyPassword(password, u.password)
      );
      
      if (user) {
        const userInfo = {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role
        };
        
        setCurrentUser(userInfo);
        setIsAuthenticated(true);
        
        // 保存到本地存储
        localStorage.setItem('currentUser', JSON.stringify(userInfo));
        localStorage.setItem('loginTime', new Date().getTime().toString());
        
        showMessage.success('登录成功');
        return { success: true };
      } else {
        showMessage.error('用户名或密码错误');
        return { success: false, message: '用户名或密码错误' };
      }
    } catch (error) {
      showMessage.error('登录失败，请重试');
      return { success: false, message: '登录失败，请重试' };
    }
  };

  // 登出函数
  const logout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('loginTime');
    showMessage.success('已退出登录');
  };

  const value = {
    isAuthenticated,
    currentUser,
    loading,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;