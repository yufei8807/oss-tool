import React, { useState } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Typography,
  Space,
  Alert,
  Divider
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  LoginOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;

const Login = () => {
  const { login } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleLogin = async (values) => {
    setLoading(true);
    try {
      await login(values.username, values.password);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-wrapper">
        <Card className="login-card">
          <div className="login-header">
            <Title level={2} style={{ textAlign: 'center', marginBottom: '8px' }}>
              OSS 移动端工具
            </Title>
            <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: '32px' }}>
              请登录以继续使用
            </Text>
          </div>

          <Form
            form={form}
            name="login"
            onFinish={handleLogin}
            layout="vertical"
            size="large"
          >
            <Form.Item
              name="username"
              rules={[
                { required: true, message: '请输入用户名' },
                { min: 2, message: '用户名至少2个字符' }
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="用户名"
                autoComplete="username"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码至少6个字符' }
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="密码"
                autoComplete="current-password"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                icon={<LoginOutlined />}
              >
                登录
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  );
};

export default Login;