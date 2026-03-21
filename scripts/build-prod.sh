#!/bin/bash
set -e

CONF="src-tauri/tauri.conf.json"

# Extract current version
CURRENT=$(grep '"version"' "$CONF" | head -1 | sed 's/.*"version": *"\([^"]*\)".*/\1/')
echo "Current version: $CURRENT"

# Bump patch version
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"
PATCH=$((PATCH + 1))
NEW_VERSION="$MAJOR.$MINOR.$PATCH"
echo "New version: $NEW_VERSION"

# Update version and title in tauri.conf.json
sed -i '' "s/\"version\": \"$CURRENT\"/\"version\": \"$NEW_VERSION\"/" "$CONF"
sed -i '' "s/\"title\": \"Terminator v$CURRENT\"/\"title\": \"Terminator v$NEW_VERSION\"/" "$CONF"

# Update version in frontend files
sed -i '' "s/Terminator v$CURRENT/Terminator v$NEW_VERSION/g" src/components/layout/StatusBar.tsx
sed -i '' "s/Terminator v$CURRENT/Terminator v$NEW_VERSION/g" src/components/help/HelpOverlay.tsx

echo "Building Terminator v$NEW_VERSION..."
npm run tauri build

# Copy to Applications
cp -R src-tauri/target/release/bundle/macos/Terminator.app /Applications/Terminator.app
echo "Installed Terminator v$NEW_VERSION to /Applications"
