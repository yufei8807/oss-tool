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
# DEBUG=1 bash deploy-pipeline.sh   # 调试模式，显示详细日志
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
    echo -e "${BLUE}[INFO $(date '+%H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS $(date '+%H:%M:%S')]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING $(date '+%H:%M:%S')]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR $(date '+%H:%M:%S')]${NC} $1"
}

log_debug() {
    if [ "${DEBUG:-0}" = "1" ]; then
        echo -e "\033[0;36m[DEBUG $(date '+%H:%M:%S')]\033[0m $1"
    fi
}

log_step() {
    echo ""
    echo -e "${GREEN}===============================================${NC}"
    echo -e "${GREEN}[STEP $(date '+%H:%M:%S')]${NC} $1"
    echo -e "${GREEN}===============================================${NC}"
}

log_command() {
    echo -e "\033[0;37m[CMD $(date '+%H:%M:%S')]\033[0m 执行命令: $1"
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
    log_step "检查用户权限"
    log_info "当前用户ID: $EUID"
    
    if [ "$EUID" -ne 0 ]; then
        log_error "请使用root用户运行此脚本"
        log_error "当前用户权限不足，需要sudo或root权限"
        exit 1
    fi
    
    log_success "用户权限检查通过 - 当前为root用户"
}

# 检查必要的命令是否存在
check_dependencies() {
    log_step "检查系统依赖"
    
    local deps=("tar" "nginx" "pm2")
    local missing_deps=()
    
    for dep in "${deps[@]}"; do
        log_info "检查依赖: $dep"
        
        if command -v "$dep" &> /dev/null; then
            local version=$(
                case $dep in
                    "tar") tar --version | head -1 ;;
                    "nginx") nginx -v 2>&1 ;;
                    "pm2") pm2 --version 2>/dev/null || echo "已安装" ;;
                    *) echo "已安装" ;;
                esac
            )
            log_success "$dep 已安装 - $version"
        else
            log_error "$dep 未安装"
            missing_deps+=("$dep")
        fi
    done
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_error "缺少以下依赖: ${missing_deps[*]}"
        log_error "请先安装必要的环境后再运行此脚本"
        exit 1
    fi
    
    log_success "所有系统依赖检查完成"
}

# 检查源目录（脚本解压后的目录）
check_source() {
    log_step "检查源目录和项目文件"
    log_info "源目录路径: $SOURCE_DIR"
    
    # 检查当前目录是否是有效的项目目录
    if [ ! -d "$SOURCE_DIR" ]; then
        log_error "源目录不存在: $SOURCE_DIR"
        exit 1
    fi
    
    log_info "源目录存在，开始检查内容..."
    
    # 显示源目录内容
    log_debug "源目录内容:"
    if [ "${DEBUG:-0}" = "1" ]; then
        ls -la "$SOURCE_DIR" | while read line; do
            log_debug "  $line"
        done
    fi
    
    # 检查是否存在dist目录
    if [ ! -d "$SOURCE_DIR/dist" ]; then
        log_error "未找到dist目录: $SOURCE_DIR/dist"
        log_error "请确认流水线产物包含编译后的文件"
        log_info "当前目录结构:"
        find "$SOURCE_DIR" -maxdepth 2 -type d | while read dir; do
            log_info "  目录: $dir"
        done
        exit 1
    fi
    
    # 检查dist目录是否为空
    local dist_files=$(ls -A "$SOURCE_DIR/dist" | wc -l)
    log_info "dist目录包含 $dist_files 个文件/目录"
    
    if [ "$dist_files" -eq 0 ]; then
        log_error "dist目录为空，请检查流水线构建是否正确"
        exit 1
    fi
    
    # 显示dist目录的关键文件
    log_info "dist目录主要内容:"
    ls -lh "$SOURCE_DIR/dist" | head -10 | while read line; do
        log_info "  $line"
    done
    
    # 计算dist目录大小
    local dist_size=$(du -sh "$SOURCE_DIR/dist" 2>/dev/null | cut -f1)
    log_info "dist目录总大小: $dist_size"
    
    log_success "源目录检查完成 - 路径: $SOURCE_DIR, 文件数: $dist_files, 大小: $dist_size"
}

