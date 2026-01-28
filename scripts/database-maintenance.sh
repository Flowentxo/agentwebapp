#!/bin/bash

# =================================================================
# DATABASE INDEX MAINTENANCE & OPTIMIZATION SCRIPT
# =================================================================
# Comprehensive database maintenance for optimal performance
# Addresses critical indexing performance issues
#
# Usage: ./database-maintenance.sh [option]
# Options: analyze, optimize, reindex, vacuum, all
# =================================================================

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_ROOT/logs/database-maintenance-$(date +%Y%m%d-%H%M%S).log"
DB_NAME="${DB_NAME:-aiagent}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v psql &> /dev/null; then
        log_error "psql not found. Please install PostgreSQL client."
        exit 1
    fi
    
    if ! command -v pg_config &> /dev/null; then
        log_error "pg_config not found. Please install PostgreSQL development packages."
        exit 1
    fi
    
    # Test database connection
    if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &> /dev/null; then
        log_error "Cannot connect to database. Please check connection parameters."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Create logs directory
mkdir -p "$PROJECT_ROOT/logs"

# Analyze current index usage
analyze_indexes() {
    log_info "Analyzing current index usage and performance..."
    
    # Get index usage statistics
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
-- Index usage analysis
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    CASE 
        WHEN idx_scan = 0 THEN 'UNUSED - Consider dropping'
        WHEN idx_scan < 100 THEN 'LOW USAGE - Monitor'
        WHEN idx_scan < 1000 THEN 'MODERATE USAGE'
        ELSE 'HIGH USAGE - Working well'
    END as usage_status
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
EOF

    # Get slow queries
    log_info "Identifying slow queries..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent,
    CASE 
        WHEN mean_time > 1000 THEN 'CRITICAL - Needs immediate attention'
        WHEN mean_time > 100 THEN 'HIGH - Consider optimization'
        WHEN mean_time > 10 THEN 'MEDIUM - Monitor'
        ELSE 'LOW - Acceptable'
    END as performance_level
FROM pgWHERE calls > _stat_statements 
10
ORDER BY mean_time DESC
LIMIT 20;
EOF

    # Get table statistics
    log_info "Checking table statistics and maintenance needs..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_tuples,
    n_dead_tup as dead_tuples,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    CASE 
        WHEN n_dead_tup > n_live_tup * 0.1 THEN 'NEEDS VACUUM'
        WHEN last_vacuum < NOW() - INTERVAL '7 days' THEN 'STALE - Consider vacuum'
        ELSE 'OK'
    END as maintenance_status,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
EOF

    log_success "Index analysis completed"
}

# Optimize tables (VACUUM ANALYZE)
optimize_tables() {
    log_info "Optimizing tables (VACUUM ANALYZE)..."
    
    # Get list of tables that need optimization
    TABLES=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT tablename 
        FROM pg_stat_user_tables 
        WHERE schemaname = 'public' 
        AND (n_dead_tup > n_live_tup * 0.1 OR last_vacuum < NOW() - INTERVAL '7 days')
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
    ")
    
    if [ -n "$TABLES" ]; then
        log_info "Tables needing optimization: $TABLES"
        
        for table in $TABLES; do
            table=$(echo "$table" | xargs)  # Trim whitespace
            log_info "Optimizing table: $table"
            
            psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
VACUUM ANALYZE $table;
EOF
            
            log_success "Optimized table: $table"
        done
    else
        log_info "No tables need optimization at this time"
    fi
}

# Reindex tables
reindex_tables() {
    log_info "Reindexing database tables..."
    
    # Reindex critical tables first
    CRITICAL_TABLES=(
        "agent_messages"
        "users"
        "workspaces"
        "brain_documents"
        "ai_usage"
        "collaborations"
        "kb_entries"
    )
    
    for table in "${CRITICAL_TABLES[@]}"; do
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\dt $table" | grep -q "$table"; then
            log_info "Reindexing table: $table"
            
            psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
REINDEX TABLE CONCURRENTLY $table;
EOF
            
            log_success "Reindexed table: $table"
        else
            log_warning "Table $table not found, skipping"
        fi
    done
    
    # Reindex remaining tables
    log_info "Reindexing remaining tables..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
REINDEX DATABASE CONCURRENTLY;
EOF
    
    log_success "Database reindexing completed"
}

# Vacuum database
vacuum_database() {
    log_info "Running database VACUUM..."
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
VACUUM FULL VERBOSE;
EOF
    
    log_success "Database VACUUM completed"
}

