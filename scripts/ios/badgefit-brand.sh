#!/bin/bash
# Turns the iPhone project into BadgeFit, on the Mac runner, just before it is archived
# (.github/workflows/badgefit-testflight.yml). Done at build time, not committed, so the iOS
# project stays the same as openGym's and upstream changes keep merging cleanly.
#
#   scripts/ios/badgefit-brand.sh <build number>
#
# What changes: the bundle id and everything named after it, the name on the Home Screen and in
# the permission texts, the app icon, the links domain, the version (1.0.0) and the build number.
set -euo pipefail
BUILD=${1:?build number}
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
APP="$ROOT/frontend/ios/App"
OLD_ID='ch.opengym.app'
NEW_ID='au.com.badgefit.app'

# The bundle id, and what carries it: background task ids, URL names (Pods and build output left alone).
grep -rIl --exclude-dir=Pods --exclude-dir=build --exclude-dir=public "$OLD_ID" "$APP" | while read -r f; do
  sed -i '' "s/ch\\.opengym\\.app/$NEW_ID/g" "$f"
done

PLIST="$APP/App/Info.plist"
ENT="$APP/App/App.entitlements"
sed -i '' 's/openGym/BadgeFit/g' "$PLIST"
/usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName BadgeFit" "$PLIST"
# The name iOS uses in its own dialogs ("BadgeFit" Wants to Use ... to Sign In), not "App".
/usr/libexec/PlistBuddy -c "Set :CFBundleName BadgeFit" "$PLIST"
# badgefit:// links: the website hands the app its sign-in this way (views/LinkApp.jsx).
/usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0:CFBundleURLSchemes: string badgefit" "$PLIST"
# Talking to Hayden: the microphone and the phone's speech recognition, said in BadgeFit's words.
/usr/libexec/PlistBuddy -c "Set :NSMicrophoneUsageDescription Used to hear you when you talk to Hayden, your coach, and to record the sound of a set you film." "$PLIST"
/usr/libexec/PlistBuddy -c "Add :NSSpeechRecognitionUsageDescription string Used to understand what you say to Hayden, your coach, so you can talk instead of typing." "$PLIST"
# Hayden with the screen locked (RunCuesPlugin.swift): the app may play audio in the background.
/usr/libexec/PlistBuddy -c "Add :UIBackgroundModes: string audio" "$PLIST"
# Links to the BadgeFit app domain open in the app.
sed -i '' 's/applinks:opengym\.ch/applinks:app.badgefit.com.au/' "$ENT"
# No widgets or watch app in this build, so nothing shares the App Group yet: left out, so the
# first signed build does not depend on a group being registered.
/usr/libexec/PlistBuddy -c "Delete :com.apple.security.application-groups" "$ENT" 2>/dev/null || true

# BadgeFit's own plugins (scripts/ios/badgefit/*.swift), added to the app for the build.
ruby "$ROOT/scripts/ios/badgefit/add-webauth.rb"

# The launch screen: the shield on navy, the same as the loading screen after it, so the app
# opens on one picture (openGym's dumbbell flashed in between).
for f in "$APP/App/Assets.xcassets/Splash.imageset/"*.png; do cp "$ROOT/scripts/ios/badgefit/Splash-2732.png" "$f"; done
sed -i '' 's/<color key="backgroundColor" systemColor="systemBackgroundColor"\/>/<color key="backgroundColor" red="0.051" green="0.106" blue="0.2" alpha="1" colorSpace="custom" customColorSpace="sRGB"\/>/' "$APP/App/Base.lproj/LaunchScreen.storyboard"
# The shield on navy, 1024 px, no transparency.
cp "$ROOT/scripts/ios/badgefit/AppIcon-1024.png" "$APP/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png"

PBX="$APP/App.xcodeproj/project.pbxproj"
sed -i '' -E "s/MARKETING_VERSION = [^;]+;/MARKETING_VERSION = 1.0.0;/g; s/CURRENT_PROJECT_VERSION = [^;]+;/CURRENT_PROJECT_VERSION = $BUILD;/g" "$PBX"

echo "BadgeFit $NEW_ID 1.0.0 ($BUILD)"
grep -c "$NEW_ID" "$PBX"
/usr/libexec/PlistBuddy -c "Print :CFBundleDisplayName" "$PLIST"
