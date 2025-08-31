#!/bin/bash

# Database Migration and Rollback Script for AI Content Moderation System

set -e

COMMAND=${1:-help}
ENVIRONMENT=${2:-development}
BACKUP_DIR="./backups"
LOG_FILE="./logs/migration-$(date +%Y%m%d-%H%M%S).log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

# Create directories
mkdir -p logs backups

# Load environment configuration
if [ -f "./config/$ENVIRONMENT.env" ]; then
    source "./config/$ENVIRONMENT.env"
else
    error "Configuration file not found: ./config/$ENVIRONMENT.env"
fi

show_help() {
    echo "Database Migration Script for AI Content Moderation System"
    echo ""
    echo "Usage: $0 <command> [environment]"
    echo ""
    echo "Commands:"
    echo "  migrate     - Run pending migrations"
    echo "  rollback    - Rollback last migration"
    echo "  status      - Show migration status"
    echo "  backup      - Create database backup"
    echo "  restore     - Restore from backup"
    echo "  reset       - Reset database (development only)"
    echo "  validate    - Validate database schema"
    echo "  help        - Show this help"
    echo ""
    echo "Environments: development, staging, production"
}

create_backup() {
    local backup_name=${1:-"manual-$(date +%Y%m%d-%H%M%S)"}
    local backup_file="$BACKUP_DIR/$backup_name.sql"
    
    log "Creating database backup: $backup_file"
    
    # Extract database details from DATABASE_URL
    if [[ $DATABASE_URL =~ postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+) ]]; then
        DB_USER="${BASH_REMATCH[1]}"
        DB_PASS="${BASH_REMATCH[2]}"
        DB_HOST="${BASH_REMATCH[3]}"
        DB_PORT="${BASH_REMATCH[4]}"
        DB_NAME="${BASH_REMATCH[5]}"
    else
        error "Invalid DATABASE_URL format"
    fi
    
    PGPASSWORD="$DB_PASS" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > "$backup_file"
    
    if [ $? -eq 0 ]; then
        log "Backup created successfully: $backup_file"
        echo "$backup_file"
    else
        error "Backup creation failed"
    fi
}

restore_backup() {
    local backup_file=$1
    
    if [ -z "$backup_file" ]; then
        echo "Available backups:"
        ls -la "$BACKUP_DIR"/*.sql 2>/dev/null || echo "No backups found"
        read -p "Enter backup filename: " backup_file
    fi
    
    if [ ! -f "$backup_file" ]; then
        error "Backup file not found: $backup_file"
    fi
    
    warn "This will restore the database from backup. All current data will be lost!"
    read -p "Are you sure? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        log "Restore cancelled"
        exit 0
    fi
    
    log "Restoring database from: $backup_file"
    
    # Extract database details
    if [[ $DATABASE_URL =~ postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+) ]]; then
        DB_USER="${BASH_REMATCH[1]}"
        DB_PASS="${BASH_REMATCH[2]}"
        DB_HOST="${BASH_REMATCH[3]}"
        DB_PORT="${BASH_REMATCH[4]}"
        DB_NAME="${BASH_REMATCH[5]}"
    else
        error "Invalid DATABASE_URL format"
    fi
    
    PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" < "$backup_file"
    
    if [ $? -eq 0 ]; then
        log "Database restored successfully"
    else
        error "Database restore failed"
    fi
}

run_migrations() {
    log "Running database migrations for environment: $ENVIRONMENT"
    
    # Create pre-migration backup
    backup_file=$(create_backup "pre-migration-$(date +%Y%m%d-%H%M%S)")
    
    # Run migrations
    npm run db:migrate
    
    if [ $? -eq 0 ]; then
        log "Migrations completed successfully"
        log "Pre-migration backup available at: $backup_file"
    else
        error "Migration failed. Backup available at: $backup_file"
    fi
}

rollback_migration() {
    log "Rolling back last migration for environment: $ENVIRONMENT"
    
    # Create pre-rollback backup
    backup_file=$(create_backup "pre-rollback-$(date +%Y%m%d-%H%M%S)")
    
    # Rollback migration
    npm run db:rollback
    
    if [ $? -eq 0 ]; then
        log "Rollback completed successfully"
        log "Pre-rollback backup available at: $backup_file"
    else
        error "Rollback failed. Backup available at: $backup_file"
    fi
}

show_status() {
    log "Checking migration status for environment: $ENVIRONMENT"
    npm run db:status
}

validate_schema() {
    log "Validating database schema for environment: $ENVIRONMENT"
    npm run db:validate
}

reset_database() {
    if [ "$ENVIRONMENT" != "development" ]; then
        error "Database reset is only allowed in development environment"
    fi
    
    warn "This will completely reset the database. All data will be lost!"
    read -p "Are you sure? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        log "Reset cancelled"
        exit 0
    fi
    
    log "Resetting database for development environment"
    npm run db:reset
    
    if [ $? -eq 0 ]; then
        log "Database reset completed successfully"
    else
        error "Database reset failed"
    fi
}

case $COMMAND in
    "migrate")
        run_migrations
        ;;
    "rollback")
        rollback_migration
        ;;
    "status")
        show_status
        ;;
    "backup")
        create_backup
        ;;
    "restore")
        restore_backup $3
        ;;
    "reset")
        reset_database
        ;;
    "validate")
        validate_schema
        ;;
    "help")
        show_help
        ;;
    *)
        echo "Unknown command: $COMMAND"
        show_help
        exit 1
        ;;
esac