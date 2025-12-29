#!/bin/bash

# Daily Fitness Data Sync Pipeline
# Automates the complete data processing workflow with today's date range

set -e  # Exit on any error

# Ensure we are running from the project root or can find the apps/data directory
if [ -d "apps/data" ]; then
    cd apps/data
elif [ -d "../apps/data" ]; then
    cd ../apps/data
else 
    echo "Error: Could not locate apps/data directory"
    exit 1
fi

# Color output for better visibility
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
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
        # Check if it's a valid date
        if date -d "$1" >/dev/null 2>&1 || date -j -f "%Y-%m-%d" "$1" >/dev/null 2>&1; then
            return 0
        fi
    fi
    return 1
}

# Prompt for date range
echo -e "${BLUE}Fitness Data Sync Pipeline${NC}"
echo "Enter the date range for TrainHeroic data download:"

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
        # Check if end date is after start date
        if [[ "$END_DATE" > "$START_DATE" ]] || [[ "$END_DATE" == "$START_DATE" ]]; then
            break
        else
            error "End date must be on or after start date."
        fi
    else
        error "Invalid date format. Please use YYYY-MM-DD format."
    fi
done

log "Starting daily sync pipeline for date range: ${START_DATE} to ${END_DATE}"

# Step 1: Download TrainHeroic data
log "Step 1/9: Downloading TrainHeroic data..."
if bun trainheroic:download "startDate=${START_DATE}&endDate=${END_DATE}" 927d6079e88b0afd9f95470510f58bc2; then
    success "TrainHeroic data downloaded"
else
    error "Failed to download TrainHeroic data"
    exit 1
fi

# Step 2: Compile lifting data
log "Step 2/9: Compiling lifting data..."
if bun compile:lifting; then
    success "Lifting data compiled"
else
    error "Failed to compile lifting data"
    exit 1
fi

# Step 3: Combine lifting data
log "Step 3/9: Combining lifting data..."
if bun combine:lifting; then
    success "Lifting data combined"
else
    error "Failed to combine lifting data"
    exit 1
fi

# Step 4: Authenticate with Fitbit
log "Step 4/9: Authenticating with Fitbit..."
if bun fitbit:auth; then
    success "Fitbit authentication complete"
else
    warn "Fitbit authentication failed - continuing with remaining steps"
fi

# Step 5: Download Fitbit data
log "Step 5/9: Downloading Fitbit data..."
if bun fitbit:download; then
    success "Fitbit data downloaded"
else
    warn "Failed to download Fitbit data - continuing with remaining steps"
fi

# Step 6: Process Fitbit data
log "Step 6/9: Processing Fitbit data..."
if bun fitbit:process; then
    success "Fitbit data processed"
else
    warn "Failed to process Fitbit data - continuing with remaining steps"
fi

# Step 7: Compile cardio data
log "Step 7/9: Compiling cardio data..."
if bun compile:cardio; then
    success "Cardio data compiled"
else
    error "Failed to compile cardio data"
    exit 1
fi

# Step 8: Compile all data
log "Step 8/9: Compiling all data..."
if bun compile:all; then
    success "All data compiled"
else
    error "Failed to compile all data"
    exit 1
fi

# Step 9: Combine all data
log "Step 9/9: Combining all data..."
if bun combine:all; then
    success "All data combined"
else
    error "Failed to combine all data"
    exit 1
fi

success "Daily sync pipeline completed successfully!"
log "Data range processed: ${START_DATE} to ${END_DATE}"
