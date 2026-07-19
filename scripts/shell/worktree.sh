#!/usr/bin/env bash
# Worktrees with dedicated dev ports for parallel Claude Code sessions.
#   pnpm wt <branch> [base]   create .claude/worktrees/<branch> (base defaults to main; reuses branch if it exists)
#   pnpm wt --here            adopt the current worktree (e.g. one Claude's built-in isolation created): port + envs + install
set -euo pipefail

main_root="$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")"

next_free_port() {
    local used="" wt p port=3001
    while read -r wt; do
        p="$(cat "$wt/.dev-port" 2>/dev/null || true)"
        if [ -n "$p" ]; then used="$used $p"; fi
    done < <(git worktree list --porcelain | awk '/^worktree /{sub(/^worktree /, ""); print}')
    while [[ " $used " == *" $port "* ]]; do port=$((port + 1)); done
    echo "$port"
}

setup_worktree() { # $1 = worktree root
    local wt="$1" f port
    if [ ! -f "$wt/.dev-port" ]; then
        next_free_port > "$wt/.dev-port"
    fi
    port="$(cat "$wt/.dev-port")"
    # gitignored env files don't travel with a worktree
    for f in apps/web/.env.local apps/data/.env; do
        if [ -f "$main_root/$f" ] && [ ! -f "$wt/$f" ]; then
            cp "$main_root/$f" "$wt/$f"
        fi
    done
    (cd "$wt" && pnpm install --silent)
    echo ""
    echo "worktree: $wt"
    echo "port:     $port  ->  http://localhost:$port"
}

if [ "${1:-}" = "--here" ]; then
    wt="$(git rev-parse --show-toplevel)"
    if [ "$wt" = "$main_root" ]; then
        echo "error: --here must run inside a worktree, not the main checkout" >&2
        exit 1
    fi
    setup_worktree "$wt"
    exit 0
fi

branch="${1:?usage: pnpm wt <branch> [base] | pnpm wt --here}"
base="${2:-main}"
wt_path="$main_root/.claude/worktrees/${branch//\//-}"

if [ -e "$wt_path" ]; then
    echo "error: $wt_path already exists" >&2
    exit 1
fi

mkdir -p "$main_root/.claude/worktrees"
if git show-ref --verify --quiet "refs/heads/$branch"; then
    git worktree add "$wt_path" "$branch"
else
    git worktree add -b "$branch" "$wt_path" "$base"
fi

setup_worktree "$wt_path"
echo ""
echo "  cd $wt_path && claude"
