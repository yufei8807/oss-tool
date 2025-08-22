#!/bin/bash

# OSS工具云效流水线部署脚本
# 适用于云效平台流水线部署
# 作者: yufei
# 版本: 1.0
# 
# 功能:
# - 从流水线包部署已编译的应用
# - PM2应用管理
# - Nginx服务重启
# - 无需编译构建，直接部署
# 
# 用法:
# bash deploy-pipeline.sh           # 标准部署（在解压后的项目目录中执行）
# bash deploy-pipeline.sh --help    # 显示帮助

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
PACKAGE_PATH="/home/admin/app/package.tgz"
DEPLOY_DIR="/var/www"
PROJECT_DIR="${DEPLOY_DIR}/${PROJECT_NAME}"
PM2_APP_NAME="oss-tool"
PORT=3000

# 获取脚本当前所在目录（解压后的项目目录）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# 如果脚本在解压的项目中执行，则使用脚本所在目录作为源目录
SOURCE_DIR="$SCRIPT_DIR"

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
    
    local deps=("tar" "nginx" "pm2")
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            log_error "$dep 未安装，请先安装必要的环境"
            exit 1
        fi
    done
    
    log_success "系统依赖检查完成"
}

# 检查源目录（脚本解压后的目录）
check_source() {
    log_info "检查源目录..."
    
    # 检查当前目录是否是有效的项目目录
    if [ ! -d "$SOURCE_DIR" ]; then
        log_error "源目录不存在: $SOURCE_DIR"
        exit 1
    fi
    
    # 检查是否存在dist目录
    if [ ! -d "$SOURCE_DIR/dist" ]; then
        log_error "未找到dist目录: $SOURCE_DIR/dist"
        log_error "请确认流水线产物包含编译后的文件"
        exit 1
    fi
    
    # 检查dist目录是否为空
    if [ -z "$(ls -A "$SOURCE_DIR/dist")" ]; then
        log_error "dist目录为空，请检查流水线构建是否正确"
        exit 1
    fi
    
    log_success "源目录检查完成 (路径: $SOURCE_DIR)"
}

# 停止现有服务
stop_services() {
    log_info "停止现有服务..."
    
    # 停止PM2应用
    if pm2 list | grep -q "$PM2_APP_NAME"; then
        pm2 stop "$PM2_APP_NAME" || true
        pm2 delete "$PM2_APP_NAME" || true
        log_success "已停止现有PM2应用"
    else
        log_info "未发现运行中的PM2应用"
    fi
}

# 备份现有项目
backup_project() {
    if [ -d "$PROJECT_DIR" ]; then
        log_info "备份现有项目..."
        local backup_dir="${PROJECT_DIR}_backup_$(date +%Y%m%d_%H%M%S)"
        mv "$PROJECT_DIR" "$backup_dir"
        log_success "项目已备份到: $backup_dir"
        
        # 保留最近3个备份，删除旧备份
        log_info "清理旧备份..."
        ls -dt ${PROJECT_DIR}_backup_* 2>/dev/null | tail -n +4 | xargs rm -rf || true
    fi
}

