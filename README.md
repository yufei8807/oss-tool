# OSS 移动端工具

基于 Vite、React、Ant Design 和阿里云 OSS 开发的移动端文件管理工具。

## 功能特性

### 📁 文件管理
- 文件上传（支持拖拽上传）
- 文件下载
- 文件预览（图片文件）
- 文件删除
- 文件搜索
- 文件列表展示

### 🖼️ 相册功能
- 图片上传和管理
- 图片网格展示
- 图片预览和下载
- 图片搜索
- 响应式布局

### ⚙️ 设置管理
- OSS 连接配置
- 区域选择
- 访问密钥管理
- 连接状态检测
- 配置本地存储

## 技术栈

- **前端框架**: React 18
- **构建工具**: Vite
- **UI 组件库**: Ant Design
- **图标库**: @ant-design/icons
- **OSS SDK**: ali-oss
- **路由**: react-router-dom

## 快速开始

### 环境要求

- Node.js >= 16
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 预览生产版本

```bash
npm run preview
```

## 使用说明

### 1. 配置 OSS 连接

首次使用需要在「设置」页面配置阿里云 OSS 连接参数：

- **区域 (Region)**: 选择您的 OSS Bucket 所在区域
- **Access Key ID**: 阿里云访问密钥 ID
- **Access Key Secret**: 阿里云访问密钥 Secret
- **Bucket 名称**: OSS 存储空间名称
- **自定义域名**: 可选，如果绑定了自定义域名

### 2. 文件管理

在「文件管理」页面可以：
- 拖拽或点击上传文件
- 查看文件列表
- 预览图片文件
- 下载文件到本地
- 删除不需要的文件
- 搜索特定文件

### 3. 相册功能

在「相册」页面可以：
- 上传图片文件
- 网格方式浏览图片
- 点击图片进行预览
- 下载图片到本地
- 删除图片
- 搜索图片

## 移动端适配

本工具专为移动端设计，具有以下特性：

- 响应式布局，适配各种屏幕尺寸
- 触摸友好的交互设计
- 优化的移动端性能
- PWA 支持（可添加到主屏幕）

## 安全说明

- 所有 OSS 配置信息仅保存在本地浏览器中
- 不会上传任何配置信息到服务器
- 建议使用具有最小权限的子账号密钥
- 定期更换访问密钥以确保安全

## 浏览器支持

- Chrome (推荐)
- Safari
- Firefox
- Edge

## 开发说明

### 项目结构

```
src/
├── components/          # 组件目录
│   ├── FileManager.jsx  # 文件管理组件
│   ├── Gallery.jsx      # 相册组件
│   └── Settings.jsx     # 设置组件
├── contexts/            # Context 目录
│   └── OSSContext.jsx   # OSS 上下文
├── App.jsx             # 主应用组件
├── App.css             # 应用样式
├── index.css           # 全局样式
└── main.jsx            # 应用入口
```

### 主要依赖

```json
{
  "react": "^18.3.1",
  "antd": "^5.x",
  "ali-oss": "^6.x",
  "@ant-design/icons": "^5.x",
  "react-router-dom": "^6.x"
}
```

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
