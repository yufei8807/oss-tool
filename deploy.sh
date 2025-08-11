#!/bin/bash

# OSS工具部署脚本
# 适用于Alibaba Cloud Linux 3.2104 LTS
# 作者: yufei
# 版本: 1.0

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 配置变量
PROJECT_NAME="oss-tool"
GIT_REPO="https://github.com/yufei8807/oss-tool.git"
DEPLOY_DIR="/var/www"
PROJECT_DIR="${DEPLOY_DIR}/${PROJECT_NAME}"
NGINX_CONFIG_DIR="/etc/nginx/conf.d"
PM2_APP_NAME="oss-tool"
PORT=3000

# 检查是否为root用户
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "请使用root用户运行此脚本"
        exit 1
    fi
}

# 检查必要的命令是否存在
check_dependencies() {
    log_info "检查系统依赖..."
    
    local deps=("git" "node" "npm" "nginx" "pm2")
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            log_error "$dep 未安装，请先安装必要的环境"
            exit 1
        fi
    done
    
    log_success "系统依赖检查完成"
}

# 停止现有服务
stop_services() {
    log_info "停止现有服务..."
    
    # 停止PM2应用
    if pm2 list | grep -q "$PM2_APP_NAME"; then
        pm2 stop "$PM2_APP_NAME" || true
        pm2 delete "$PM2_APP_NAME" || true
        log_success "已停止现有PM2应用"
    fi
}

# 备份现有项目
backup_project() {
    if [ -d "$PROJECT_DIR" ]; then
        log_info "备份现有项目..."
        local backup_dir="${PROJECT_DIR}_backup_$(date +%Y%m%d_%H%M%S)"
        mv "$PROJECT_DIR" "$backup_dir"
        log_success "项目已备份到: $backup_dir"
    fi
}

# 克隆代码
clone_code() {
    log_info "克隆项目代码..."
    
    cd "$DEPLOY_DIR"
    git clone "$GIT_REPO" "$PROJECT_NAME"
    
    if [ ! -d "$PROJECT_DIR" ]; then
        log_error "代码克隆失败"
        exit 1
    fi
    
    log_success "代码克隆完成"
}

# 安装依赖
install_dependencies() {
    log_info "安装项目依赖..."
    
    cd "$PROJECT_DIR"
    
    # 设置npm镜像源（可选）
    npm config set registry https://registry.npmmirror.com
    
    # 安装依赖
    npm install
    
    if [ $? -ne 0 ]; then
        log_error "依赖安装失败"
        exit 1
    fi
    
    log_success "依赖安装完成"
}

# 构建项目
build_project() {
    log_info "构建项目..."
    
    cd "$PROJECT_DIR"
    npm run build
    
    if [ ! -d "dist" ]; then
        log_error "项目构建失败"
        exit 1
    fi
    
    log_success "项目构建完成"
}

# 安装serve（用于生产环境静态文件服务）
install_serve() {
    log_info "安装serve..."
    
    if ! command -v serve &> /dev/null; then
        npm install -g serve
        log_success "serve安装完成"
    else
        log_info "serve已安装，跳过"
    fi
}