# 复制项目文件到部署目录
deploy_files() {
    log_info "部署项目文件..."
    
    # 创建部署目录
    mkdir -p "$DEPLOY_DIR"
    
    # 如果目标目录不存在，直接复制整个源目录
    if [ ! -d "$PROJECT_DIR" ]; then
        cp -r "$SOURCE_DIR" "$PROJECT_DIR"
        log_success "项目文件复制完成"
    else
        # 如果目标目录存在，只复制内容
        cp -r "$SOURCE_DIR"/* "$PROJECT_DIR"/
        log_success "项目文件更新完成"
    fi
    
    # 移除部署脚本，避免重复执行
    if [ -f "$PROJECT_DIR/deploy-pipeline.sh" ]; then
        rm "$PROJECT_DIR/deploy-pipeline.sh"
        log_info "已移除部署目录中的脚本文件"
    fi
}

# 验证部署内容
verify_deployment_content() {
    log_info "验证部署内容..."
    
    cd "$PROJECT_DIR"
    
    # 检查是否存在dist目录
    if [ ! -d "dist" ]; then
        log_error "未找到dist目录，部署可能失败"
        exit 1
    fi
    
    # 检查dist目录是否为空
    if [ -z "$(ls -A dist)" ]; then
        log_error "dist目录为空，部署可能失败"
        exit 1
    fi
    
    log_success "部署内容验证完成"
}

# 安装serve（用于生产环境静态文件服务）
install_serve() {
    log_info "检查serve..."
    
    if ! command -v serve &> /dev/null; then
        log_info "安装serve..."
        # 使用npx运行serve，避免全局安装
        log_info "将使用npx serve运行应用"
    else
        log_info "serve已安装"
    fi
}

# 设置文件权限
set_permissions() {
    log_info "设置文件权限..."
    
    chown -R root:root "$PROJECT_DIR"
    chmod -R 755 "$PROJECT_DIR"
    
    # 设置dist目录权限
    if [ -d "$PROJECT_DIR/dist" ]; then
        chmod -R 644 "$PROJECT_DIR/dist"
        find "$PROJECT_DIR/dist" -type d -exec chmod 755 {} \;
    fi
    
    log_success "文件权限设置完成"
}

# 启动应用
start_application() {
    log_info "启动应用..."
    
    cd "$PROJECT_DIR"
    
    # 检查dist目录是否存在
    if [ -d "dist" ]; then
        # 优先使用已安装的serve，否则使用npx
        if command -v serve &> /dev/null; then
            pm2 start serve --name "$PM2_APP_NAME" -- -s dist -l "$PORT"
        else
            # 使用npx运行serve
            pm2 start npx --name "$PM2_APP_NAME" -- serve -s dist -l "$PORT"
        fi
    else
        log_error "未找到dist目录，无法启动应用"
        exit 1
    fi
    
    # 等待应用启动
    sleep 3
    
    # 检查应用是否启动成功
    if pm2 list | grep -q "$PM2_APP_NAME.*online"; then
        log_success "应用启动成功"
    else
        log_error "应用启动失败"
        pm2 logs "$PM2_APP_NAME" --lines 20
        exit 1
    fi
    
    # 保存PM2配置
    pm2 save
    
    log_success "应用启动完成"
}

# 重启Nginx服务
restart_nginx() {
    log_info "重启Nginx服务..."
    
    # 检查Nginx配置语法
    if ! nginx -t; then
        log_error "Nginx配置语法错误，取消重启"
        exit 1
    fi
    
    # 重启Nginx
    systemctl restart nginx
    
    # 等待Nginx启动
    sleep 2
    
    # 检查Nginx状态
    if systemctl is-active --quiet nginx; then
        log_success "Nginx重启成功"
    else
        log_error "Nginx重启失败"
        systemctl status nginx
        exit 1
    fi
}

# 验证部署
verify_deployment() {
    log_info "验证部署..."
    
    # 检查PM2应用状态
    if pm2 list | grep -q "$PM2_APP_NAME.*online"; then
        log_success "PM2应用运行正常"
    else
        log_error "PM2应用启动失败"
        pm2 logs "$PM2_APP_NAME" --lines 20
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
    
    # 测试HTTP连接
    local test_url="http://localhost"
    if curl -f -s -o /dev/null "$test_url"; then
        log_success "HTTP连接测试通过"
    else
        log_warning "HTTP连接测试失败，请检查应用配置"
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
    echo "PM2应用名: $PM2_APP_NAME"
    echo "部署时间: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "======================================"
    
    # 获取服务器IP（如果可能）
    local server_ip=$(curl -s --max-time 5 ifconfig.me 2>/dev/null || echo "无法获取")
    if [ "$server_ip" != "无法获取" ]; then
        echo "访问地址: http://$server_ip"
    else
        echo "访问地址: http://YOUR_SERVER_IP"
    fi
    
    echo "======================================"
    
    log_info "常用命令:"
    echo "查看应用状态: pm2 status"
    echo "查看应用日志: pm2 logs $PM2_APP_NAME"
    echo "重启应用: pm2 restart $PM2_APP_NAME"
    echo "停止应用: pm2 stop $PM2_APP_NAME"
    echo "重启Nginx: systemctl restart nginx"
    echo "查看Nginx状态: systemctl status nginx"
    echo "查看Nginx错误日志: tail -f /var/log/nginx/error.log"
    
    log_info "故障排除:"
    echo "1. 如果无法访问，请检查云服务器安全组是否开放80端口"
    echo "2. 如果应用异常，请查看PM2日志: pm2 logs $PM2_APP_NAME"
    echo "3. 如果Nginx异常，请查看错误日志: tail -f /var/log/nginx/error.log"
}

# 清理临时文件
cleanup() {
    log_info "清理临时文件..."
    
    # 清理PM2日志（保留最近1000行）
    pm2 flush "$PM2_APP_NAME" || true
    
    # 清理部署过程中的临时文件
    find /tmp -name "${PROJECT_NAME}_temp_*" -type d -mtime +1 -exec rm -rf {} \; 2>/dev/null || true
    
    log_success "清理完成"
}

# 主函数
main() {
    log_info "开始云效流水线部署 $PROJECT_NAME..."
    log_info "脚本执行目录: $SOURCE_DIR"
    
    check_root
    check_dependencies
    check_source
    stop_services
    backup_project
    deploy_files
    verify_deployment_content
    install_serve
    set_permissions
    start_application
    restart_nginx
    verify_deployment
    cleanup
    show_deployment_info
    
    log_success "部署完成！"
}

# 显示帮助信息
show_help() {
    echo "OSS工具云效流水线部署脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  --help, -h         显示此帮助信息"
    echo ""
    echo "环境要求:"
    echo "  - root用户权限"
    echo "  - 已安装PM2、Nginx"
    echo "  - 脚本与流水线产物在同一目录"
    echo "  - 流水线产物为已编译的静态文件(dist目录)"
    echo ""
    echo "部署流程:"
    echo "  1. 检查环境和源目录"
    echo "  2. 停止现有服务"
    echo "  3. 备份现有项目"
    echo "  4. 复制新项目文件"
    echo "  5. 验证部署内容"
    echo "  6. 启动PM2应用"
    echo "  7. 重启Nginx服务"
    echo "  8. 验证部署结果"
}

# 处理命令行参数
case "${1:-}" in
    --help|-h)
        show_help
        exit 0
        ;;
esac

# 错误处理
trap 'log_error "部署过程中发生错误，请检查日志"; exit 1' ERR

# 执行主函数
main "$@"
