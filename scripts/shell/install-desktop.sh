#!/bin/bash

# Installs the built desktop app into /Applications.
#
# `tauri build` only writes the bundle into src-tauri/target — nothing copies it out (the
# Finder window that flashes up mid-build is create-dmg styling the disk image, not an
# installer). Without this step the installed app stays at whatever version was last dragged
# out of the dmg by hand, which silently ships stale static pages.

set -e  # Exit on any error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

BUILT="$PROJECT_ROOT/apps/web/src-tauri/target/release/bundle/macos/Leeft.app"
DEST="/Applications/Leeft.app"

if [ ! -d "$BUILT" ]; then
    echo "No built app at $BUILT — run pnpm build:desktop first" >&2
    exit 1
fi

# A running app can't be replaced cleanly, so quit it and wait for it to actually exit.
# Guarded by pgrep because `quit app` would otherwise launch it just to shut it down.
if pgrep -x Leeft >/dev/null; then
    echo "Quitting the running Leeft app..."
    osascript -e 'quit app "Leeft"'
    for _ in $(seq 1 25); do
        pgrep -x Leeft >/dev/null || break
        sleep 0.2
    done
fi

rm -rf "$DEST"
cp -R "$BUILT" "$DEST"

echo "Installed $DEST"
