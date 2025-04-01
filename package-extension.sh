#!/bin/bash

echo "Packaging Chrome Extension..."

# Directory containing your extension
EXTENSION_DIR="$(pwd)"

# Get version from manifest.json
VERSION=$(grep -o '"version": "[^"]*"' manifest.json | cut -d'"' -f4)
EXTENSION_NAME="proxy-scraper-extension"

# Output filename
CRX_OUTPUT="${EXTENSION_NAME}-v${VERSION}.crx"

# Check if Chrome is installed
if command -v google-chrome &> /dev/null; then
  CHROME_CMD="google-chrome"
elif command -v google-chrome-stable &> /dev/null; then
  CHROME_CMD="google-chrome-stable"
elif command -v chrome &> /dev/null; then
  CHROME_CMD="chrome"
else
  echo "Error: Chrome not found. Please install Chrome or specify the path manually."
  exit 1
fi

echo "Using Chrome: $CHROME_CMD"
echo "Packaging version $VERSION..."

# Create a zip file first
echo "Creating ZIP file..."
zip -r "${EXTENSION_NAME}-v${VERSION}.zip" * -x "*.git*" -x "*.sh" -x "*.zip" -x "*.crx" -x "*.pem"

# Pack the extension
echo "Creating CRX file..."
if [ -f "key.pem" ]; then
  "$CHROME_CMD" --pack-extension="$EXTENSION_DIR" --pack-extension-key="$EXTENSION_DIR/key.pem"
  # Chrome puts the crx in the parent directory
  mv "../${EXTENSION_NAME}.crx" "$CRX_OUTPUT"
else
  "$CHROME_CMD" --pack-extension="$EXTENSION_DIR"
  # Chrome creates a key and puts the crx in the parent directory
  mv "../${EXTENSION_NAME}.crx" "$CRX_OUTPUT"
  mv "../${EXTENSION_NAME}.pem" "key.pem"
  echo "Created new key file: key.pem"
fi

echo "Packaging complete!"
echo "Created: $CRX_OUTPUT"
echo "This file is ready to be uploaded to GitHub releases." 