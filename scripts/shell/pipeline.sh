#!/bin/bash

# Leeft Data Pipeline
# Consolidated script for data sync and optional deployment
#
# Usage:
#   ./pipeline.sh                  - Full pipeline + deploy (default)
#   ./pipeline.sh --sync-only      - Data sync only (no deploy)
#   ./pipeline.sh --deploy         - Full pipeline + deploy (explicit)
#   ./pipeline.sh --skip-download  - Skip TrainHeroic & Fitbit downloads

set -e  # Exit on any error

# Parse arguments
DEPLOY=true
SKIP_DOWNLOAD=false
for arg in "$@"; do
    case $arg in
        --sync-only)
            DEPLOY=false
            shift
            ;;
        --deploy)
            DEPLOY=true
            shift
            ;;
        --skip-download)
            SKIP_DOWNLOAD=true
            shift
            ;;
    esac
done

# Get the project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
cd "$PROJECT_ROOT"

# Load environment variables
if [ -f "apps/data/.env" ]; then
    TRAINHEROIC_SESSION_TOKEN=$(grep '^TRAINHEROIC_SESSION_TOKEN=' apps/data/.env | cut -d'=' -f2)
fi

# Color output for better visibility
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to validate date format (YYYY-MM-DD)
validate_date() {
    if [[ $1 =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
        if date -d "$1" >/dev/null 2>&1 || date -j -f "%Y-%m-%d" "$1" >/dev/null 2>&1; then
            return 0
        fi
    fi
    return 1
}

echo -e "${BLUE}Leeft Data Pipeline${NC}"
echo "===================="
if [ "$SKIP_DOWNLOAD" = true ]; then
    echo "Mode: Skip download"
elif [ "$DEPLOY" = true ]; then
    echo "Mode: Full pipeline + deploy"
else
    echo "Mode: Sync only (no deploy)"
fi
echo ""

if [ "$SKIP_DOWNLOAD" = false ]; then
    # Validate TrainHeroic session token
    if [ -z "$TRAINHEROIC_SESSION_TOKEN" ]; then
        error "TRAINHEROIC_SESSION_TOKEN not set in apps/data/.env"
        exit 1
    fi

    echo "Enter the date range for TrainHeroic data download:"
    echo ""

    # Default values
    DEFAULT_START=$(date -d '-30 days' '+%Y-%m-%d' 2>/dev/null || date -v-30d '+%Y-%m-%d' 2>/dev/null)
    DEFAULT_END=$(date '+%Y-%m-%d')

    # Prompt for start date
    while true; do
        read -p "Start date (YYYY-MM-DD) [default: $DEFAULT_START]: " START_DATE
        START_DATE=${START_DATE:-$DEFAULT_START}

        if validate_date "$START_DATE"; then
            break
        else
            error "Invalid date format. Please use YYYY-MM-DD format."
        fi
    done

    # Prompt for end date
    while true; do
        read -p "End date (YYYY-MM-DD) [default: $DEFAULT_END]: " END_DATE
        END_DATE=${END_DATE:-$DEFAULT_END}

        if validate_date "$END_DATE"; then
            if [[ "$END_DATE" > "$START_DATE" ]] || [[ "$END_DATE" == "$START_DATE" ]]; then
                break
            else
                error "End date must be on or after start date."
            fi
        else
            error "Invalid date format. Please use YYYY-MM-DD format."
        fi
    done

    echo ""
    log "Starting pipeline for date range: ${START_DATE} to ${END_DATE}"
    echo ""
else
    log "Skipping downloads, processing existing data..."
    echo ""
fi

# Calculate total steps based on mode
TOTAL_STEPS=6
if [ "$SKIP_DOWNLOAD" = false ]; then
    TOTAL_STEPS=$((TOTAL_STEPS + 2))
fi
if [ "$DEPLOY" = true ]; then
    TOTAL_STEPS=$((TOTAL_STEPS + 2))
fi
STEP=0

# Change to apps/data for data pipeline commands
cd apps/data

# Step: Download TrainHeroic data
if [ "$SKIP_DOWNLOAD" = false ]; then
    STEP=$((STEP + 1))
    log "Step ${STEP}/${TOTAL_STEPS}: Downloading TrainHeroic data..."
    if bun trainheroic:download "startDate=${START_DATE}&endDate=${END_DATE}" "$TRAINHEROIC_SESSION_TOKEN"; then
        success "TrainHeroic data downloaded"
    else
        error "Failed to download TrainHeroic data"
        exit 1
    fi
fi

# Step: Compile lifting data
STEP=$((STEP + 1))
log "Step ${STEP}/${TOTAL_STEPS}: Compiling lifting data..."
if bun compile:lifting; then
    success "Lifting data compiled"
else
    error "Failed to compile lifting data"
    exit 1
fi

# Step: Combine lifting data
STEP=$((STEP + 1))
log "Step ${STEP}/${TOTAL_STEPS}: Combining lifting data..."
if bun combine:lifting; then
    success "Lifting data combined"
else
    error "Failed to combine lifting data"
    exit 1
fi

# Step: Download Fitbit data (auto-refreshes token if expired)
if [ "$SKIP_DOWNLOAD" = false ]; then
    STEP=$((STEP + 1))
    log "Step ${STEP}/${TOTAL_STEPS}: Downloading Fitbit data..."
    if bun fitbit:download; then
        success "Fitbit data downloaded"
    else
        warn "Failed to download Fitbit data - if token expired, run: bun fitbit:auth"
    fi
fi

# Step: Process Fitbit data
STEP=$((STEP + 1))
log "Step ${STEP}/${TOTAL_STEPS}: Processing Fitbit data..."
if bun fitbit:process; then
    success "Fitbit data processed"
else
    warn "Failed to process Fitbit data - continuing with remaining steps"
fi

# Step: Compile cardio data
STEP=$((STEP + 1))
log "Step ${STEP}/${TOTAL_STEPS}: Compiling cardio data..."
if bun compile:cardio; then
    success "Cardio data compiled"
else
    error "Failed to compile cardio data"
    exit 1
fi

# Step: Compile all data
STEP=$((STEP + 1))
log "Step ${STEP}/${TOTAL_STEPS}: Compiling all data..."
if bun compile:all; then
    success "All data compiled"
else
    error "Failed to compile all data"
    exit 1
fi

# Step: Combine all data
STEP=$((STEP + 1))
log "Step ${STEP}/${TOTAL_STEPS}: Combining all data..."
if bun combine:all; then
    success "All data combined"
else
    error "Failed to combine all data"
    exit 1
fi

# Return to project root for upload and deploy
cd "$PROJECT_ROOT"

if [ "$DEPLOY" = true ]; then
    # Step: Upload to Google Cloud Storage
    STEP=$((STEP + 1))
    log "Step ${STEP}/${TOTAL_STEPS}: Uploading to Google Cloud Storage..."
    if ./scripts/shell/upload.sh; then
        success "Data uploaded to GCS"
    else
        error "Failed to upload to GCS"
        exit 1
    fi

    # Step: Build and deploy to Firebase
    STEP=$((STEP + 1))
    log "Step ${STEP}/${TOTAL_STEPS}: Building and deploying to Firebase..."
    if pnpm deploy:web; then
        success "Deployed to Firebase"
    else
        error "Failed to deploy"
        exit 1
    fi
fi

echo ""
success "Pipeline completed successfully!"
if [ "$SKIP_DOWNLOAD" = false ]; then
    log "Data range processed: ${START_DATE} to ${END_DATE}"
fi
if [ "$DEPLOY" = true ]; then
    log "Deployed to Firebase"
else
    log "Run with --deploy to upload and deploy"
fi
