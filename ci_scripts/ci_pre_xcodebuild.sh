#!/bin/sh

# Xcode Cloud / GitHub Actions Pre-Xcodebuild Script
# Dynamically detects installed Xcode versions on the runner, audits active SDK, and prints required environment details.

echo "=== GitHub Actions Runner Applications Audit ==="
ls -d /Applications/Xcode*.app /Applications/*.app 2>/dev/null || ls /Applications

# 1. Dynamically select the newest installed Xcode on the runner
NEWEST_XCODE=$(ls -d /Applications/Xcode*.app 2>/dev/null | sort -V | tail -n 1)

if [ -n "$NEWEST_XCODE" ]; then
    echo ""
    echo "Selecting Newest Installed Xcode on Runner: $NEWEST_XCODE"
    sudo xcode-select -s "$NEWEST_XCODE/Contents/Developer" 2>/dev/null || xcode-select -s "$NEWEST_XCODE/Contents/Developer" 2>/dev/null || true
fi

# 2. Print exact runner audit details
echo ""
echo "=== xcodebuild -version ==="
xcodebuild -version

echo ""
echo "=== xcode-select -p ==="
xcode-select -p

echo ""
echo "=== xcrun --sdk iphoneos --show-sdk-version ==="
SDK_VERSION=$(xcrun --sdk iphoneos --show-sdk-version 2>/dev/null || echo "")
echo "$SDK_VERSION"

# 3. Validate that a valid iOS SDK is available on the runner
if [ -z "$SDK_VERSION" ]; then
    echo "=========================================================================="
    echo "❌ ERROR: No valid iOS SDK version found on this runner."
    echo "   Action: Halting build immediately before Archive/Upload."
    echo "=========================================================================="
    exit 1
fi

echo ""
echo "GitHub Actions Runner SDK Audit completed successfully. Proceeding with build."
