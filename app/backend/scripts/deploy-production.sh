#!/bin/bash

# Production deployment script for LinkDAO backend
echo "🚀 Starting LinkDAO backend production deployment..."

# Check if we're on the correct branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "⚠️  Warning: Not on main branch. Current branch: $CURRENT_BRANCH"
fi

# Ensure we have the latest code
echo "📥 Pulling latest code..."
git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
npm install --no-audit --prefer-offline

# Build the application
echo "🏗️  Building application..."
npm run build

# Check if build was successful
if [ $? -ne 0 ]; then
  echo "❌ Build failed. Aborting deployment."
  exit 1
fi

echo "✅ Build successful"

# Show deployment configuration
echo "📋 Deployment configuration:"
echo "   Plan: Standard (2GB RAM)"
echo "   WebSocket: Enabled"
echo "   Node Options: --max-old-space-size=1536 --optimize-for-size"

# Instructions for Render deployment
echo ""
echo "📋 To deploy to Render:"
echo "1. Push changes to GitHub main branch"
echo "2. Render will automatically deploy with the updated configuration"
echo "3. Monitor the deployment at: https://dashboard.render.com"

echo ""
echo "✅ Production deployment preparation complete!"
echo "🔗 Backend URL: https://api.linkdao.io"
echo "📊 Health check: https://api.linkdao.io/health"

# Production Deployment Script for Marketplace API
# This script handles the complete production deployment process

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOYMENT_DIR="/opt/marketplace-api"
BACKUP_DIR="/opt/marketplace-api/backups"
SERVICE_NAME="marketplace-api"
USER="marketplace"
NODE_VERSION="18"

# Functions
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

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if running as root or with sudo
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root or with sudo"
        exit 1
    fi
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    local node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [[ $node_version -lt $NODE_VERSION ]]; then
        log_error "Node.js version $NODE_VERSION or higher is required"
        exit 1
    fi
    
    # Check PostgreSQL client
    if ! command -v psql &> /dev/null; then
        log_warning "PostgreSQL client not found. Database operations may fail."
    fi
    
    # Check Redis client
    if ! command -v redis-cli &> /dev/null; then
        log_warning "Redis client not found. Cache operations may fail."
    fi
    
    log_success "Prerequisites check completed"
}

create_user_and_directories() {
    log_info "Setting up user and directories..."
    
    # Create marketplace user if it doesn't exist
    if ! id "$USER" &>/dev/null; then
        useradd -r -s /bin/bash -d $DEPLOYMENT_DIR $USER
        log_success "Created user: $USER"
    fi
    
    # Create directories
    mkdir -p $DEPLOYMENT_DIR
    mkdir -p $BACKUP_DIR
    mkdir -p /var/log/marketplace-api
    mkdir -p /etc/marketplace-api
    
    # Set ownership
    chown -R $USER:$USER $DEPLOYMENT_DIR
    chown -R $USER:$USER $BACKUP_DIR
    chown -R $USER:$USER /var/log/marketplace-api
    chown -R $USER:$USER /etc/marketplace-api
    
    log_success "User and directories created"
}

backup_current_deployment() {
    log_info "Creating backup of current deployment..."
    
    if [[ -d "$DEPLOYMENT_DIR/current" ]]; then
        local backup_name="backup-$(date +%Y%m%d-%H%M%S)"
        local backup_path="$BACKUP_DIR/$backup_name"
        
        cp -r "$DEPLOYMENT_DIR/current" "$backup_path"
        log_success "Backup created: $backup_path"
        
        # Keep only last 5 backups
        cd $BACKUP_DIR
        ls -t | tail -n +6 | xargs -r rm -rf
        log_info "Cleaned up old backups"
    else
        log_info "No current deployment to backup"
    fi
}

