#!/bin/bash

# Leeft Full Update & Deploy Pipeline
# Runs data pipeline, uploads to GCS, builds and deploys to Firebase

set -e  # Exit on any error

# Get the project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# Load environment variables (only the ones we need)
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

# Validate TrainHeroic session token
if [ -z "$TRAINHEROIC_SESSION_TOKEN" ]; then
    error "TRAINHEROIC_SESSION_TOKEN not set in apps/data/.env"
    exit 1
fi

# Function to validate date format (YYYY-MM-DD)
validate_date() {
    if [[ $1 =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
        if date -d "$1" >/dev/null 2>&1 || date -j -f "%Y-%m-%d" "$1" >/dev/null 2>&1; then
            return 0
        fi
    fi
    return 1
}

echo -e "${BLUE}Leeft Full Update & Deploy Pipeline${NC}"
echo "========================================"
echo ""
echo "Enter the date range for TrainHeroic data download:"
echo ""

# Prompt for start date (required)
while true; do
    read -p "Start date (YYYY-MM-DD): " START_DATE

    if [ -z "$START_DATE" ]; then
        error "Start date is required."
        continue
    fi

    if validate_date "$START_DATE"; then
        break
    else
        error "Invalid date format. Please use YYYY-MM-DD format."
    fi
done

# Prompt for end date (required)
while true; do
    read -p "End date (YYYY-MM-DD): " END_DATE

    if [ -z "$END_DATE" ]; then
        error "End date is required."
        continue
    fi

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
log "Starting full update pipeline for date range: ${START_DATE} to ${END_DATE}"
echo ""

# Change to apps/data for data pipeline commands
cd apps/data

# Step 1: Download TrainHeroic data
log "Step 1/10: Downloading TrainHeroic data..."
if bun trainheroic:download "startDate=${START_DATE}&endDate=${END_DATE}" "$TRAINHEROIC_SESSION_TOKEN"; then
    success "TrainHeroic data downloaded"
else
    error "Failed to download TrainHeroic data"
    exit 1
fi

# Step 2: Compile lifting data
log "Step 2/10: Compiling lifting data..."
if bun compile:lifting; then
    success "Lifting data compiled"
else
    error "Failed to compile lifting data"
    exit 1
fi

# Step 3: Combine lifting data
log "Step 3/10: Combining lifting data..."
if bun combine:lifting; then
    success "Lifting data combined"
else
    error "Failed to combine lifting data"
    exit 1
fi

# Step 4: Download Fitbit data (auto-refreshes token if expired)
log "Step 4/10: Downloading Fitbit data..."
if bun fitbit:download; then
    success "Fitbit data downloaded"
else
    warn "Failed to download Fitbit data - if token expired, run: bun fitbit:auth"
fi

# Step 5: Process Fitbit data
log "Step 5/10: Processing Fitbit data..."
if bun fitbit:process; then
    success "Fitbit data processed"
else
    warn "Failed to process Fitbit data - continuing with remaining steps"
fi

# Step 6: Compile cardio data
log "Step 6/10: Compiling cardio data..."
if bun compile:cardio; then
    success "Cardio data compiled"
else
    error "Failed to compile cardio data"
    exit 1
fi

# Step 7: Compile all data
log "Step 7/10: Compiling all data..."
if bun compile:all; then
    success "All data compiled"
else
    error "Failed to compile all data"
    exit 1
fi

# Step 8: Combine all data
log "Step 8/10: Combining all data..."
if bun combine:all; then
    success "All data combined"
else
    error "Failed to combine all data"
    exit 1
fi

# Return to project root for upload and deploy
cd "$PROJECT_ROOT"

# Step 9: Upload to Google Cloud Storage
log "Step 9/10: Uploading to Google Cloud Storage..."
if ./scripts/upload.sh; then
    success "Data uploaded to GCS"
else
    error "Failed to upload to GCS"
    exit 1
fi

# Step 10: Build and deploy to Firebase
log "Step 10/10: Building and deploying to Firebase..."
if pnpm deploy:web; then
    success "Deployed to Firebase"
else
    error "Failed to deploy"
    exit 1
fi

echo ""
success "Full update & deploy pipeline completed!"
log "Data range processed: ${START_DATE} to ${END_DATE}"
