#!/bin/bash

# Leeft Data Pipeline
# Consolidated script for data sync and optional deployment
#
# Usage:
#   ./pipeline.sh                  - Full pipeline + deploy (default)
#   ./pipeline.sh --sync-only      - Data sync only (no deploy)
#   ./pipeline.sh --deploy         - Full pipeline + deploy (explicit)
#   ./pipeline.sh --skip-download  - Skip the Fitbit download
#
# TrainHeroic is no longer downloaded here. That account stopped receiving data, and its archive
# under data/download/trainheroic/workouts is now enriched in place by `bun trainheroic:hydrate`
# (the readiness survey from the account export, four corrected workout titles, one reconstructed
# session). A download would overwrite those files with the API's version and silently drop all of
# it, so the step was removed rather than left as a trap. To fetch from TrainHeroic again, run
# `bun trainheroic:download '<range>' "$TRAINHEROIC_SESSION_TOKEN"` by hand and follow it with
# `bun trainheroic:hydrate`.

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

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

if [ "$SKIP_DOWNLOAD" = true ]; then
    MODE="compile only, skipping the Fitbit download"
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

# Calculate total steps based on mode
TOTAL=7
if [ "$SKIP_DOWNLOAD" = false ]; then
    TOTAL=$((TOTAL + 1))
fi
if [ "$DEPLOY" = true ]; then
    TOTAL=$((TOTAL + 2))
fi
step_init $TOTAL

# Change to apps/data for data pipeline commands
cd apps/data

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
if [ "$DEPLOY" = true ]; then
    NOTE="timestamp ${TIMESTAMP} · deployed to Firebase"
fi
step_summary "Pipeline complete" "$NOTE"

if [ "$DEPLOY" = false ]; then
    echo -e "${DIM}   run with --deploy to upload and deploy${NC}"
    echo ""
fi