deploy_application() {
    log_info "Deploying application..."
    
    local temp_dir="/tmp/marketplace-api-deploy"
    local source_dir="$(dirname "$(dirname "$(realpath "$0")")")"
    
    # Create temporary deployment directory
    rm -rf $temp_dir
    mkdir -p $temp_dir
    
    # Copy source files
    cp -r "$source_dir"/* $temp_dir/
    
    # Install dependencies
    cd $temp_dir
    log_info "Installing dependencies..."
    sudo -u $USER npm ci --production
    
    # Build TypeScript (if needed)
    if [[ -f "tsconfig.json" ]]; then
        log_info "Building TypeScript..."
        sudo -u $USER npm run build 2>/dev/null || log_warning "Build step failed or not configured"
    fi
    
    # Move to deployment directory
    rm -rf "$DEPLOYMENT_DIR/current"
    mv $temp_dir "$DEPLOYMENT_DIR/current"
    chown -R $USER:$USER "$DEPLOYMENT_DIR/current"
    
    log_success "Application deployed"
}

setup_environment() {
    log_info "Setting up environment configuration..."
    
    local env_file="/etc/marketplace-api/.env.production"
    
    if [[ ! -f "$env_file" ]]; then
        # Copy example environment file
        cp "$DEPLOYMENT_DIR/current/.env.production.example" "$env_file"
        chown $USER:$USER "$env_file"
        chmod 600 "$env_file"
        
        log_warning "Environment file created from example: $env_file"
        log_warning "Please update the configuration before starting the service"
    else
        log_info "Environment file already exists: $env_file"
    fi
    
    # Create symlink in application directory
    ln -sf "$env_file" "$DEPLOYMENT_DIR/current/.env"
    
    log_success "Environment configuration completed"
}

setup_systemd_service() {
    log_info "Setting up systemd service..."
    
    cat > /etc/systemd/system/$SERVICE_NAME.service << EOF
[Unit]
Description=Marketplace API Server
After=network.target postgresql.service redis.service
Wants=postgresql.service redis.service

[Service]
Type=simple
User=$USER
Group=$USER
WorkingDirectory=$DEPLOYMENT_DIR/current
ExecStart=/usr/bin/node src/index.production.js
ExecReload=/bin/kill -HUP \$MAINPID
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$SERVICE_NAME

# Environment
Environment=NODE_ENV=production
EnvironmentFile=/etc/marketplace-api/.env.production

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$DEPLOYMENT_DIR /var/log/marketplace-api /tmp

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable $SERVICE_NAME
    
    log_success "Systemd service configured"
}

setup_nginx() {
    log_info "Setting up Nginx configuration..."
    
    if ! command -v nginx &> /dev/null; then
        log_warning "Nginx not found. Skipping reverse proxy setup."
        return
    fi
    
    cat > /etc/nginx/sites-available/marketplace-api << 'EOF'
upstream marketplace_api {
    server 127.0.0.1:10000;
    # Add more servers for load balancing
    # server 127.0.0.1:10001;
    # server 127.0.0.1:10002;
}

server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    # SSL Configuration
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;
    
    # Proxy Configuration
    location / {
        proxy_pass http://marketplace_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://marketplace_api/health;
        access_log off;
    }
    
    # Static files (if any)
    location /static/ {
        alias $DEPLOYMENT_DIR/current/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

    # Enable site
    ln -sf /etc/nginx/sites-available/marketplace-api /etc/nginx/sites-enabled/
    
    # Test configuration
    if nginx -t; then
        log_success "Nginx configuration created"
        log_warning "Please update SSL certificate paths and domain names in /etc/nginx/sites-available/marketplace-api"
    else
        log_error "Nginx configuration test failed"
    fi
}

run_database_migrations() {
    log_info "Running database migrations..."
    
    cd "$DEPLOYMENT_DIR/current"
    
    # Run migrations as the marketplace user
    if sudo -u $USER npm run migrate:production; then
        log_success "Database migrations completed"
    else
        log_error "Database migrations failed"
        return 1
    fi
}

start_services() {
    log_info "Starting services..."
    
    # Start the application service
    systemctl start $SERVICE_NAME
    
    # Check if service started successfully
    sleep 5
    if systemctl is-active --quiet $SERVICE_NAME; then
        log_success "Marketplace API service started"
    else
        log_error "Failed to start Marketplace API service"
        systemctl status $SERVICE_NAME
        return 1
    fi
    
    # Restart Nginx if it's running
    if systemctl is-active --quiet nginx; then
        systemctl reload nginx
        log_success "Nginx reloaded"
    fi
}

verify_deployment() {
    log_info "Verifying deployment..."
    
    # Wait for service to be ready
    sleep 10
    
    # Test health endpoint
    local health_url="http://localhost:10000/health"
    if curl -f -s "$health_url" > /dev/null; then
        log_success "Health check passed"
    else
        log_error "Health check failed"
        return 1
    fi
    
    # Test API endpoints
    local api_url="http://localhost:10000/api/marketplace/listings"
    if curl -f -s "$api_url" > /dev/null; then
        log_success "API endpoints accessible"
    else
        log_warning "API endpoints may not be fully ready"
    fi
    
    log_success "Deployment verification completed"
}

cleanup() {
    log_info "Cleaning up temporary files..."
    rm -rf /tmp/marketplace-api-deploy
    log_success "Cleanup completed"
}

rollback() {
    log_error "Deployment failed. Rolling back..."
    
    # Stop the service
    systemctl stop $SERVICE_NAME 2>/dev/null || true
    
    # Restore from backup
    local latest_backup=$(ls -t $BACKUP_DIR | head -n1)
    if [[ -n "$latest_backup" ]]; then
        rm -rf "$DEPLOYMENT_DIR/current"
        cp -r "$BACKUP_DIR/$latest_backup" "$DEPLOYMENT_DIR/current"
        chown -R $USER:$USER "$DEPLOYMENT_DIR/current"
        
        # Start the service
        systemctl start $SERVICE_NAME
        
        log_success "Rollback completed"
    else
        log_error "No backup found for rollback"
    fi
}

main() {
    log_info "Starting Marketplace API production deployment..."
    
    # Set trap for cleanup on error
    trap rollback ERR
    
    check_prerequisites
    create_user_and_directories
    backup_current_deployment
    deploy_application
    setup_environment
    setup_systemd_service
    setup_nginx
    run_database_migrations
    start_services
    verify_deployment
    cleanup
    
    log_success "🎉 Deployment completed successfully!"
    log_info "Service status: systemctl status $SERVICE_NAME"
    log_info "Service logs: journalctl -u $SERVICE_NAME -f"
    log_info "Configuration: /etc/marketplace-api/.env.production"
}

# Parse command line arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "rollback")
        rollback
        ;;
    "status")
        systemctl status $SERVICE_NAME
        ;;
    "logs")
        journalctl -u $SERVICE_NAME -f
        ;;
    "restart")
        systemctl restart $SERVICE_NAME
        log_success "Service restarted"
        ;;
    *)
        echo "Usage: $0 {deploy|rollback|status|logs|restart}"
        exit 1
        ;;
esac
