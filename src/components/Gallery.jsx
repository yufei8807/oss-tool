import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Upload,
  Modal,
  message,
  Spin,
  Empty,
  Space,
  Input,
  Popconfirm,
  Image,
  Row,
  Col
} from 'antd';
import {
  UploadOutlined,
  DeleteOutlined,
  DownloadOutlined,
  ReloadOutlined,
  SearchOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { useOSS } from '../contexts/OSSContext';

const { Search } = Input;
const { Dragger } = Upload;

const Gallery = () => {
  const { isConnected, uploadFile, deleteFile, listFiles, getFileUrl, downloadFile } = useOSS();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');
  const [uploadModalVisible, setUploadModalVisible] = useState(false);

  // 图片文件扩展名
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];

  // 判断是否为图片文件
  const isImageFile = (fileName) => {
    return imageExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
  };

  // 获取图片列表
  const fetchImages = async () => {
    if (!isConnected) return;
    
    try {
      setLoading(true);
      const fileList = await listFiles();
      // 只保留图片文件
      const imageFiles = fileList.filter(file => isImageFile(file.name));
      
      // 为每个图片添加预览URL
      const imagesWithUrl = imageFiles.map(file => ({
        ...file,
        url: getFileUrl(file.name),
        thumbUrl: getFileUrl(file.name) // 缩略图URL，这里使用相同的URL
      }));
      
      setImages(imagesWithUrl);
    } catch (error) {
      message.error('获取图片列表失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, [isConnected]);

  // 上传图片
  const handleUpload = async (file) => {
    if (!isConnected) {
      message.error('请先配置OSS连接');
      return false;
    }

    // 检查是否为图片文件
    if (!isImageFile(file.name)) {
      message.error('只能上传图片文件');
      return false;
    }

    try {
      setUploading(true);
      const timestamp = Date.now();
      const fileName = `gallery/${timestamp}_${file.name}`;
      await uploadFile(file, fileName);
      message.success('图片上传成功');
      fetchImages();
      setUploadModalVisible(false);
    } catch (error) {
      message.error('图片上传失败: ' + error.message);
    } finally {
      setUploading(false);
    }
    return false;
  };

  // 删除图片
  const handleDelete = async (fileName) => {
    try {
      await deleteFile(fileName);
      message.success('图片删除成功');
      fetchImages();
    } catch (error) {
      message.error('图片删除失败: ' + error.message);
    }
  };

  // 下载图片
  const handleDownload = async (fileName) => {
    try {
      await downloadFile(fileName);
      message.success('开始下载图片');
    } catch (error) {
      message.error('图片下载失败: ' + error.message);
    }
  };

  // 预览图片
  const handlePreview = (image) => {
    setPreviewImage(image.url);
    setPreviewTitle(image.name);
    setPreviewVisible(true);
  };

  // 格式化文件大小
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 过滤图片
  const filteredImages = images.filter(image => 
    image.name.toLowerCase().includes(searchText.toLowerCase())
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
      {/* 操作栏 */}
      <Card style={{ marginBottom: '16px' }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Search
            placeholder="搜索图片"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 250 }}
            prefix={<SearchOutlined />}
          />
          <Space>
            <Button 
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setUploadModalVisible(true)}
            >
              上传图片
            </Button>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={fetchImages}
              loading={loading}
            >
              刷新
            </Button>
          </Space>
        </Space>
      </Card>

      {/* 图片网格 */}
      <Spin spinning={loading}>
        {filteredImages.length === 0 ? (
          <Empty description="暂无图片" />
        ) : (
          <Row gutter={[16, 16]}>
            {filteredImages.map((image, index) => (
              <Col xs={12} sm={6} md={4} lg={3} key={index}>
                <Card
                  hoverable
                  cover={
                    <div style={{ height: '150px', overflow: 'hidden' }}>
                      <Image
                        src={image.thumbUrl}
                        alt={image.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                        preview={false}
                        onClick={() => handlePreview(image)}
                      />
                    </div>
                  }
                  actions={[
                    <Button
                      type="text"
                      icon={<DownloadOutlined />}
                      onClick={() => handleDownload(image.name)}
                      size="small"
                    />,
                    <Popconfirm
                      title="确定要删除这张图片吗？"
                      onConfirm={() => handleDelete(image.name)}
                      okText="确定"
                      cancelText="取消"
                    >
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        size="small"
                      />
                    </Popconfirm>
                  ]}
                  size="small"
                >
                  <Card.Meta
                    title={
                      <div style={{ 
                        fontSize: '12px', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {image.name.split('/').pop()}
                      </div>
                    }
                    description={
                      <div style={{ fontSize: '11px', color: '#999' }}>
                        {formatFileSize(image.size)}
                      </div>
                    }
                  />
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Spin>

      {/* 上传模态框 */}
      <Modal
        title="上传图片"
        open={uploadModalVisible}
        onCancel={() => setUploadModalVisible(false)}
        footer={null}
        width={600}
      >
        <Dragger
          beforeUpload={handleUpload}
          showUploadList={false}
          multiple
          disabled={uploading}
          accept="image/*"
        >
          <p className="ant-upload-drag-icon">
            <UploadOutlined />
          </p>
          <p className="ant-upload-text">
            {uploading ? '上传中...' : '点击或拖拽图片到此区域上传'}
          </p>
          <p className="ant-upload-hint">
            支持 JPG、PNG、GIF、BMP、WebP 格式的图片文件
          </p>
        </Dragger>
      </Modal>

      {/* 图片预览模态框 */}
      <Modal
        open={previewVisible}
        title={previewTitle}
        footer={[
          <Button key="download" onClick={() => handleDownload(previewTitle)}>
            下载
          </Button>,
          <Button key="close" onClick={() => setPreviewVisible(false)}>
            关闭
          </Button>
        ]}
        onCancel={() => setPreviewVisible(false)}
        width={800}
        centered
      >
        <div style={{ textAlign: 'center' }}>
          <Image
            src={previewImage}
            alt={previewTitle}
            style={{ maxWidth: '100%', maxHeight: '500px' }}
          />
        </div>
      </Modal>
    </div>
  );
};

export default Gallery;