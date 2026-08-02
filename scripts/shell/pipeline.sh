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

source "$SCRIPT_DIR/steps.sh"

# Load environment variables
if [ -f "apps/data/.env" ]; then
    TRAINHEROIC_SESSION_TOKEN=$(grep '^TRAINHEROIC_SESSION_TOKEN=' apps/data/.env | cut -d'=' -f2)
fi

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
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

if [ "$SKIP_DOWNLOAD" = true ]; then
    MODE="compile only, skipping downloads"
else
    MODE="download → compile"
fi
if [ "$DEPLOY" = true ]; then
    MODE="${MODE} → upload → deploy"
else
    MODE="${MODE}, no deploy"
fi

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo ""
echo -e "${BOLD}LEEFT DATA PIPELINE${NC}"
echo -e "${DIM}${MODE}${NC}"
if [ "$DEPLOY" = true ]; then
    echo -e "${DIM}timestamp ${TIMESTAMP}${NC}"
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
    echo -e "${DIM}date range ${START_DATE} → ${END_DATE}${NC}"
fi

# Calculate total steps based on mode
TOTAL=7
if [ "$SKIP_DOWNLOAD" = false ]; then
    TOTAL=$((TOTAL + 2))
fi
if [ "$DEPLOY" = true ]; then
    TOTAL=$((TOTAL + 2))
fi
step_init $TOTAL

# Change to apps/data for data pipeline commands
cd apps/data

if [ "$SKIP_DOWNLOAD" = false ]; then
    run_step "TrainHeroic download" "bun trainheroic:download 'startDate=${START_DATE}&endDate=${END_DATE}' \"\$TRAINHEROIC_SESSION_TOKEN\""
fi

# Unconditional (even with --skip-download): it's a cheap read, and skipping it would silently
# drop workouts logged in the app.
run_step "Firestore download" "bun firestore:download"

run_step "Compile lifting" "bun compile:lifting"
run_step "Combine lifting" "bun combine:lifting"

# Auto-refreshes the Fitbit token if expired
if [ "$SKIP_DOWNLOAD" = false ]; then
    run_step_optional "Fitbit download" "bun fitbit:download" "if the token expired, run: bun fitbit:auth"
fi

run_step_optional "Fitbit process" "bun fitbit:process"
run_step "Compile cardio" "bun compile:cardio"
run_step "Compile all" "bun compile:all"
run_step "Combine all" "bun combine:all"

# Return to project root for upload and deploy
cd "$PROJECT_ROOT"

if [ "$DEPLOY" = true ]; then
    run_step "Upload to GCS" "./scripts/shell/upload.sh $TIMESTAMP"
    run_step "Deploy to Firebase" "pnpm deploy:web"
fi

NOTE=""
if [ "$SKIP_DOWNLOAD" = false ]; then
    NOTE="range ${START_DATE} → ${END_DATE}"
fi
if [ "$DEPLOY" = true ]; then
    [ -n "$NOTE" ] && NOTE="${NOTE} · "
    NOTE="${NOTE}timestamp ${TIMESTAMP} · deployed to Firebase"
fi
step_summary "Pipeline complete" "$NOTE"

if [ "$DEPLOY" = false ]; then
    echo -e "${DIM}   run with --deploy to upload and deploy${NC}"
    echo ""
fi