# 停止现有服务
stop_services() {
    log_step "停止现有服务"
    
    # 显示当前PM2进程状态
    log_info "检查当前PM2进程状态..."
    log_command "pm2 list"
    
    if pm2 list 2>/dev/null | grep -q "$PM2_APP_NAME"; then
        log_info "发现运行中的应用: $PM2_APP_NAME"
        
        # 显示应用详细信息
        log_info "应用详细信息:"
        pm2 show "$PM2_APP_NAME" 2>/dev/null | head -20 | while read line; do
            log_info "  $line"
        done
        
        # 停止应用
        log_info "正在停止应用: $PM2_APP_NAME"
        log_command "pm2 stop $PM2_APP_NAME"
        if pm2 stop "$PM2_APP_NAME"; then
            log_success "应用停止成功"
        else
            log_warning "应用停止可能失败，继续执行删除操作"
        fi
        
        # 删除应用
        log_info "正在删除应用配置: $PM2_APP_NAME"
        log_command "pm2 delete $PM2_APP_NAME"
        if pm2 delete "$PM2_APP_NAME"; then
            log_success "应用配置删除成功"
        else
            log_warning "应用配置删除可能失败"
        fi
        
        # 等待进程完全停止
        log_info "等待进程完全停止..."
        sleep 2
        
        log_success "现有PM2应用已停止"
    else
        log_info "未发现运行中的PM2应用: $PM2_APP_NAME"
    fi
    
    # 显示最终PM2状态
    log_info "当前PM2进程列表:"
    pm2 list 2>/dev/null | while read line; do
        log_debug "  $line"
    done
}

# 备份现有项目
backup_project() {
    log_step "备份现有项目"
    
    if [ -d "$PROJECT_DIR" ]; then
        log_info "发现现有项目目录: $PROJECT_DIR"
        
        # 显示现有项目信息
        local current_size=$(du -sh "$PROJECT_DIR" 2>/dev/null | cut -f1)
        local current_files=$(find "$PROJECT_DIR" -type f | wc -l)
        log_info "现有项目大小: $current_size, 文件数: $current_files"
        
        # 创建备份
        local backup_dir="${PROJECT_DIR}_backup_$(date +%Y%m%d_%H%M%S)"
        log_info "创建备份目录: $backup_dir"
        log_command "mv $PROJECT_DIR $backup_dir"
        
        if mv "$PROJECT_DIR" "$backup_dir"; then
            log_success "项目已备份到: $backup_dir"
            
            # 验证备份
            if [ -d "$backup_dir" ]; then
                local backup_size=$(du -sh "$backup_dir" 2>/dev/null | cut -f1)
                log_info "备份验证成功 - 大小: $backup_size"
            else
                log_error "备份验证失败 - 备份目录不存在"
                exit 1
            fi
        else
            log_error "项目备份失败"
            exit 1
        fi
        
        # 保留最近3个备份，删除旧备份
        log_info "清理旧备份文件..."
        local backup_count=$(ls -d ${PROJECT_DIR}_backup_* 2>/dev/null | wc -l)
        log_info "当前备份总数: $backup_count"
        
        if [ "$backup_count" -gt 3 ]; then
            local old_backups=$(ls -dt ${PROJECT_DIR}_backup_* 2>/dev/null | tail -n +4)
            if [ ! -z "$old_backups" ]; then
                log_info "删除旧备份:"
                echo "$old_backups" | while read backup; do
                    log_info "  删除: $backup"
                    rm -rf "$backup" || log_warning "删除失败: $backup"
                done
            fi
        fi
        
        # 显示最终备份状态
        log_info "备份文件列表:"
        ls -lh ${PROJECT_DIR}_backup_* 2>/dev/null | while read line; do
            log_info "  $line"
        done
        
    else
        log_info "未发现现有项目目录: $PROJECT_DIR"
        log_info "这是首次部署，无需备份"
    fi
}

