#!/bin/bash
# Build the static iOS bundle (./out) for the Capacitor shell.
#
# The /api routes can't be statically exported, so we move them aside for the
# export build — the native app calls the Vercel-hosted /api instead (via
# NEXT_PUBLIC_API_BASE). Routes are always restored, even on failure.
set -e
DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DIR"

API_BASE_URL="${NEXT_PUBLIC_API_BASE:-https://skylar-life-os.vercel.app}"
TMP="$(mktemp -d)"

restore() { [ -d "$TMP/api" ] && rm -rf app/api && mv "$TMP/api" app/api; }
trap restore EXIT

if [ -d app/api ]; then mv app/api "$TMP/api"; fi

echo "▸ Static-exporting (API_BASE=$API_BASE_URL) …"
BUILD_TARGET=capacitor NEXT_PUBLIC_API_BASE="$API_BASE_URL" npx next build

echo "✓ Static export ready in ./out"
echo "  next: npx cap sync ios   (needs Xcode + CocoaPods)"
