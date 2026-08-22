#!/bin/bash
# hello-embedded — build script (macOS + Linux)
# Usage: ./build.sh [dev|canary|prod]
#   dev     — unsigned dev build (default)
#   canary  — Developer ID-signed canary build (macOS) / unsigned (Linux)
#   prod    — Developer ID-signed stable build (macOS) / unsigned (Linux)
#
# macOS release builds require ELECTROBUN_DEVELOPER_ID plus one complete set
# of Hutch notarization credentials. Hutch signs, notarizes, staples, and
# packages both the inner payload and outer self-extractor.
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
        echo -e "  ${YELLOW}canary${RESET}  — signed and notarized canary build"
        echo -e "  ${RED}prod${RESET}    — signed and notarized stable build"
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
bunx vite build

# Map our env labels to Hutch's Electrobun environments.
case "$ENV" in
    canary) CHANNEL="canary" ;;
    prod)   CHANNEL="stable" ;;
    *)      CHANNEL="dev" ;;
esac

if [ "$ENV" != "dev" ] && [ "$HOST_OS" = "Darwin" ]; then
    if [ -z "${ELECTROBUN_DEVELOPER_ID:-}" ]; then
        echo -e "${RED}✗${RESET} ELECTROBUN_DEVELOPER_ID is required"
        exit 1
    fi

    if [ "${ELECTROBUN_SKIP_NOTARIZATION:-0}" != "1" ]; then
        API_CREDENTIALS=false
        APPLE_ID_CREDENTIALS=false

        if [ -n "${ELECTROBUN_APPLEAPIKEYPATH:-}" ] && \
           [ -n "${ELECTROBUN_APPLEAPIKEY:-}" ] && \
           [ -n "${ELECTROBUN_APPLEAPIISSUER:-}" ]; then
            API_CREDENTIALS=true
        fi

        if [ -n "${ELECTROBUN_APPLEID:-}" ] && \
           [ -n "${ELECTROBUN_APPLEIDPASS:-}" ] && \
           [ -n "${ELECTROBUN_TEAMID:-}" ]; then
            APPLE_ID_CREDENTIALS=true
        fi

        if [ "$API_CREDENTIALS" != "true" ] && \
           [ "$APPLE_ID_CREDENTIALS" != "true" ]; then
            echo -e "${RED}✗${RESET} Hutch notarization credentials are required"
            echo "  Set the complete ELECTROBUN_APPLEAPI* or ELECTROBUN_APPLEID* group."
            echo "  Use ELECTROBUN_SKIP_NOTARIZATION=1 only for diagnostic builds."
            exit 1
        fi
    fi
fi

echo -e "${BLUE}→${RESET} Building app bundle..."
bunx electrobun build --env="$CHANNEL"

# Hutch performs release signing and notarization. Verify its output here
# without changing the packaged artifacts.
if [ "$ENV" != "dev" ] && [ "$HOST_OS" = "Darwin" ]; then
    APP=$(find build -maxdepth 2 -name "*.app" -path "*${CHANNEL}*" 2>/dev/null | head -1)
    if [ -z "$APP" ]; then
        echo -e "${RED}✗${RESET} Could not find signed .app bundle"
        exit 1
    fi
    DMG=$(find artifacts -maxdepth 1 -name "*.dmg" -print0 2>/dev/null | xargs -0 ls -t 2>/dev/null | head -1)
    if [ -z "$DMG" ]; then
        echo -e "${RED}✗${RESET} Could not find signed DMG"
        exit 1
    fi
    codesign --verify --deep --strict --verbose=2 "$APP"

    if [ "${ELECTROBUN_SKIP_NOTARIZATION:-0}" != "1" ]; then
        xcrun stapler validate "$APP"
        xcrun stapler validate "$DMG"
        spctl --assess --type execute --verbose=2 "$APP"
        spctl --assess --type install --verbose=2 "$DMG"
    fi
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
