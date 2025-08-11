import React, { createContext, useContext, useState, useEffect } from 'react';
import OSS from 'ali-oss';
import { showMessage } from '../utils/messageService';

const OSSContext = createContext();

export const useOSS = () => {
  const context = useContext(OSSContext);
  if (!context) {
    throw new Error('useOSS must be used within an OSSProvider');
  }
  return context;
};

export const OSSProvider = ({ children }) => {
  const [ossClient, setOssClient] = useState(null);
  const [ossConfigs, setOssConfigs] = useState([]);
  const [currentConfigId, setCurrentConfigId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // 文件列表缓存
  const [fileListCache, setFileListCache] = useState(new Map());
  const [cacheTimestamp, setCacheTimestamp] = useState(new Map());

  // 获取当前活跃配置
  const currentConfig = ossConfigs.find(config => config.id === currentConfigId) || {
    id: null,
    name: '',
    region: '',
    accessKeyId: '',
    accessKeySecret: '',
    bucket: '',
    endpoint: ''
  };

  // 从localStorage加载配置
  useEffect(() => {
    const savedConfigs = localStorage.getItem('ossConfigs');
    const savedCurrentId = localStorage.getItem('currentOssConfigId');
    
    if (savedConfigs) {
      try {
        const configs = JSON.parse(savedConfigs);
        setOssConfigs(configs);
        
        if (savedCurrentId && configs.find(c => c.id === savedCurrentId)) {
          setCurrentConfigId(savedCurrentId);
          const activeConfig = configs.find(c => c.id === savedCurrentId);
          if (activeConfig && activeConfig.accessKeyId && activeConfig.accessKeySecret && activeConfig.bucket) {
            initOSSClient(activeConfig);
          }
        } else if (configs.length > 0) {
          // 如果没有保存的当前配置ID，使用第一个配置
          setCurrentConfigId(configs[0].id);
          if (configs[0].accessKeyId && configs[0].accessKeySecret && configs[0].bucket) {
            initOSSClient(configs[0]);
          }
        }
      } catch (error) {
        console.error('Failed to parse saved OSS configs:', error);
      }
    }
  }, []);

  // 初始化OSS客户端
  const initOSSClient = async (config) => {
    try {
      setLoading(true);
      
      // 清除旧的缓存数据
      clearFileListCache();
      
      const client = new OSS({
        region: config.region || 'oss-cn-hangzhou',
        accessKeyId: config.accessKeyId,
        accessKeySecret: config.accessKeySecret,
        bucket: config.bucket,
        endpoint: config.endpoint
      });
      
      // 测试连接
      await client.listV2({
        'max-keys': 1
      });
      
      setOssClient(client);
      setIsConnected(true);
      showMessage.success('OSS连接成功');
    } catch (error) {
      console.error('OSS connection failed:', error);
      setIsConnected(false);
      showMessage.error('OSS连接失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 生成唯一ID
  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  // 保存配置列表到localStorage
  const saveConfigsToStorage = (configs, currentId) => {
    localStorage.setItem('ossConfigs', JSON.stringify(configs));
    if (currentId) {
      localStorage.setItem('currentOssConfigId', currentId);
    }
  };

  // 添加新配置
  const addConfig = (config) => {
    const newConfig = {
      ...config,
      id: generateId(),
      name: config.name || `配置 ${ossConfigs.length + 1}`
    };
    const newConfigs = [...ossConfigs, newConfig];
    setOssConfigs(newConfigs);
    saveConfigsToStorage(newConfigs, newConfig.id);
    setCurrentConfigId(newConfig.id);
    
    if (newConfig.accessKeyId && newConfig.accessKeySecret && newConfig.bucket) {
      initOSSClient(newConfig);
    }
    return newConfig.id;
  };

  // 更新配置
  const updateConfig = (configId, config) => {
    const newConfigs = ossConfigs.map(c => 
      c.id === configId ? { ...c, ...config } : c
    );
    setOssConfigs(newConfigs);
    saveConfigsToStorage(newConfigs, currentConfigId);
    
    // 如果更新的是当前配置，重新初始化客户端
    if (configId === currentConfigId) {
      const updatedConfig = newConfigs.find(c => c.id === configId);
      if (updatedConfig && updatedConfig.accessKeyId && updatedConfig.accessKeySecret && updatedConfig.bucket) {
        initOSSClient(updatedConfig);
      }
    }
  };

  // 删除配置
  const deleteConfig = (configId) => {
    const newConfigs = ossConfigs.filter(c => c.id !== configId);
    setOssConfigs(newConfigs);
    
    if (configId === currentConfigId) {
      const newCurrentId = newConfigs.length > 0 ? newConfigs[0].id : null;
      setCurrentConfigId(newCurrentId);
      setOssClient(null);
      setIsConnected(false);
      
      if (newCurrentId) {
        const newCurrentConfig = newConfigs[0];
        if (newCurrentConfig.accessKeyId && newCurrentConfig.accessKeySecret && newCurrentConfig.bucket) {
          initOSSClient(newCurrentConfig);
        }
      }
      saveConfigsToStorage(newConfigs, newCurrentId);
    } else {
      saveConfigsToStorage(newConfigs, currentConfigId);
    }
  };

  // 切换配置
  const switchConfig = (configId) => {
    setCurrentConfigId(configId);
    localStorage.setItem('currentOssConfigId', configId);
    
    // 切换配置时清除缓存
    clearFileListCache();
    
    const config = ossConfigs.find(c => c.id === configId);
    if (config && config.accessKeyId && config.accessKeySecret && config.bucket) {
      initOSSClient(config);
    } else {
      setOssClient(null);
      setIsConnected(false);
    }
  };

  // 清空所有配置
  const clearAllConfigs = () => {
    setOssConfigs([]);
    setCurrentConfigId(null);
    setOssClient(null);
    setIsConnected(false);
    localStorage.removeItem('ossConfigs');
    localStorage.removeItem('currentOssConfigId');
  };

  // 批量导入配置
  const importConfigs = (configs, targetCurrentConfigId = null) => {
    // 为每个配置生成新的ID
    const newConfigs = configs.map(config => ({
      ...config,
      id: generateId()
    }));
    
    setOssConfigs(newConfigs);
    
    // 设置当前配置
    let newCurrentConfigId = null;
    if (targetCurrentConfigId && configs.find(c => c.id === targetCurrentConfigId)) {
      // 找到对应的新配置ID
      const originalIndex = configs.findIndex(c => c.id === targetCurrentConfigId);
      if (originalIndex >= 0) {
        newCurrentConfigId = newConfigs[originalIndex].id;
      }
    }
    
    if (!newCurrentConfigId && newConfigs.length > 0) {
      newCurrentConfigId = newConfigs[0].id;
    }
    
    if (newCurrentConfigId) {
      setCurrentConfigId(newCurrentConfigId);
      const activeConfig = newConfigs.find(c => c.id === newCurrentConfigId);
      if (activeConfig && activeConfig.accessKeyId && activeConfig.accessKeySecret && activeConfig.bucket) {
        initOSSClient(activeConfig);
      }
    }
    
    saveConfigsToStorage(newConfigs, newCurrentConfigId);
  };

  // 兼容旧版本的保存配置方法
  const saveConfig = (config) => {
    if (currentConfigId) {
      updateConfig(currentConfigId, config);
    } else {
      addConfig(config);
    }
  };

  // 上传文件
  const uploadFile = async (file, path) => {
    if (!ossClient) {
      throw new Error('OSS客户端未初始化');
    }
    
    try {
      const result = await ossClient.put(path, file);
      // 清除缓存，因为文件列表已经改变
      clearFileListCache();
      return result;
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    }
  };

  // 删除文件
  const deleteFile = async (path) => {
    if (!ossClient) {
      throw new Error('OSS客户端未初始化');
    }
    
    try {
      const result = await ossClient.delete(path);
      // 清除缓存，因为文件列表已经改变
      clearFileListCache();
      return result;
    } catch (error) {
      console.error('Delete failed:', error);
      throw error;
    }
  };

  // 清除文件列表缓存
  const clearFileListCache = () => {
    setFileListCache(new Map());
    setCacheTimestamp(new Map());
  };

  // 获取文件列表（带缓存）
  const listFiles = async (prefix = '', maxKeys = 100, useCache = true) => {
    if (!ossClient) {
      throw new Error('OSS客户端未初始化');
    }
    
    const cacheKey = `${prefix}_${maxKeys}`;
    const now = Date.now();
    const cacheExpiry = 5 * 60 * 1000; // 5分钟缓存过期时间
    
    // 检查缓存
    if (useCache && fileListCache.has(cacheKey)) {
      const timestamp = cacheTimestamp.get(cacheKey);
      if (timestamp && (now - timestamp) < cacheExpiry) {
        console.log('使用缓存的文件列表');
        return fileListCache.get(cacheKey);
      }
    }
    
    try {
      console.log('从OSS获取文件列表');
      const result = await ossClient.listV2({
        prefix,
        'max-keys': maxKeys
      });
      const files = result.objects || [];
      
      // 更新缓存
      if (useCache) {
        setFileListCache(prev => new Map(prev.set(cacheKey, files)));
        setCacheTimestamp(prev => new Map(prev.set(cacheKey, now)));
      }
      
      return files;
    } catch (error) {
      console.error('List files failed:', error);
      throw error;
    }
  };

  // 获取文件URL
  const getFileUrl = (path, expires = 3600) => {
    if (!ossClient) {
      throw new Error('OSS客户端未初始化');
    }
    
    try {
      return ossClient.signatureUrl(path, { expires });
    } catch (error) {
      console.error('Get file URL failed:', error);
      throw error;
    }
  };

  // 下载文件
  const downloadFile = async (path, filename) => {
    if (!ossClient) {
      throw new Error('OSS客户端未初始化');
    }
    
    try {
      const url = getFileUrl(path);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || path.split('/').pop();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
      throw error;
    }
  };

  const value = {
    ossClient,
    ossConfig: currentConfig, // 兼容旧版本
    ossConfigs,
    currentConfigId,
    currentConfig,
    isConnected,
    loading,
    saveConfig,
    addConfig,
    updateConfig,
    deleteConfig,
    switchConfig,
    clearAllConfigs,
    importConfigs,
    uploadFile,
    deleteFile,
    listFiles,
    getFileUrl,
    downloadFile,
    clearFileListCache
  };

  return (
    <OSSContext.Provider value={value}>
      {children}
    </OSSContext.Provider>
  );
};