# 备份并修改默认Nginx配置
backup_nginx_config() {
    log_info "备份默认Nginx配置..."
    
    # 备份原始nginx.conf
    if [ ! -f "/etc/nginx/nginx.conf.backup" ]; then
        cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup
        log_success "已备份原始nginx.conf"
    fi
    
    # 创建新的nginx.conf，移除默认server块
    cat > /etc/nginx/nginx.conf << 'EOF'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log;
pid /run/nginx.pid;

# Load dynamic modules. See /usr/share/doc/nginx/README.dynamic.
include /usr/share/nginx/modules/*.conf;

events {
    worker_connections 1024;
}

http {
    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

    access_log  /var/log/nginx/access.log  main;

    sendfile            on;
    tcp_nopush          on;
    tcp_nodelay         on;
    keepalive_timeout   65;
    types_hash_max_size 4096;

    include             /etc/nginx/mime.types;
    default_type        application/octet-stream;

    # Load modular configuration files from the /etc/nginx/conf.d directory.
    include /etc/nginx/conf.d/*.conf;
}
EOF
    
    log_success "已更新nginx.conf配置"
}

# 配置Nginx
configure_nginx() {
    log_info "配置Nginx..."
    
    local nginx_config="${NGINX_CONFIG_DIR}/${PROJECT_NAME}.conf"
    
    # 提示用户输入域名（可选）
    read -p "请输入您的域名（留空则使用IP访问）: " DOMAIN_NAME
    
    if [ -z "$DOMAIN_NAME" ]; then
        SERVER_NAME="_"
        log_info "将使用IP地址访问"
    else
        SERVER_NAME="$DOMAIN_NAME www.$DOMAIN_NAME"
        log_info "将配置域名: $DOMAIN_NAME"
    fi
    
    cat > "$nginx_config" << EOF
# HTTP服务器 - 重定向到HTTPS（如果配置了SSL）
server {
    listen 80;
    server_name $SERVER_NAME;
    
    # 如果有SSL证书，取消下面的注释来启用HTTPS重定向
    # return 301 https://\$server_name\$request_uri;
    
    # 临时HTTP配置
    # 安全头设置
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    
    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # 静态文件缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    
    # 代理到Node.js应用
    location / {
        proxy_pass http://127.0.0.1:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # 健康检查
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}

# HTTPS服务器配置模板（需要SSL证书时启用）
# server {
#     listen 443 ssl http2;
#     server_name $SERVER_NAME;
#     
#     # SSL证书配置
#     ssl_certificate /etc/ssl/certs/your-domain.pem;
#     ssl_certificate_key /etc/ssl/private/your-domain.key;
#     
#     # SSL安全配置
#     ssl_protocols TLSv1.2 TLSv1.3;
#     ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
#     ssl_prefer_server_ciphers on;
#     ssl_session_cache shared:SSL:10m;
#     ssl_session_timeout 10m;
#     
#     # 安全头设置
#     add_header X-Frame-Options DENY;
#     add_header X-Content-Type-Options nosniff;
#     add_header X-XSS-Protection "1; mode=block";
#     add_header Referrer-Policy "strict-origin-when-cross-origin";
#     add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
#     
#     # Gzip压缩
#     gzip on;
#     gzip_vary on;
#     gzip_min_length 1024;
#     gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
#     
#     # 静态文件缓存
#     location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
#         expires 1y;
#         add_header Cache-Control "public, immutable";
#         access_log off;
#     }
#     
#     # 代理到Node.js应用
#     location / {
#         proxy_pass http://127.0.0.1:${PORT};
#         proxy_http_version 1.1;
#         proxy_set_header Upgrade \$http_upgrade;
#         proxy_set_header Connection 'upgrade';
#         proxy_set_header Host \$host;
#         proxy_set_header X-Real-IP \$remote_addr;
#         proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
#         proxy_set_header X-Forwarded-Proto \$scheme;
#         proxy_cache_bypass \$http_upgrade;
#         
#         # 超时设置
#         proxy_connect_timeout 60s;
#         proxy_send_timeout 60s;
#         proxy_read_timeout 60s;
#     }
#     
#     # 健康检查
#     location /health {
#         access_log off;
#         return 200 "healthy\n";
#         add_header Content-Type text/plain;
#     }
# }
EOF
    
    # 测试Nginx配置
    nginx -t
    if [ $? -ne 0 ]; then
        log_error "Nginx配置测试失败"
        exit 1
    fi
    
    # 重新加载Nginx
    systemctl reload nginx
    
    log_success "Nginx配置完成"
}

# 配置防火墙
configure_firewall() {
    log_info "配置防火墙..."
    
    # 检查防火墙状态
    if systemctl is-active --quiet firewalld; then
        # 开放HTTP端口
        firewall-cmd --permanent --add-service=http
        firewall-cmd --reload
        log_success "已开放HTTP端口80"
    else
        log_warning "防火墙服务未运行，请手动配置端口访问"
    fi
}

# 启动应用
start_application() {
    log_info "启动应用..."
    
    cd "$PROJECT_DIR"
    
    # 使用PM2启动应用
    pm2 start serve --name "$PM2_APP_NAME" -- -s dist -l "$PORT"
    
    # 保存PM2配置
    pm2 save
    
    # 设置PM2开机自启
    pm2 startup systemd -u root --hp /root
    
    log_success "应用启动完成"
}

# 设置文件权限
set_permissions() {
    log_info "设置文件权限..."
    
    chown -R root:root "$PROJECT_DIR"
    chmod -R 755 "$PROJECT_DIR"
    
    log_success "文件权限设置完成"
}

# 验证部署
verify_deployment() {
    log_info "验证部署..."
    
    # 检查PM2应用状态
    if pm2 list | grep -q "$PM2_APP_NAME.*online"; then
        log_success "PM2应用运行正常"
    else
        log_error "PM2应用启动失败"
        pm2 logs "$PM2_APP_NAME"
        exit 1
    fi
    
    # 检查端口监听
    if netstat -tlnp | grep -q ":${PORT}.*LISTEN"; then
        log_success "应用端口监听正常"
    else
        log_error "应用端口未监听"
        exit 1
    fi
    
    # 检查Nginx状态
    if systemctl is-active --quiet nginx; then
        log_success "Nginx服务运行正常"
    else
        log_error "Nginx服务异常"
        exit 1
    fi
    
    log_success "部署验证完成"
}

# 显示部署信息
show_deployment_info() {
    log_info "部署信息:"
    echo "======================================"
    echo "项目名称: $PROJECT_NAME"
    echo "项目目录: $PROJECT_DIR"
    echo "应用端口: $PORT"
    echo "Nginx配置: ${NGINX_CONFIG_DIR}/${PROJECT_NAME}.conf"
    echo "PM2应用名: $PM2_APP_NAME"
    
    if [ ! -z "$DOMAIN_NAME" ]; then
        echo "配置域名: $DOMAIN_NAME"
    fi
    
    echo "======================================"
    
    # 检查是否配置了SSL
    if grep -q "listen 443 ssl" "${NGINX_CONFIG_DIR}/${PROJECT_NAME}.conf" 2>/dev/null; then
        if [ ! -z "$DOMAIN_NAME" ]; then
            echo "HTTPS访问地址: https://$DOMAIN_NAME"
            echo "HTTP访问地址: http://$DOMAIN_NAME (将重定向到HTTPS)"
        else
            echo "HTTPS访问地址: https://$(curl -s ifconfig.me || echo 'YOUR_SERVER_IP')"
        fi
    else
        if [ ! -z "$DOMAIN_NAME" ]; then
            echo "HTTP访问地址: http://$DOMAIN_NAME"
        else
            echo "HTTP访问地址: http://$(curl -s ifconfig.me || echo 'YOUR_SERVER_IP')"
        fi
    fi
    
    echo "======================================"
    
    log_info "常用命令:"
    echo "查看应用状态: pm2 status"
    echo "查看应用日志: pm2 logs $PM2_APP_NAME"
    echo "重启应用: pm2 restart $PM2_APP_NAME"
    echo "停止应用: pm2 stop $PM2_APP_NAME"
    echo "重新加载Nginx: systemctl reload nginx"
    echo "查看Nginx错误日志: tail -f /var/log/nginx/error.log"
    
    log_info "故障排除:"
    echo "1. 如果无法访问，请检查云服务器安全组是否开放80/443端口"
    echo "2. 如果域名无法访问，请确认DNS解析是否正确指向服务器IP"
    echo "3. 如果SSL证书有问题，请检查证书文件路径和权限"
    echo "4. 恢复默认Nginx配置: mv /etc/nginx/nginx.conf.backup /etc/nginx/nginx.conf"
}

# 配置SSL证书（可选）
configure_ssl() {
    log_info "SSL证书配置（可选）..."
    
    read -p "是否配置SSL证书？(y/N): " CONFIGURE_SSL
    
    if [[ "$CONFIGURE_SSL" =~ ^[Yy]$ ]]; then
        read -p "请输入SSL证书文件路径（.pem或.crt）: " SSL_CERT_PATH
        read -p "请输入SSL私钥文件路径（.key）: " SSL_KEY_PATH
        
        if [ -f "$SSL_CERT_PATH" ] && [ -f "$SSL_KEY_PATH" ]; then
            # 创建SSL目录
            mkdir -p /etc/ssl/certs /etc/ssl/private
            
            # 复制证书文件
            cp "$SSL_CERT_PATH" /etc/ssl/certs/
            cp "$SSL_KEY_PATH" /etc/ssl/private/
            
            # 设置权限
            chmod 644 /etc/ssl/certs/*
            chmod 600 /etc/ssl/private/*
            
            # 获取证书文件名
            CERT_NAME=$(basename "$SSL_CERT_PATH")
            KEY_NAME=$(basename "$SSL_KEY_PATH")
            
            # 更新Nginx配置以启用HTTPS
            local nginx_config="${NGINX_CONFIG_DIR}/${PROJECT_NAME}.conf"
            
            # 启用HTTPS重定向
            sed -i 's/# return 301 https/return 301 https/' "$nginx_config"
            
            # 启用HTTPS服务器块
            sed -i 's/# server {/server {/g' "$nginx_config"
            sed -i 's/# }/}/g' "$nginx_config"
            sed -i "s|# ssl_certificate /etc/ssl/certs/your-domain.pem;|ssl_certificate /etc/ssl/certs/$CERT_NAME;|" "$nginx_config"
            sed -i "s|# ssl_certificate_key /etc/ssl/private/your-domain.key;|ssl_certificate_key /etc/ssl/private/$KEY_NAME;|" "$nginx_config"
            sed -i 's/^#     /    /g' "$nginx_config"
            
            # 开放443端口
            firewall-cmd --permanent --add-service=https
            firewall-cmd --reload
            
            log_success "SSL证书配置完成"
        else
            log_warning "证书文件不存在，跳过SSL配置"
        fi
    else
        log_info "跳过SSL证书配置"
    fi
}

# 主函数
main() {
    log_info "开始部署 $PROJECT_NAME..."
    
    check_root
    check_dependencies
    stop_services
    backup_project
    clone_code
    install_dependencies
    build_project
    install_serve
    backup_nginx_config
    configure_nginx
    configure_firewall
    configure_ssl
    set_permissions
    start_application
    verify_deployment
    show_deployment_info
    
    log_success "部署完成！"
}

# 错误处理
trap 'log_error "部署过程中发生错误，请检查日志"; exit 1' ERR

# 执行主函数
main "$@"