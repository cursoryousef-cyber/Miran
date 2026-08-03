#!/bin/sh

# Xcode Cloud Pre-Xcodebuild Script
# Verifies Xcode version, iOS SDK, and build configurations before archive

echo "=== Xcode Cloud: Pre-Xcodebuild Audit Information ==="
echo "Xcode Version:"
xcodebuild -version
echo "Xcode Selected Path:"
xcode-select -p
echo "Target Platform & SDK:"
xcrun --sdk iphoneos --show-sdk-version
xcrun --sdk iphoneos --show-sdk-path

echo "=== Environment Flags ==="
echo "CI_XCODE_CLOUD: $CI_XCODE_CLOUD"
echo "CI_BRANCH: $CI_BRANCH"
echo "CI_BUILD_NUMBER: $CI_BUILD_NUMBER"

echo "Pre-xcodebuild preparation finished cleanly."
