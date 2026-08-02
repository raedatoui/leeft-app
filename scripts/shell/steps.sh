#!/bin/bash

# Shared step printing for the data pipeline scripts (refresh.sh, pipeline.sh).
#
# Usage:
#   source "$SCRIPT_DIR/steps.sh"
#   step_init 7
#   run_step "Compile lifting" "bun compile:lifting"   # failure aborts the run
#   run_step_optional "Fitbit download" "bun fitbit:download" "run: bun fitbit:auth"
#   step_summary "Refresh complete" "timestamp ${TIMESTAMP}"
#
# Exports LEEFT_STEP_FRAMED so the bun CLIs skip their own banner and let the
# step frame here be the only one (see apps/data/src/utils/cli.ts).

export LEEFT_STEP_FRAMED=1

# Color output for better visibility
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
DIM='\033[2m'
BOLD='\033[1m'
NC='\033[0m' # No Color

RULE='──────────────────────────────────────────────────────────────'

STEP=0
TOTAL_STEPS=0
TIMINGS=()
RUN_START=$SECONDS

step_init() {
    TOTAL_STEPS=$1
    STEP=0
    TIMINGS=()
    RUN_START=$SECONDS
}

fmt_time() {
    local s=$1
    if [ "$s" -ge 60 ]; then
        printf "%dm %02ds" $((s / 60)) $((s % 60))
    else
        printf "%ds" "$s"
    fi
}

# Prints the step banner, runs the command, prints a pass/fail footer with elapsed time
# $1 title, $2 command, $3 "optional" to warn-and-continue on failure, $4 hint shown on warn
_run_step() {
    local title="$1"
    local cmd="$2"
    local mode="$3"
    local hint="$4"
    STEP=$((STEP + 1))
    local start=$SECONDS

    echo ""
    printf "${BLUE}${BOLD}▶  [%d/%d] %s${NC}  ${DIM}%s${NC}\n" "$STEP" "$TOTAL_STEPS" "$title" "$cmd"
    echo -e "${DIM}${RULE}${NC}"

    if eval "$cmd"; then
        local elapsed=$((SECONDS - start))
        printf "${GREEN}✓  %s${NC} ${DIM}· $(fmt_time "$elapsed")${NC}\n"
        TIMINGS+=("$title|$elapsed|ok")
        return 0
    fi

    local elapsed=$((SECONDS - start))
    if [ "$mode" = "optional" ]; then
        printf "${YELLOW}⚠  %s failed — continuing${NC}\n" "$title"
        [ -n "$hint" ] && printf "${YELLOW}   %s${NC}\n" "$hint"
        TIMINGS+=("$title|$elapsed|warn")
        return 0
    fi

    echo ""
    printf "${RED}✗  [%d/%d] %s failed${NC}\n" "$STEP" "$TOTAL_STEPS" "$title"
    exit 1
}

run_step() {
    _run_step "$1" "$2"
}

run_step_optional() {
    _run_step "$1" "$2" "optional" "$3"
}

# $1 closing line, $2 optional dim note under it
step_summary() {
    echo ""
    echo -e "${DIM}${RULE}${NC}"
    printf "${GREEN}${BOLD}✓  %s${NC} ${DIM}· $(fmt_time $((SECONDS - RUN_START)))${NC}\n" "$1"
    [ -n "$2" ] && echo -e "${DIM}   $2${NC}"
    echo ""
    local entry title elapsed status
    for entry in "${TIMINGS[@]}"; do
        IFS='|' read -r title elapsed status <<< "$entry"
        if [ "$status" = "warn" ]; then
            printf "${YELLOW}   %-22s %8s  warned${NC}\n" "$title" "$(fmt_time "$elapsed")"
        else
            printf "${DIM}   %-22s %8s${NC}\n" "$title" "$(fmt_time "$elapsed")"
        fi
    done
    echo ""
}
