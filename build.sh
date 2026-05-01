#!/bin/bash
# hello-embedded — build script
# Usage: ./build.sh [dev|canary|prod]
#   dev     — unsigned dev build (default)
#   canary  — ad-hoc signed canary build
#   prod    — ad-hoc signed production build
#
# Ad-hoc signing (codesign --sign -) gives the app a stable code identity on
# this machine so macOS doesn't re-prompt for permissions on each launch.
# Other Macs will still flag the bundle as unidentified — for distribution we
# need Apple Developer ID + notarization, not handled here.

set -e
cd "$(dirname "$0")"

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

# Ad-hoc sign canary/prod. The .app path is build/<channel>-<platform>/...app
# (electrobun adds the channel suffix to the bundle name for non-stable).
if [ "$ENV" != "dev" ]; then
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
ls -lhd build/*"$CHANNEL"*/*.app 2>/dev/null || true
