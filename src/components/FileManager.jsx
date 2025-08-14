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
  App,
  Typography
} from 'antd';

import {
  UploadOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  ReloadOutlined,
  SearchOutlined,
  FileOutlined,
  PictureOutlined,
  FileTextOutlined,
  FilePdfOutlined,
  PlayCircleOutlined,
  SoundOutlined,
  FileZipOutlined,
  CodeOutlined,
  FileMarkdownOutlined,
  FileExcelOutlined,
  FileWordOutlined,
  FilePptOutlined,
  AppleOutlined
} from '@ant-design/icons';
import { useOSS } from '../contexts/OSSContext';
import FilePreview from './FilePreview';

const { Search } = Input;
const { Dragger } = Upload;
const { Text } = Typography;

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
  const handlePreview = async (file) => {
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

  // 判断文件类型
  const getFileType = (fileName) => {
    const ext = fileName.toLowerCase();
    
    // 图片文件
    if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'].some(e => ext.endsWith(e))) {
      return 'image';
    }
    
    // Markdown文件
    if (['.md', '.markdown'].some(e => ext.endsWith(e))) {
      return 'markdown';
    }
    
    // Excel文件
    if (['.xlsx', '.xls', '.xlsm', '.xlsb'].some(e => ext.endsWith(e))) {
      return 'excel';
    }
    
    // Word文件
    if (['.docx', '.doc', '.docm', '.dotx', '.dotm'].some(e => ext.endsWith(e))) {
      return 'word';
    }
    
    // PowerPoint文件
    if (['.pptx', '.ppt', '.pptm', '.potx', '.potm', '.ppsx', '.ppsm'].some(e => ext.endsWith(e))) {
      return 'powerpoint';
    }
    
    // Apple Pages文件
    if (ext.endsWith('.pages')) {
      return 'pages';
    }
    
    // Apple Numbers文件
    if (ext.endsWith('.numbers')) {
      return 'numbers';
    }
    
    // Apple Keynote文件
    if (ext.endsWith('.keynote')) {
      return 'keynote';
    }
    
    // 文本文件
    if (['.txt', '.json', '.xml', '.csv', '.log'].some(e => ext.endsWith(e))) {
      return 'text';
    }
    
    // 代码文件
    if (['.js', '.jsx', '.ts', '.tsx', '.html', '.css', '.scss', '.less', '.vue', '.py', '.java', '.cpp', '.c', '.php', '.go', '.rs', '.rb', '.swift', '.kt', '.dart', '.sql', '.yaml', '.yml'].some(e => ext.endsWith(e))) {
      return 'code';
    }
    
    // PDF文件
    if (ext.endsWith('.pdf')) {
      return 'pdf';
    }
    
    // 视频文件
    if (['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'].some(e => ext.endsWith(e))) {
      return 'video';
    }
    
    // 音频文件
    if (['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a'].some(e => ext.endsWith(e))) {
      return 'audio';
    }
    
    // 压缩文件
    if (['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2'].some(e => ext.endsWith(e))) {
      return 'archive';
    }
    
    return 'other';
  };
  
  // 获取文件图标
  const getFileIcon = (fileName) => {
    const fileType = getFileType(fileName);
    const iconStyle = { fontSize: '24px' };
    
    switch (fileType) {
      case 'image':
        return <PictureOutlined style={{ ...iconStyle, color: '#1890ff' }} />;
      case 'markdown':
        return <FileMarkdownOutlined style={{ ...iconStyle, color: '#0969da' }} />;
      case 'excel':
        return <FileExcelOutlined style={{ ...iconStyle, color: '#217346' }} />;
      case 'word':
        return <FileWordOutlined style={{ ...iconStyle, color: '#2b579a' }} />;
      case 'powerpoint':
        return <FilePptOutlined style={{ ...iconStyle, color: '#d24726' }} />;
      case 'pages':
      case 'numbers':
      case 'keynote':
        return <AppleOutlined style={{ ...iconStyle, color: '#007aff' }} />;
      case 'text':
        return <FileTextOutlined style={{ ...iconStyle, color: '#52c41a' }} />;
      case 'code':
        return <CodeOutlined style={{ ...iconStyle, color: '#722ed1' }} />;
      case 'pdf':
        return <FilePdfOutlined style={{ ...iconStyle, color: '#f5222d' }} />;
      case 'video':
        return <PlayCircleOutlined style={{ ...iconStyle, color: '#fa541c' }} />;
      case 'audio':
        return <SoundOutlined style={{ ...iconStyle, color: '#eb2f96' }} />;
      case 'archive':
        return <FileZipOutlined style={{ ...iconStyle, color: '#faad14' }} />;
      default:
        return <FileOutlined style={{ ...iconStyle, color: '#666' }} />;
    }
  };
  
  // 判断是否可以预览
  const canPreview = (fileName) => {
    const fileType = getFileType(fileName);
    return ['image', 'markdown', 'excel', 'word', 'powerpoint', 'pages', 'numbers', 'keynote', 'text', 'code', 'pdf', 'video', 'audio'].includes(fileType);
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
                      disabled={!canPreview(file.name)}
                      title={canPreview(file.name) ? '预览' : '此文件类型不支持预览'}
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
                    avatar={getFileIcon(file.name)}
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
        width={900}
        style={{ top: 20 }}
      >
        {previewFile && (
          <div style={{ maxHeight: '70vh', overflow: 'auto' }}>
            <FilePreview 
              file={previewFile} 
              fileType={getFileType(previewFile.name)} 
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default FileManager;