#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');
const ChromeExtension = require('crx');

// Get version from manifest
const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const version = manifest.version;
const extensionName = 'proxy-scraper-extension';

// File names
const zipFile = `${extensionName}-v${version}.zip`;
const crxFile = `${extensionName}-v${version}.crx`;
const pemFile = 'key.pem';

console.log(`Creating CRX file for version ${version}...`);

// Check if the zip file exists
if (!fs.existsSync(zipFile)) {
  console.log(`Error: ${zipFile} not found. Run ./manual-package.sh first.`);
  process.exit(1);
}

// Create temp directory
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ext-'));
console.log(`Created temporary directory: ${tempDir}`);

// Extract ZIP to temp directory
exec(`unzip -q ${zipFile} -d ${tempDir}`, async (error) => {
  if (error) {
    console.error(`Error extracting ZIP: ${error.message}`);
    process.exit(1);
  }
  
  console.log('ZIP file extracted successfully');
  
  try {
    // Create a new ChromeExtension object
    const crx = new ChromeExtension({
      rootDirectory: tempDir
    });
    
    // Load private key if exists, or create one
    if (fs.existsSync(pemFile)) {
      console.log('Using existing private key');
      const key = fs.readFileSync(pemFile);
      crx.privateKey = key;
    } else {
      console.log('No existing key found, a new one will be generated');
      // The key will be generated automatically when packing
    }
    
    // Pack it all up
    console.log('Packing the extension...');
    const crxBuffer = await crx.pack();
    
    // Save the private key if it was generated
    if (!fs.existsSync(pemFile)) {
      fs.writeFileSync(pemFile, crx.privateKey);
      console.log('Private key saved to:', pemFile);
    }
    
    // Write the CRX file
    fs.writeFileSync(crxFile, crxBuffer);
    console.log(`CRX file created: ${crxFile}`);
    
    // Clean up
    try {
      fs.rmSync(tempDir, { recursive: true });
      console.log('Temporary directory cleaned up');
    } catch (err) {
      console.warn('Warning: Could not clean up temporary directory:', err.message);
    }
    
    console.log(`
CRX file creation complete!

Next steps to publish on GitHub:
1. Go to: https://github.com/fvnks/proxy-scraper-extension/releases/new
2. Tag version: v${version}
3. Release title: Version ${version}
4. Description: Add your release notes here
5. Upload both files:
   - ${zipFile}
   - ${crxFile}
6. Publish release

The updates.xml file points to:
https://github.com/fvnks/proxy-scraper-extension/releases/download/v${version}/${crxFile}
`);
    
  } catch (err) {
    console.error('Error creating CRX:', err);
    process.exit(1);
  }
}); 