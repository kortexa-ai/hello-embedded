#!/bin/bash
# hello-embedded — run script
# Usage: ./run.sh [--dev|--canary|--prod|--clean]
#   (no args) — build dev bundle and run it
#   --dev     — vite HMR + electrobun watch (hot reload)
#   --canary  — build canary and launch it
#   --prod    — build prod and launch it
#   --clean   — nuke build artifacts

set -e
cd "$(dirname "$0")"

[ -d node_modules ] || bun install

# Build the requested channel via build.sh, then `open` the resulting .app.
build_and_run() {
    local ENV="$1"
    local CHANNEL
    case "$ENV" in
        canary) CHANNEL="canary" ;;
        prod)   CHANNEL="stable" ;;
    esac

    echo "→ building and launching $ENV bundle"
    ./build.sh "$ENV"

    local APP
    APP=$(find build -maxdepth 2 -name "*.app" -path "*${CHANNEL}*" 2>/dev/null | head -1)
    if [ -z "$APP" ]; then
        echo "⚠ Could not find .app bundle for $ENV"
        exit 1
    fi
    echo "→ launching $APP"
    open "$APP"
}

case "${1:---run}" in
    --dev)
        echo "→ vite HMR + electrobun dev (hot reload)"
        bun run dev:hmr
        ;;
    --canary)
        build_and_run canary
        ;;
    --prod)
        build_and_run prod
        ;;
    --clean)
        echo "→ cleaning build artifacts"
        rm -rf dist build node_modules/.vite
        echo "done"
        ;;
    --run)
        echo "→ building and running dev bundle"
        ./build.sh dev
        bun run start
        ;;
    *)
        echo "Usage: ./run.sh [--dev|--canary|--prod|--clean]"
        echo "  (no args)  — build dev bundle and run"
        echo "  --dev      — vite HMR + electrobun watch"
        echo "  --canary   — build canary and launch"
        echo "  --prod     — build prod and launch"
        echo "  --clean    — nuke build artifacts"
        exit 1
        ;;
esac
