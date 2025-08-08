import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  message,
  Space,
  Divider,
  Alert,
  Switch,
  Select,
  Typography,
  Tag,
  List,
  Modal,
  Popconfirm,
  Radio
} from 'antd';
import {
  SaveOutlined,
  ApiOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  LogoutOutlined,
  UserOutlined
} from '@ant-design/icons';
import { useOSS } from '../contexts/OSSContext';
import { useAuth } from '../contexts/AuthContext';

const { Option } = Select;
const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

const Settings = () => {
  const { 
    ossConfigs, 
    currentConfigId, 
    currentConfig, 
    isConnected, 
    loading, 
    addConfig,
    updateConfig,
    deleteConfig,
    switchConfig
  } = useOSS();
  const { currentUser, logout } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [modalForm] = Form.useForm();

  // 处理退出登录
  const handleLogout = () => {
    logout();
  };

  // 阿里云OSS区域选项
  const regions = [
    { value: 'oss-cn-hangzhou', label: '华东1（杭州）' },
    { value: 'oss-cn-shanghai', label: '华东2（上海）' },
    { value: 'oss-cn-qingdao', label: '华北1（青岛）' },
    { value: 'oss-cn-beijing', label: '华北2（北京）' },
    { value: 'oss-cn-zhangjiakou', label: '华北3（张家口）' },
    { value: 'oss-cn-huhehaote', label: '华北5（呼和浩特）' },
    { value: 'oss-cn-wulanchabu', label: '华北6（乌兰察布）' },
    { value: 'oss-cn-shenzhen', label: '华南1（深圳）' },
    { value: 'oss-cn-heyuan', label: '华南2（河源）' },
    { value: 'oss-cn-guangzhou', label: '华南3（广州）' },
    { value: 'oss-cn-chengdu', label: '西南1（成都）' },
    { value: 'oss-cn-hongkong', label: '中国香港' },
    { value: 'oss-us-west-1', label: '美国西部1（硅谷）' },
    { value: 'oss-us-east-1', label: '美国东部1（弗吉尼亚）' },
    { value: 'oss-ap-southeast-1', label: '亚太东南1（新加坡）' },
    { value: 'oss-ap-southeast-2', label: '亚太东南2（悉尼）' },
    { value: 'oss-ap-southeast-3', label: '亚太东南3（吉隆坡）' },
    { value: 'oss-ap-southeast-5', label: '亚太东南5（雅加达）' },
    { value: 'oss-ap-northeast-1', label: '亚太东北1（日本）' },
    { value: 'oss-ap-south-1', label: '亚太南部1（孟买）' },
    { value: 'oss-eu-central-1', label: '欧洲中部1（法兰克福）' },
    { value: 'oss-eu-west-1', label: '英国（伦敦）' },
    { value: 'oss-me-east-1', label: '中东东部1（迪拜）' }
  ];



  // 打开添加配置模态框
  const handleAddConfig = () => {
    setEditingConfig(null);
    modalForm.resetFields();
    setModalVisible(true);
  };

  // 打开编辑配置模态框
  const handleEditConfig = (config) => {
    setEditingConfig(config);
    modalForm.setFieldsValue(config);
    setModalVisible(true);
  };

  // 复制配置
  const handleCopyConfig = (config) => {
    const newConfig = {
      ...config,
      name: `${config.name} - 副本`,
      id: undefined
    };
    setEditingConfig(null);
    modalForm.setFieldsValue(newConfig);
    setModalVisible(true);
  };

  // 保存配置（模态框）
  const handleModalSave = async (values) => {
    try {
      if (editingConfig) {
        updateConfig(editingConfig.id, values);
        message.success('配置更新成功');
      } else {
        addConfig(values);
        message.success('配置添加成功');
      }
      setModalVisible(false);
    } catch (error) {
      message.error('配置保存失败: ' + error.message);
    }
  };

  // 删除配置
  const handleDeleteConfig = (configId) => {
    try {
      deleteConfig(configId);
      message.success('配置删除成功');
    } catch (error) {
      message.error('配置删除失败: ' + error.message);
    }
  };

  // 切换配置
  const handleSwitchConfig = (configId) => {
    try {
      switchConfig(configId);
      message.success('配置切换成功');
    } catch (error) {
      message.error('配置切换失败: ' + error.message);
    }
  };



  return (
    <div style={{ padding: '0' }}>
      {/* 用户信息 */}
      <Card title="用户信息" style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <UserOutlined style={{ fontSize: '16px', color: '#1890ff' }} />
            <div>
              <Text strong>{currentUser?.name || '未知用户'}</Text>
              <br />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {currentUser?.username} ({currentUser?.role === 'admin' ? '管理员' : '普通用户'})
              </Text>
            </div>
          </Space>
          <Popconfirm
            title="确定要退出登录吗？"
            onConfirm={handleLogout}
            okText="确定"
            cancelText="取消"
          >
            <Button 
              type="text" 
              danger 
              icon={<LogoutOutlined />}
            >
              退出登录
            </Button>
          </Popconfirm>
        </div>
      </Card>

      {/* 配置列表 */}
      <Card 
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <span>OSS 配置管理</span>
            <Space>
              <Button 
                type="primary" 
                size="small"
                icon={<PlusOutlined />} 
                onClick={handleAddConfig}
              >
                添加配置
              </Button>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {ossConfigs.length > 0 ? `${ossConfigs.length} 个配置` : '暂无配置'}
              </Text>
            </Space>
          </div>
        } 
        className="file-list-card"
      >
        {ossConfigs.length > 0 ? (
          <List
            dataSource={ossConfigs}
            renderItem={(config) => (
              <List.Item
                actions={[
                  <Button
                    key="edit"
                    type="text"
                    icon={<EditOutlined />}
                    onClick={() => handleEditConfig(config)}
                  />,
                  <Button
                    key="copy"
                    type="text"
                    icon={<CopyOutlined />}
                    onClick={() => handleCopyConfig(config)}
                  />,
                  <Popconfirm
                    key="delete"
                    title="确定要删除这个配置吗？"
                    onConfirm={() => handleDeleteConfig(config.id)}
                    okText="确定"
                    cancelText="取消"
                    disabled={ossConfigs.length === 1}
                  >
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      disabled={ossConfigs.length === 1}
                    />
                  </Popconfirm>
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <Radio
                      checked={config.id === currentConfigId}
                      onChange={() => handleSwitchConfig(config.id)}
                    />
                  }
                  title={
                    <Space>
                      <Text strong>{config.name || '未命名配置'}</Text>
                      {config.id === currentConfigId && (
                        <Tag color={isConnected ? 'green' : 'orange'}>
                          {isConnected ? '已连接' : '未连接'}
                        </Tag>
                      )}
                    </Space>
                  }
                  description={
                    <Space>
                      <Tag>{config.region}</Tag>
                      <span>{config.bucket}</span>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <Empty description="暂无配置，请添加一个新配置" />
        )}
      </Card>

      {/* 当前配置详情 */}
      {currentConfigId && currentConfig && (
        <Card title="当前配置详情" style={{ marginTop: '12px' }}>
          <div style={{ marginBottom: '16px' }}>
            <Alert
              message={
                <Space>
                  {isConnected ? (
                    <>
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                      <Text>OSS 连接正常</Text>
                    </>
                  ) : (
                    <>
                      <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                      <Text>OSS 未连接</Text>
                    </>
                  )}
                </Space>
              }
              type={isConnected ? 'success' : 'warning'}
              showIcon={false}
            />
          </div>

          <List
            dataSource={[
              { label: '配置名称', value: currentConfig.name || '未命名配置' },
              { label: '区域 (Region)', value: currentConfig.region },
              { label: 'Access Key ID', value: currentConfig.accessKeyId ? '••••••••' + currentConfig.accessKeyId.slice(-4) : '' },
              { label: 'Access Key Secret', value: currentConfig.accessKeySecret ? '••••••••••••••••' : '' },
              { label: 'Bucket 名称', value: currentConfig.bucket },
              ...(currentConfig.endpoint ? [{ label: '自定义域名', value: currentConfig.endpoint }] : [])
            ]}
            renderItem={(item) => (
              <List.Item style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <Text strong style={{ minWidth: '120px' }}>{item.label}:</Text>
                  <Text type="secondary" style={{ flex: 1, textAlign: 'right' }}>{item.value}</Text>
                </div>
              </List.Item>
            )}
          />

          <Divider />

          {/* 帮助信息 */}
          <div>
            <Title level={5}>
              <InfoCircleOutlined /> 配置说明
            </Title>
            <Paragraph style={{ fontSize: '12px' }}>
              <ul>
                <li><Text strong>区域 (Region):</Text> 您的OSS Bucket所在的区域</li>
                <li><Text strong>Access Key ID/Secret:</Text> 阿里云访问密钥，用于身份验证</li>
                <li><Text strong>Bucket:</Text> OSS存储空间名称</li>
                <li><Text strong>自定义域名:</Text> 可选，如果您绑定了自定义域名</li>
              </ul>
            </Paragraph>
            
            <Alert
              message="安全提示"
              description="Access Key 信息仅保存在本地浏览器中，不会上传到任何服务器。建议使用具有最小权限的子账号密钥。"
              type="info"
              showIcon
              style={{ fontSize: '12px' }}
            />
          </div>
        </Card>
      )}

      {/* 配置编辑弹窗 */}
      <Modal
        title={editingConfig ? '编辑配置' : '添加配置'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingConfig(null);
          modalForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={modalForm}
          layout="vertical"
          onFinish={handleModalSave}
        >
          <Form.Item
            label="配置名称"
            name="name"
            rules={[{ required: true, message: '请输入配置名称' }]}
          >
            <Input placeholder="如: 生产环境" />
          </Form.Item>

          <Form.Item
            label="区域 (Region)"
            name="region"
            rules={[{ required: true, message: '请选择OSS区域' }]}
          >
            <Select
              placeholder="选择OSS区域"
              showSearch
              filterOption={(input, option) =>
                option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {regions.map(region => (
                <Option key={region.value} value={region.value}>
                  {region.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Access Key ID"
            name="accessKeyId"
            rules={[{ required: true, message: '请输入Access Key ID' }]}
          >
            <Input.Password
              placeholder="请输入Access Key ID"
              visibilityToggle
            />
          </Form.Item>

          <Form.Item
            label="Access Key Secret"
            name="accessKeySecret"
            rules={[{ required: true, message: '请输入Access Key Secret' }]}
          >
            <Input.Password
              placeholder="请输入Access Key Secret"
              visibilityToggle
            />
          </Form.Item>

          <Form.Item
            label="Bucket 名称"
            name="bucket"
            rules={[{ required: true, message: '请输入Bucket名称' }]}
          >
            <Input placeholder="请输入Bucket名称" />
          </Form.Item>

          <Form.Item
            label="自定义域名 (Endpoint)"
            name="endpoint"
            tooltip="可选，如果使用自定义域名请填写"
          >
            <Input placeholder="例如：https://your-domain.com" />
          </Form.Item>

          <div style={{ marginTop: '24px', textAlign: 'right' }}>
            <Space>
              <Button 
                onClick={() => {
                  setModalVisible(false);
                  setEditingConfig(null);
                  modalForm.resetFields();
                }}
              >
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                {editingConfig ? '更新' : '添加'}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default Settings;