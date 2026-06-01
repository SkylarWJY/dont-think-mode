#!/bin/bash
# Wrapper so launchd (which runs with a bare PATH) can find node.
NODE="$(command -v node 2>/dev/null || true)"
# Fall back to the newest nvm-installed node (survives version bumps).
[ -x "$NODE" ] || NODE="$(ls -t "$HOME"/.nvm/versions/node/*/bin/node 2>/dev/null | head -1)"
[ -x "$NODE" ] || { echo "✗ 找不到 node" >&2; exit 1; }

DIR="$(cd "$(dirname "$0")/.." && pwd)"
exec "$NODE" "$DIR/scripts/to-obsidian.mjs" "$@"
