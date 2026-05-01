#!/bin/bash
# hello-embedded — build script (macOS + Linux)
# Usage: ./build.sh [dev|canary|prod]
#   dev     — unsigned dev build (default)
#   canary  — ad-hoc signed canary build (macOS) / unsigned (Linux)
#   prod    — ad-hoc signed production build (macOS) / unsigned (Linux)
#
# macOS: ad-hoc signing (codesign --sign -) gives the app a stable code
# identity on this machine so macOS doesn't re-prompt for permissions on
# each launch. Other Macs will still flag the bundle as unidentified — for
# distribution we need Apple Developer ID + notarization, not handled here.
#
# Linux: produces a portable bundle at build/<channel>-linux-<arch>/ plus an
# installer artifact at artifacts/. Code signing is a no-op on Linux. To
# install on a Pi: extract the artifact, run ./installer (kiosk mode) or
# ./installer --no-kiosk (TTY-launched dev mode).

set -e
cd "$(dirname "$0")"

# Detect host OS so we can branch on macOS-only steps (codesign).
HOST_OS="$(uname -s)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

ENV="${1:-dev}"
case "$ENV" in
    dev|canary|prod) ;;
    *)
        echo -e "${BOLD}Usage:${RESET} ./build.sh [dev|canary|prod]"
        echo -e "  ${GREEN}dev${RESET}     — unsigned dev build (default)"
        echo -e "  ${YELLOW}canary${RESET}  — ad-hoc signed canary build"
        echo -e "  ${RED}prod${RESET}    — ad-hoc signed production build"
        exit 1
        ;;
esac

echo -e "${BOLD}hello-embedded${RESET} ${DIM}— $ENV build${RESET}"
echo ""

if [ ! -d node_modules ]; then
    echo -e "${BLUE}→${RESET} Installing dependencies..."
    bun install
fi

echo -e "${BLUE}→${RESET} Building frontend..."
npx vite build

# Map our env labels to electrobun's channel names. Electrobun calls the
# release channel 'stable'; we expose it as 'prod' to match the conventional
# triplet dev/canary/prod.
case "$ENV" in
    canary) CHANNEL="canary" ;;
    prod)   CHANNEL="stable" ;;
    *)      CHANNEL="dev" ;;
esac

echo -e "${BLUE}→${RESET} Building app bundle..."
if [ "$CHANNEL" = "dev" ]; then
    npx electrobun build
else
    npx electrobun build --env="$CHANNEL"
fi

# Ad-hoc sign canary/prod on macOS only. The .app path is
# build/<channel>-<platform>/...app (electrobun adds the channel suffix to
# the bundle name for non-stable). Linux builds produce a flat bundle dir
# at build/<channel>-linux-<arch>/ — nothing to codesign.
if [ "$ENV" != "dev" ] && [ "$HOST_OS" = "Darwin" ]; then
    APP=$(find build -maxdepth 2 -name "*.app" -path "*${CHANNEL}*" 2>/dev/null | head -1)
    if [ -z "$APP" ]; then
        echo -e "${RED}✗${RESET} Could not find .app bundle to sign"
        exit 1
    fi
    echo -e "${BLUE}→${RESET} Ad-hoc signing ${BOLD}$APP${RESET}..."
    codesign --force --deep --sign - "$APP"
    codesign --verify --verbose=2 "$APP"
fi

echo ""
echo -e "${GREEN}✓ Build complete:${RESET} ${BOLD}$ENV${RESET}"
case "$HOST_OS" in
    Darwin)
        ls -lhd build/*"$CHANNEL"*/*.app 2>/dev/null || true
        ;;
    Linux)
        # Show the bundle dir + the installer artifact (canary/prod only).
        ls -lhd build/*"$CHANNEL"*-linux-*/ 2>/dev/null || true
        if [ "$ENV" != "dev" ]; then
            ls -lh artifacts/*"$CHANNEL"*-linux-*-Setup.tar.gz 2>/dev/null || true
        fi
        ;;
esac