# 复制项目文件到部署目录
deploy_files() {
    log_step "部署项目文件"
    
    log_info "源目录: $SOURCE_DIR"
    log_info "目标目录: $PROJECT_DIR"
    
    # 创建部署目录
    log_info "创建部署目录..."
    log_command "mkdir -p $DEPLOY_DIR"
    if mkdir -p "$DEPLOY_DIR"; then
        log_success "部署目录创建成功: $DEPLOY_DIR"
    else
        log_error "部署目录创建失败: $DEPLOY_DIR"
        exit 1
    fi
    
    # 开始复制文件
    local start_time=$(date +%s)
    
    if [ ! -d "$PROJECT_DIR" ]; then
        log_info "目标目录不存在，执行完整复制..."
        log_command "cp -r $SOURCE_DIR $PROJECT_DIR"
        
        if cp -r "$SOURCE_DIR" "$PROJECT_DIR"; then
            log_success "项目文件复制完成"
        else
            log_error "项目文件复制失败"
            exit 1
        fi
    else
        log_info "目标目录存在，执行增量更新..."
        log_command "cp -r $SOURCE_DIR/* $PROJECT_DIR/"
        
        if cp -r "$SOURCE_DIR"/* "$PROJECT_DIR"/; then
            log_success "项目文件更新完成"
        else
            log_error "项目文件更新失败"
            exit 1
        fi
    fi
    
    # 计算复制耗时
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    log_info "文件复制耗时: ${duration}秒"
    
    # 验证复制结果
    log_info "验证复制结果..."
    if [ -d "$PROJECT_DIR/dist" ]; then
        local copied_size=$(du -sh "$PROJECT_DIR" 2>/dev/null | cut -f1)
        local copied_files=$(find "$PROJECT_DIR" -type f | wc -l)
        log_success "复制验证成功 - 大小: $copied_size, 文件数: $copied_files"
    else
        log_error "复制验证失败 - 缺少dist目录"
        exit 1
    fi
    
    # 移除部署脚本，避免重复执行
    if [ -f "$PROJECT_DIR/deploy-pipeline.sh" ]; then
        log_info "清理部署脚本文件..."
        log_command "rm $PROJECT_DIR/deploy-pipeline.sh"
        rm "$PROJECT_DIR/deploy-pipeline.sh"
        log_info "已移除部署目录中的脚本文件"
    fi
    
    # 显示最终部署目录结构
    log_info "部署目录结构:"
    ls -la "$PROJECT_DIR" | head -10 | while read line; do
        log_info "  $line"
    done
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
    local script_start_time=$(date +%s)
    local deployment_id="deploy_$(date +%Y%m%d_%H%M%S)"
    
    echo ""
    echo "=================================================================="
    echo "             OSS工具云效流水线部署脚本"
    echo "=================================================================="
    echo "项目名称: $PROJECT_NAME"
    echo "部署ID: $deployment_id"
    echo "开始时间: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "脚本版本: 1.0"
    echo "执行目录: $SOURCE_DIR"
    echo "目标目录: $PROJECT_DIR"
    echo "=================================================================="
    echo ""
    
    log_info "开始云效流水线部署 $PROJECT_NAME..."
    log_info "部署ID: $deployment_id"
    
    # 设置环境变量以便子函数使用
    export DEPLOYMENT_ID="$deployment_id"
    export DEPLOYMENT_START_TIME="$script_start_time"
    
    # 执行部署步骤
    local step_count=11
    local current_step=0
    
    current_step=$((current_step + 1))
    log_info "========== 步骤 $current_step/$step_count: 权限检查 =========="
    check_root
    
    current_step=$((current_step + 1))
    log_info "========== 步骤 $current_step/$step_count: 依赖检查 =========="
    check_dependencies
    
    current_step=$((current_step + 1))
    log_info "========== 步骤 $current_step/$step_count: 源文件检查 =========="
    check_source
    
    current_step=$((current_step + 1))
    log_info "========== 步骤 $current_step/$step_count: 停止服务 =========="
    stop_services
    
    current_step=$((current_step + 1))
    log_info "========== 步骤 $current_step/$step_count: 备份项目 =========="
    backup_project
    
    current_step=$((current_step + 1))
    log_info "========== 步骤 $current_step/$step_count: 部署文件 =========="
    deploy_files
    
    current_step=$((current_step + 1))
    log_info "========== 步骤 $current_step/$step_count: 验证内容 =========="
    verify_deployment_content
    
    current_step=$((current_step + 1))
    log_info "========== 步骤 $current_step/$step_count: 检查服务工具 =========="
    install_serve
    
    current_step=$((current_step + 1))
    log_info "========== 步骤 $current_step/$step_count: 设置权限 =========="
    set_permissions
    
    current_step=$((current_step + 1))
    log_info "========== 步骤 $current_step/$step_count: 启动应用 =========="
    start_application
    
    current_step=$((current_step + 1))
    log_info "========== 步骤 $current_step/$step_count: 重启Nginx =========="
    restart_nginx
    
    # 最终验证和清理
    log_step "最终验证和清理"
    verify_deployment
    cleanup
    
    # 计算总耗时
    local script_end_time=$(date +%s)
    local total_duration=$((script_end_time - script_start_time))
    local minutes=$((total_duration / 60))
    local seconds=$((total_duration % 60))
    
    echo ""
    echo "=================================================================="
    echo "                     部署完成总结"
    echo "=================================================================="
    echo "部署ID: $deployment_id"
    echo "完成时间: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "总耗时: ${minutes}分${seconds}秒"
    echo "=================================================================="
    echo ""
    
    show_deployment_info
    
    log_success "🎉 部署完成！总耗时: ${minutes}分${seconds}秒"
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
error_handler() {
    local exit_code=$?
    local line_number=$1
    
    echo ""
    echo "=================================================================="
    echo "                    部署失败 - 错误信息"
    echo "=================================================================="
    log_error "部署过程中发生错误！"
    log_error "错误代码: $exit_code"
    log_error "错误行号: $line_number"
    log_error "当前时间: $(date '+%Y-%m-%d %H:%M:%S')"
    
    if [ ! -z "${DEPLOYMENT_ID:-}" ]; then
        log_error "部署ID: $DEPLOYMENT_ID"
    fi
    
    # 显示系统信息用于调试
    log_error "系统信息:"
    log_error "  操作系统: $(uname -a)"
    log_error "  磁盘空间: $(df -h / | tail -1)"
    log_error "  内存使用: $(free -h | head -2 | tail -1)"
    
    # 显示关键目录状态
    if [ -d "$SOURCE_DIR" ]; then
        log_error "  源目录状态: $(ls -la $SOURCE_DIR | wc -l) 个项目"
    fi
    
    if [ -d "$PROJECT_DIR" ]; then
        log_error "  项目目录状态: $(ls -la $PROJECT_DIR | wc -l) 个项目"
    fi
    
    # 显示PM2状态
    if command -v pm2 &> /dev/null; then
        log_error "  PM2状态:"
        pm2 list 2>/dev/null | while read line; do
            log_error "    $line"
        done
    fi
    
    echo "=================================================================="
    echo "                      故障排除建议"
    echo "=================================================================="
    echo "1. 检查磁盘空间是否充足"
    echo "2. 确认有足够的权限执行操作"
    echo "3. 检查网络连接是否正常"
    echo "4. 查看系统日志: journalctl -xe"
    echo "5. 检查Nginx配置: nginx -t"
    echo "6. 重新运行脚本或联系系统管理员"
    echo "=================================================================="
    
    exit $exit_code
}

trap 'error_handler $LINENO' ERR

# 执行主函数
main "$@"
