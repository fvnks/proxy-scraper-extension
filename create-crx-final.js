#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');
const crypto = require('crypto');
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

// Generate a private key if it doesn't exist
if (!fs.existsSync(pemFile)) {
  console.log('Generating new private key...');
  const { privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  
  fs.writeFileSync(pemFile, privateKey);
  console.log(`Private key saved to ${pemFile}`);
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
    // Read the private key
    const privateKey = fs.readFileSync(pemFile);
    
    // Create a new ChromeExtension object
    const crx = new ChromeExtension({
      privateKey: privateKey,
      rootDirectory: tempDir
    });
    
    // Pack it all up
    console.log('Packing the extension...');
    const crxBuffer = await crx.pack();
    
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