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
# badgefit:// links: the website hands the app its sign-in this way (views/LinkApp.jsx).
/usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0:CFBundleURLSchemes: string badgefit" "$PLIST"
# Links to the BadgeFit app domain open in the app.
sed -i '' 's/applinks:opengym\.ch/applinks:app.badgefit.com.au/' "$ENT"
# No widgets or watch app in this build, so nothing shares the App Group yet: left out, so the
# first signed build does not depend on a group being registered.
/usr/libexec/PlistBuddy -c "Delete :com.apple.security.application-groups" "$ENT" 2>/dev/null || true

# The sign-in sheet plugin (scripts/ios/badgefit/WebAuthPlugin.swift), added to the app for the build.
ruby "$ROOT/scripts/ios/badgefit/add-webauth.rb"

# The shield on navy, 1024 px, no transparency.
cp "$ROOT/scripts/ios/badgefit/AppIcon-1024.png" "$APP/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png"

PBX="$APP/App.xcodeproj/project.pbxproj"
sed -i '' -E "s/MARKETING_VERSION = [^;]+;/MARKETING_VERSION = 1.0.0;/g; s/CURRENT_PROJECT_VERSION = [^;]+;/CURRENT_PROJECT_VERSION = $BUILD;/g" "$PBX"

echo "BadgeFit $NEW_ID 1.0.0 ($BUILD)"
grep -c "$NEW_ID" "$PBX"
/usr/libexec/PlistBuddy -c "Print :CFBundleDisplayName" "$PLIST"
