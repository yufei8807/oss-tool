import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Upload,
  List,
  Modal,
  Spin,
  Empty,
  Space,
  Input,
  Popconfirm,
  Tag,
  Image,
  App
} from 'antd';
import {
  UploadOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  ReloadOutlined,
  SearchOutlined,
  FileOutlined,
  PictureOutlined
} from '@ant-design/icons';
import { useOSS } from '../contexts/OSSContext';

const { Search } = Input;
const { Dragger } = Upload;

const FileManager = () => {
  const { message } = App.useApp();
  const { isConnected, uploadFile, deleteFile, listFiles, getFileUrl, downloadFile, clearFileListCache } = useOSS();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // 获取文件列表
  const fetchFiles = async (forceRefresh = false) => {
    if (!isConnected) return;
    
    try {
      setLoading(true);
      const fileList = await listFiles('', 100, !forceRefresh);
      setFiles(fileList);
      setHasLoadedOnce(true);
    } catch (error) {
      message.error('获取文件列表失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 只有在连接状态且未加载过时才自动加载
    if (isConnected && !hasLoadedOnce) {
      fetchFiles();
    }
  }, [isConnected, hasLoadedOnce]);

  // 上传文件
  const handleUpload = async (file) => {
    if (!isConnected) {
      message.error('请先配置OSS连接');
      return false;
    }

    try {
      setUploading(true);
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      await uploadFile(file, fileName);
      message.success('文件上传成功');
      fetchFiles();
    } catch (error) {
      message.error('文件上传失败: ' + error.message);
    } finally {
      setUploading(false);
    }
    return false;
  };

  // 删除文件
  const handleDelete = async (fileName) => {
    try {
      await deleteFile(fileName);
      message.success('文件删除成功');
      fetchFiles();
    } catch (error) {
      message.error('文件删除失败: ' + error.message);
    }
  };

  // 下载文件
  const handleDownload = async (fileName) => {
    try {
      await downloadFile(fileName);
      message.success('开始下载文件');
    } catch (error) {
      message.error('文件下载失败: ' + error.message);
    }
  };

  // 预览文件
  const handlePreview = (file) => {
    try {
      const url = getFileUrl(file.name);
      setPreviewFile({ ...file, url });
      setPreviewVisible(true);
    } catch (error) {
      message.error('获取预览链接失败: ' + error.message);
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 判断是否为图片文件
  const isImageFile = (fileName) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    return imageExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
  };

  // 过滤文件
  const filteredFiles = files.filter(file => 
    file.name.toLowerCase().includes(searchText.toLowerCase())
  );

  if (!isConnected) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Empty
          description="请先在设置页面配置OSS连接"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '0' }}>
              {/* 上传区域 */}
        <Card title="文件上传" style={{ marginBottom: '12px' }}>
        <Dragger
          beforeUpload={handleUpload}
          showUploadList={false}
          multiple
          disabled={uploading}
        >
          <p className="ant-upload-drag-icon">
            <UploadOutlined />
          </p>
          <p className="ant-upload-text">
            {uploading ? '上传中...' : '点击或拖拽文件到此区域上传'}
          </p>
          <p className="ant-upload-hint">
            支持单个或批量上传
          </p>
        </Dragger>
      </Card>

      {/* 操作栏 */}
      <Card style={{ marginBottom: '12px' }}>
        <Space size="large" className="file-manager-toolbar" style={{ width: '100%', justifyContent: 'flex-start', alignItems: 'center' }}>
          <Search
            placeholder="搜索文件"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<SearchOutlined />}
          />
          <Button 
            icon={<ReloadOutlined />} 
            onClick={() => fetchFiles(true)}
            loading={loading}
            title="刷新"
            style={{ flexShrink: 0 }}
          />
        </Space>
      </Card>

      {/* 文件列表 */}
      <Card title="文件列表" className="file-list-card">
        <Spin spinning={loading}>
          {filteredFiles.length === 0 ? (
            <Empty description="暂无文件" />
          ) : (
            <List
              dataSource={filteredFiles}
              renderItem={(file) => (
                <List.Item
                  actions={[
                    <Button
                      type="text"
                      icon={<EyeOutlined />}
                      onClick={() => handlePreview(file)}
                    />,
                    <Button
                      type="text"
                      icon={<DownloadOutlined />}
                      onClick={() => handleDownload(file.name)}
                    />,
                    <Popconfirm
                      title="确定要删除这个文件吗？"
                      onConfirm={() => handleDelete(file.name)}
                      okText="确定"
                      cancelText="取消"
                    >
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                      />
                    </Popconfirm>
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      isImageFile(file.name) ? (
                        <PictureOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
                      ) : (
                        <FileOutlined style={{ fontSize: '24px', color: '#666' }} />
                      )
                    }
                    title={file.name}
                    description={
                      <Space>
                        <Tag>{formatFileSize(file.size)}</Tag>
                        <span>{new Date(file.lastModified).toLocaleString()}</span>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Spin>
      </Card>

      {/* 预览模态框 */}
      <Modal
        title={previewFile?.name}
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={[
          <Button key="download" onClick={() => handleDownload(previewFile?.name)}>
            下载
          </Button>,
          <Button key="close" onClick={() => setPreviewVisible(false)}>
            关闭
          </Button>
        ]}
        width={800}
      >
        {previewFile && (
          <div style={{ textAlign: 'center' }}>
            {isImageFile(previewFile.name) ? (
              <Image
                src={previewFile.url}
                alt={previewFile.name}
                style={{ maxWidth: '100%', maxHeight: '500px' }}
              />
            ) : (
              <div>
                <FileOutlined style={{ fontSize: '64px', color: '#666' }} />
                <p>此文件类型不支持预览，请下载后查看</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default FileManager;