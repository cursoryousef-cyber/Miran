#!/bin/sh

# Xcode Cloud Post-Xcodebuild Script
# Runs after build/archive completes for TestFlight and App Store distribution

echo "=== Xcode Cloud: Post-Xcodebuild Execution ==="
if [ "$CI_WORKFLOW" = "TestFlight" ] || [ "$CI_XCODE_CLOUD" = "TRUE" ]; then
    echo "Archive completed successfully. Xcode Cloud will distribute to TestFlight and App Store Connect."
fi

echo "Post-xcodebuild completed."
