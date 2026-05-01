#!/bin/bash
# hello-embedded — run script (macOS + Linux)
# Usage: ./run.sh [--dev|--canary|--prod|--clean]
#   (no args) — build dev bundle and run it
#   --dev     — vite HMR + electrobun watch (hot reload)
#   --canary  — build canary and launch it
#   --prod    — build prod and launch it
#   --clean   — nuke build artifacts
#
# macOS: launches via `open <APP>.app` (background launch, returns to shell).
# Linux: execs the launcher binary directly from build/<channel>-linux-<arch>/.
#        On the bare-DRM kiosk Pi, launching this way grabs DRM master and
#        takes over the panel until the launcher exits — exactly what you
#        want for TTY-mode dev loops. For "real" installs (with optional
#        systemd kiosk service), use the installer artifact in artifacts/.

set -e
cd "$(dirname "$0")"

HOST_OS="$(uname -s)"
[ -d node_modules ] || bun install

# Build the requested channel via build.sh, then launch the resulting bundle.
build_and_run() {
    local ENV="$1"
    local CHANNEL
    case "$ENV" in
        canary) CHANNEL="canary" ;;
        prod)   CHANNEL="stable" ;;
    esac

    echo "→ building and launching $ENV bundle"
    ./build.sh "$ENV"

    case "$HOST_OS" in
        Darwin)
            local APP
            APP=$(find build -maxdepth 2 -name "*.app" -path "*${CHANNEL}*" 2>/dev/null | head -1)
            if [ -z "$APP" ]; then
                echo "⚠ Could not find .app bundle for $ENV"
                exit 1
            fi
            echo "→ launching $APP"
            open "$APP"
            ;;
        Linux)
            # On Linux the canary/prod build folder is a *staging area for the
            # installer*, not a runnable app — the build deliberately replaces
            # bin/launcher with the self-extractor (matches macOS's .app
            # self-install pattern). So to run, we extract the Setup.tar.gz
            # installer, run it with --no-kiosk (TTY-mode dev install — skips
            # systemd auto-start), and exec the now-installed launcher.
            local SETUP
            SETUP=$(find artifacts -maxdepth 1 -name "*-linux-*-Setup.tar.gz" -path "*${CHANNEL}*" 2>/dev/null | head -1)
            if [ -z "$SETUP" ]; then
                echo "⚠ Could not find installer tarball for $ENV (looked under artifacts/)"
                exit 1
            fi

            local STAGE
            STAGE="$(mktemp -d)"
            trap 'rm -rf "$STAGE"' EXIT
            echo "→ extracting $SETUP to $STAGE"
            tar -xzf "$SETUP" -C "$STAGE"

            echo "→ running installer (--no-kiosk: TTY-mode dev install)"
            "$STAGE/installer" --no-kiosk

            # Identifier comes straight from electrobun.config.ts — bun reads
            # the TS file natively. Channel is the electrobun channel name
            # ("canary" or "stable"), not our env label. Path layout matches
            # the kiosk install (Phase A): ~/.local/share/<id>/<channel>/current/bin/launcher.
            local IDENT
            IDENT=$(bun -e "console.log((await import('./electrobun.config.ts')).default.app.identifier)" 2>/dev/null)
            if [ -z "$IDENT" ]; then
                echo "⚠ Could not read identifier from electrobun.config.ts"
                exit 1
            fi
            local LAUNCHER="$HOME/.local/share/$IDENT/$CHANNEL/current/bin/launcher"
            if [ ! -x "$LAUNCHER" ]; then
                echo "⚠ Installer ran but launcher not found at $LAUNCHER"
                exit 1
            fi
            echo "→ launching $LAUNCHER"
            "$LAUNCHER"
            ;;
        *)
            echo "⚠ Unsupported host OS: $HOST_OS"
            exit 1
            ;;
    esac
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
