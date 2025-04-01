#!/bin/bash

echo "Manually packaging Chrome Extension..."

# Get version from manifest.json
VERSION=$(grep -o '"version": "[^"]*"' manifest.json | cut -d'"' -f4)
EXTENSION_NAME="proxy-scraper-extension"

# Output filenames
ZIP_OUTPUT="${EXTENSION_NAME}-v${VERSION}.zip"
CRX_OUTPUT="${EXTENSION_NAME}-v${VERSION}.crx"

# First create a copy of the extension with the correct version in updates.xml
echo "Updating updates.xml with version $VERSION..."
cat > updates.xml << EOF
<?xml version='1.0' encoding='UTF-8'?>
<gupdate xmlns='http://www.google.com/update2/response' protocol='2.0'>
  <app appid='[YOUR_EXTENSION_ID]'>
    <updatecheck version='${VERSION}' codebase='https://github.com/fvnks/proxy-scraper-extension/releases/download/v${VERSION}/${CRX_OUTPUT}' />
  </app>
</gupdate> 
EOF

echo "Creating ZIP package of the extension..."
zip -r "$ZIP_OUTPUT" * -x "*.git*" -x "*.sh" -x "*.zip" -x "*.crx" -x "*.pem"

echo "Packaging complete!"
echo "Created: $ZIP_OUTPUT"
echo ""
echo "To publish on GitHub:"
echo "1. Go to your GitHub repository: https://github.com/fvnks/proxy-scraper-extension"
echo "2. Click on 'Releases' on the right side"
echo "3. Click 'Draft a new release'"
echo "4. Tag version: v$VERSION"
echo "5. Release title: Version $VERSION"
echo "6. Upload the $ZIP_OUTPUT file"
echo "7. Also create and upload the $CRX_OUTPUT file (you'll need to manually convert the ZIP to CRX)"
echo "8. Click 'Publish release'"
echo ""
echo "Note: Ensure you use the exact file path in the updates.xml file:"
echo "https://github.com/fvnks/proxy-scraper-extension/releases/download/v${VERSION}/${CRX_OUTPUT}" 