# Run performance tests
run_performance_tests() {
    log_info "Running performance tests..."
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
-- Test critical queries and report performance
SELECT * FROM run_performance_tests();

-- Check performance health
SELECT * FROM check_performance_health();

-- Analyze index effectiveness
SELECT * FROM analyze_index_effectiveness();
EOF

    log_success "Performance tests completed"
}

# Apply critical indexes
apply_critical_indexes() {
    log_info "Applying critical database indexes..."
    
    # Check if migration file exists
    MIGRATION_FILE="$PROJECT_ROOT/lib/db/migrations/0017_critical_database_indexing_optimization.sql"
    
    if [ -f "$MIGRATION_FILE" ]; then
        log_info "Found critical indexing migration: $MIGRATION_FILE"
        
        # Apply the migration
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_FILE"
        
        log_success "Critical indexes applied successfully"
    else
        log_error "Critical indexing migration file not found: $MIGRATION_FILE"
        log_info "Please ensure the migration file exists before applying indexes"
    fi
}

# Generate performance report
generate_report() {
    local report_file="$PROJECT_ROOT/logs/performance-report-$(date +%Y%m%d-%H%M%S).txt"
    
    log_info "Generating performance report: $report_file"
    
    cat > "$report_file" << EOF
================================================================
DATABASE PERFORMANCE REPORT
Generated: $(date)
================================================================

1. INDEX USAGE SUMMARY
$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT 
        COUNT(*) as total_indexes,
        SUM(idx_scan) as total_scans,
        SUM(CASE WHEN idx_scan = 0 THEN 1 ELSE 0 END) as unused_indexes,
        SUM(pg_relation_size(indexrelid)) as total_index_size
    FROM pg_stat_user_indexes 
    WHERE schemaname = 'public'
;")

2. SLOW QUERIES (Top 10)
$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT 
        query,
        calls,
        mean_time,
        total_time
    FROM pg_stat_statements 
    ORDER BY mean_time DESC 
    LIMIT 10
;")

3. TABLE SIZES
$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        n_live_tup as live_tuples,
        n_dead_tup as dead_tuples
    FROM pg_stat_user_tables 
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
;")

4. DATABASE STATISTICS
$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT 
        datname,
        numbackends as connections,
        xact_commit,
        xact_rollback,
        blks_read,
        blks_hit,
        tup_returned,
        tup_fetched,
        tup_inserted,
        tup_updated,
        tup_deleted
    FROM pg_stat_database 
    WHERE datname = '$DB_NAME'
;")

================================================================
RECOMMENDATIONS:
- Monitor tables with high dead tuple counts
- Review queries with high mean execution times
- Consider dropping unused indexes
- Schedule regular maintenance windows
================================================================
EOF

    log_success "Performance report generated: $report_file"
}

# Main menu
show_menu() {
    echo ""
    echo "================================================================"
    echo "           DATABASE MAINTENANCE & OPTIMIZATION"
    echo "================================================================"
    echo "1) Analyze indexes and performance"
    echo "2) Optimize tables (VACUUM ANALYZE)"
    echo "3) Reindex database"
    echo "4) Apply critical indexes"
    echo "5) Run performance tests"
    echo "6) Generate performance report"
    echo "7) Full maintenance (analyze + optimize + reindex)"
    echo "8) Exit"
    echo ""
    echo -n "Select option [1-8]: "
}

# Main execution
main() {
    log_info "Starting database maintenance script"
    
    check_prerequisites
    
    case "${1:-menu}" in
        "analyze")
            analyze_indexes
            ;;
        "optimize")
            optimize_tables
            ;;
        "reindex")
            reindex_tables
            ;;
        "indexes")
            apply_critical_indexes
            ;;
        "test")
            run_performance_tests
            ;;
        "report")
            generate_report
            ;;
        "all")
            log_info "Running full maintenance cycle..."
            analyze_indexes
            optimize_tables
            reindex_tables
            apply_critical_indexes
            run_performance_tests
            generate_report
            ;;
        "menu"|*)
            while true; do
                show_menu
                read -r choice
                case $choice in
                    1) analyze_indexes ;;
                    2) optimize_tables ;;
                    3) reindex_tables ;;
                    4) apply_critical_indexes ;;
                    5) run_performance_tests ;;
                    6) generate_report ;;
                    7) 
                        log_info "Running full maintenance cycle..."
                        analyze_indexes
                        optimize_tables
                        reindex_tables
                        apply_critical_indexes
                        run_performance_tests
                        generate_report
                        ;;
                    8) 
                        log_info "Exiting maintenance script"
                        break
                        ;;
                    *) 
                        log_error "Invalid option. Please select 1-8."
                        ;;
                esac
                echo ""
                read -p "Press Enter to continue..."
            done
            ;;
    esac
    
    log_success "Database maintenance completed"
}

# Execute main function
main "$@"