#!/bin/bash

# Leeft Data Refresh
# Re-hydrates the TrainHeroic archive, recompiles from whatever is already on disk, and uploads
# the artifacts to GCS.
# Downloads nothing (TrainHeroic, Fitbit, Firestore) and does not deploy —
# use pipeline.sh when you need fresh source data.
#
# Usage:
#   ./refresh.sh   - Recompile + push (wired to `pnpm refresh`)

set -e  # Exit on any error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
cd "$PROJECT_ROOT"

source "$SCRIPT_DIR/steps.sh"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
step_init 7

echo ""
echo -e "${BOLD}LEEFT DATA REFRESH${NC}"
echo -e "${DIM}recompile from existing downloads → upload to GCS${NC}"
echo -e "${DIM}timestamp ${TIMESTAMP}${NC}"

cd apps/data
# Same reasoning as pipeline.sh: the archive's enrichment lives on gitignored disk, so re-applying
# it before compiling is what makes the corrections survive a restore. Idempotent, reports 0.
run_step "TrainHeroic hydrate" "bun trainheroic:hydrate"
run_step "Compile lifting"    "bun compile:lifting"
run_step "Combine lifting"    "bun combine:lifting"
run_step "Compile cardio"     "bun compile:cardio"
run_step "Compile all"        "bun compile:all"
run_step "Combine all"        "bun combine:all"

cd "$PROJECT_ROOT"
run_step "Upload to GCS" "./scripts/shell/upload.sh $TIMESTAMP"

step_summary "Refresh complete" "timestamp ${TIMESTAMP} · latest.json published"
