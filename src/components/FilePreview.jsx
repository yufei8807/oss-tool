import React, { useState, useEffect } from 'react';
import { Image, Typography } from 'antd';
import { marked } from 'marked';

const { Text } = Typography;

const FilePreview = ({ file, fileType }) => {
  const [markdownContent, setMarkdownContent] = useState('');
  const [loading, setLoading] = useState(false);

  // 获取并渲染markdown内容
  useEffect(() => {
    if (fileType === 'markdown' && file?.url) {
      setLoading(true);
      fetch(file.url)
        .then(response => response.text())
        .then(text => {
          const htmlContent = marked(text);
          setMarkdownContent(htmlContent);
        })
        .catch(error => {
          console.error('获取markdown内容失败:', error);
          setMarkdownContent('<p>无法加载markdown内容</p>');
        })
        .finally(() => setLoading(false));
    }
  }, [file?.url, fileType]);

  // 渲染不同类型的文件预览
  const renderPreview = () => {
    if (!file) return null;

    switch (fileType) {
      case 'image':
        return (
          <div style={{ textAlign: 'center' }}>
            <Image
              src={file.url}
              alt={file.name}
              style={{ maxWidth: '100%', maxHeight: '500px' }}
            />
          </div>
        );

      case 'markdown':
        return (
          <div>
            <div
              style={{
                width: '100%',
                maxHeight: '500px',
                overflow: 'auto',
                border: '1px solid #d9d9d9',
                borderRadius: '6px',
                backgroundColor: '#fff',
                padding: '16px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                lineHeight: '1.6'
              }}
              dangerouslySetInnerHTML={{ 
                __html: `
                  <style>
                    .markdown-preview h1, .markdown-preview h2, .markdown-preview h3, 
                    .markdown-preview h4, .markdown-preview h5, .markdown-preview h6 {
                      margin-top: 24px;
                      margin-bottom: 16px;
                      font-weight: 600;
                      line-height: 1.25;
                    }
                    .markdown-preview h1 {
                      font-size: 2em;
                      border-bottom: 1px solid #eaecef;
                      padding-bottom: 0.3em;
                    }
                    .markdown-preview h2 {
                      font-size: 1.5em;
                      border-bottom: 1px solid #eaecef;
                      padding-bottom: 0.3em;
                    }
                    .markdown-preview p {
                      margin-bottom: 16px;
                    }
                    .markdown-preview code {
                      background-color: rgba(27,31,35,0.05);
                      border-radius: 3px;
                      font-size: 85%;
                      margin: 0;
                      padding: 0.2em 0.4em;
                    }
                    .markdown-preview pre {
                      background-color: #f6f8fa;
                      border-radius: 6px;
                      font-size: 85%;
                      line-height: 1.45;
                      overflow: auto;
                      padding: 16px;
                    }
                    .markdown-preview blockquote {
                      border-left: 0.25em solid #dfe2e5;
                      color: #6a737d;
                      padding: 0 1em;
                      margin: 0 0 16px 0;
                    }
                    .markdown-preview ul, .markdown-preview ol {
                      padding-left: 2em;
                      margin-bottom: 16px;
                    }
                    .markdown-preview li {
                      margin-bottom: 0.25em;
                    }
                  </style>
                  <div class="markdown-preview">${markdownContent}</div>
                `
              }}
            />
            <Text type="secondary" style={{ fontSize: '12px', marginTop: '8px', display: 'block' }}>
              提示：Markdown文件已渲染为HTML格式显示
            </Text>
          </div>
        );

      case 'text':
      case 'code':
        return (
          <div>
            <iframe
              src={file.url}
              style={{
                width: '100%',
                height: '500px',
                border: '1px solid #d9d9d9',
                borderRadius: '6px'
              }}
              title={file.name}
            />
            <Text type="secondary" style={{ fontSize: '12px', marginTop: '8px', display: 'block' }}>
              提示：如果内容显示异常，请下载文件查看
            </Text>
          </div>
        );

      case 'pdf':
        return (
          <div>
            <iframe
              src={`${file.url}#toolbar=1&navpanes=1&scrollbar=1`}
              style={{
                width: '100%',
                height: '600px',
                border: '1px solid #d9d9d9',
                borderRadius: '6px'
              }}
              title={file.name}
            />
          </div>
        );

      case 'video':
        return (
          <div style={{ textAlign: 'center' }}>
            <video
              controls
              style={{
                maxWidth: '100%',
                maxHeight: '500px'
              }}
            >
              <source src={file.url} />
              您的浏览器不支持视频播放
            </video>
          </div>
        );

      case 'audio':
        return (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <audio controls style={{ width: '100%', maxWidth: '500px' }}>
              <source src={file.url} />
              您的浏览器不支持音频播放
            </audio>
          </div>
        );

      case 'excel':
        return (
          <div>
            <iframe
              src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(file.url)}`}
              style={{
                width: '100%',
                height: '600px',
                border: '1px solid #d9d9d9',
                borderRadius: '6px'
              }}
              title={file.name}
            />
            <Text type="secondary" style={{ fontSize: '12px', marginTop: '8px', display: 'block' }}>
              提示：使用Microsoft Office在线预览服务，如果无法显示请下载文件查看
            </Text>
          </div>
        );

      case 'word':
        return (
          <div>
            <iframe
              src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(file.url)}`}
              style={{
                width: '100%',
                height: '600px',
                border: '1px solid #d9d9d9',
                borderRadius: '6px'
              }}
              title={file.name}
            />
            <Text type="secondary" style={{ fontSize: '12px', marginTop: '8px', display: 'block' }}>
              提示：使用Microsoft Office在线预览服务，如果无法显示请下载文件查看
            </Text>
          </div>
        );

      case 'powerpoint':
        return (
          <div>
            <iframe
              src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(file.url)}`}
              style={{
                width: '100%',
                height: '600px',
                border: '1px solid #d9d9d9',
                borderRadius: '6px'
              }}
              title={file.name}
            />
            <Text type="secondary" style={{ fontSize: '12px', marginTop: '8px', display: 'block' }}>
              提示：使用Microsoft Office在线预览服务，如果无法显示请下载文件查看
            </Text>
          </div>
        );

      case 'pages':
      case 'numbers':
      case 'keynote':
        return (
          <div>
            <div style={{
              textAlign: 'center',
              padding: '50px',
              border: '1px solid #d9d9d9',
              borderRadius: '6px',
              backgroundColor: '#f9f9f9'
            }}>
              <Text type="secondary">
                {fileType === 'pages' && '📄 Pages文档'}
                {fileType === 'numbers' && '📊 Numbers表格'}
                {fileType === 'keynote' && '📽️ Keynote演示文稿'}
              </Text>
              <br />
              <Text type="secondary" style={{ fontSize: '14px' }}>
                Apple iWork文件需要在Mac设备上使用相应应用打开
              </Text>
            </div>
            <Text type="secondary" style={{ fontSize: '12px', marginTop: '8px', display: 'block' }}>
              提示：请下载文件并在支持的设备上查看
            </Text>
          </div>
        );

      default:
        return (
          <div style={{
            textAlign: 'center',
            padding: '50px',
            border: '1px solid #d9d9d9',
            borderRadius: '6px',
            backgroundColor: '#f9f9f9'
          }}>
            <Text type="secondary">
              此文件类型暂不支持预览
            </Text>
            <br />
            <Text type="secondary" style={{ fontSize: '14px' }}>
              请下载文件查看内容
            </Text>
          </div>
        );
    }
  };

  return (
    <div>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Text>加载中...</Text>
        </div>
      ) : (
        renderPreview()
      )}
    </div>
  );
};

export default FilePreview;