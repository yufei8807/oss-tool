# OSS 移动端工具

基于 Vite、React、Ant Design 和阿里云 OSS 开发的移动端文件管理工具。

## 功能特性

<img width="260" height="562" alt="image" src="https://github.com/user-attachments/assets/0d55a132-8907-41e8-97a1-0f1a4983fd6e" />
<img width="260" height="562" alt="image" src="https://github.com/user-attachments/assets/93666f9b-020a-45f4-92c5-72f3ad5576a3" />
<img width="260" height="562" alt="image" src="https://github.com/user-attachments/assets/d9328f63-eadf-4d95-b2d0-03e6e9caf52b" />

### 📁 文件管理
- 文件上传（支持拖拽上传）
- 文件下载
- 多格式文件预览
  - 图片文件（JPG、PNG、GIF、WebP、SVG 等）
  - Markdown 文件（.md、.markdown）
  - 文本和代码文件（.txt、.js、.css、.html、.json 等）
  - PDF 文档
  - 视频文件（MP4、WebM、OGG）
  - 音频文件（MP3、WAV、OGG）
  - Office 文档（Excel、Word、PowerPoint）
  - Apple 文档（Pages、Numbers、Keynote）
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
- **Markdown 渲染**: marked
- **文件预览**: 内置多格式预览组件

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
- 多格式文件预览
  - **图片预览**: 支持常见图片格式的直接预览
  - **Markdown 预览**: 渲染 Markdown 文件为 HTML 格式
  - **文本/代码预览**: 语法高亮显示各种代码文件
  - **PDF 预览**: 内嵌 PDF 查看器
  - **媒体预览**: 支持视频和音频文件播放
  - **Office 文档**: 通过 Microsoft Office 在线预览服务查看 Excel、Word、PowerPoint 文件
  - **Apple 文档**: 提示用户在 Mac 设备上打开 Pages、Numbers、Keynote 文件
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
│   ├── FilePreview.jsx  # 文件预览组件
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
  "react-router-dom": "^6.x",
  "marked": "^12.x"
}
```

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
