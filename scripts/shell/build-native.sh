#!/bin/bash

# Regenerates the Xcode project and compiles the iOS app.
#
# The regen is the point: `Leeft.xcodeproj` is generated and gitignored, and `project.yml`
# references `Sources` as a whole directory — so a newly added file is invisible to Xcode until
# xcodegen runs, surfacing as `cannot find 'X' in scope` for a file that plainly exists. Running
# both halves together is what keeps that from being a debugging session.
#
# Builds for the simulator, which needs no provisioning profile and no device attached, so this
# stays a pure "does it compile" check. Running on hardware is still Xcode's ▶︎.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NATIVE_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")/apps/native"

if ! command -v xcodegen >/dev/null; then
    echo "xcodegen not found — brew install xcodegen" >&2
    exit 1
fi

cd "$NATIVE_DIR"

echo "Regenerating Leeft.xcodeproj..."
xcodegen

echo "Building for the iOS Simulator..."
xcodebuild \
    -project Leeft.xcodeproj \
    -scheme Leeft \
    -destination 'generic/platform=iOS Simulator' \
    -quiet \
    build

echo "Build succeeded"
