#!/bin/sh

# Xcode Cloud / CI Pre-Xcodebuild Script
# Dynamically detects the newest installed Xcode, prints required version details, and enforces SDK compliance guard.

echo "=== Xcode Audit & Dynamic SDK Detection ==="

# 1. Remove all hardcoded Xcode paths and detect the newest installed Xcode automatically
NEWEST_XCODE=$(ls -d /Applications/Xcode*.app 2>/dev/null | sort -V | tail -n 1)

if [ -n "$NEWEST_XCODE" ]; then
    echo "Auto-detected Newest Xcode: $NEWEST_XCODE"
    sudo xcode-select -s "$NEWEST_XCODE/Contents/Developer" 2>/dev/null || xcode-select -s "$NEWEST_XCODE/Contents/Developer" 2>/dev/null || true
fi

# 2. Print exact Xcode and SDK information required
echo "=== xcodebuild -version ==="
xcodebuild -version

echo "=== xcode-select -p ==="
xcode-select -p

echo "=== xcrun --sdk iphoneos --show-sdk-version ==="
SDK_VERSION=$(xcrun --sdk iphoneos --show-sdk-version 2>/dev/null || echo "0.0")
echo "$SDK_VERSION"

# 3. Parse Xcode and SDK Major Versions
XCODE_FULL_VERSION=$(xcodebuild -version 2>/dev/null | head -n 1 | awk '{print $2}')
XCODE_MAJOR=$(echo "$XCODE_FULL_VERSION" | cut -d'.' -f1)
SDK_MAJOR=$(echo "$SDK_VERSION" | cut -d'.' -f1)

# 4. Strict Version Guard: Stop workflow immediately if Xcode 26+ / iOS 26+ SDK is unavailable
if [ -n "$XCODE_MAJOR" ] && [ "$XCODE_MAJOR" -lt 26 ]; then
    echo "=========================================================================="
    echo "❌ ERROR: Xcode 26+ / iOS 26+ SDK is required for App Store Connect submission."
    echo "   Current Runner Xcode Version: $XCODE_FULL_VERSION (Major: $XCODE_MAJOR)"
    echo "   Current Runner iOS SDK Version: $SDK_VERSION (Major: $SDK_MAJOR)"
    echo "   Action: Halting CI build immediately. Archive and Upload aborted."
    echo "=========================================================================="
    exit 1
fi

echo "Pre-xcodebuild preparation finished cleanly."
