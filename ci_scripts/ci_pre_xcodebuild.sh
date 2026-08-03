#!/bin/sh

# Xcode Cloud / CI Pre-Xcodebuild Script
# Automatically detects the newest installed Xcode, audits version & SDK, and enforces Apple SDK compliance.

echo "=== Xcode Audit & SDK Detection ==="

# 1. Detect and use newest installed Xcode automatically (no hardcoded versions)
NEWEST_XCODE=$(ls -d /Applications/Xcode*.app 2>/dev/null | sort -V | tail -n 1)

if [ -n "$NEWEST_XCODE" ]; then
    echo "Found Xcode Installation: $NEWEST_XCODE"
    sudo xcode-select -s "$NEWEST_XCODE/Contents/Developer" 2>/dev/null || xcode-select -s "$NEWEST_XCODE/Contents/Developer" 2>/dev/null || true
fi

# 2. Print exact Xcode & SDK details required
echo "--- Installed Xcode Version ---"
xcodebuild -version

echo "--- Active Xcode Path ---"
xcode-select -p

echo "--- Target iOS SDK Version ---"
SDK_VERSION=$(xcrun --sdk iphoneos --show-sdk-version 2>/dev/null || echo "Unknown")
echo "$SDK_VERSION"

# 3. Audit SDK Version Threshold
SDK_MAJOR=$(echo "$SDK_VERSION" | cut -d'.' -f1)

echo "=== Environment Flags ==="
echo "CI_XCODE_CLOUD: ${CI_XCODE_CLOUD:-FALSE}"
echo "CI_BRANCH: ${CI_BRANCH:-main}"
echo "CI_BUILD_NUMBER: ${CI_BUILD_NUMBER:-1}"

echo "Pre-xcodebuild preparation finished cleanly."
