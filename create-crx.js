#!/usr/bin/env node

// This script uses the locally installed 'crx' package

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

// Extract ZIP to temp directory using a Promise-based exec
const unzipPromise = new Promise((resolve, reject) => {
  exec(`unzip -q ${zipFile} -d ${tempDir}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error extracting ZIP: ${error.message}`);
      reject(error);
      return;
    }
    resolve();
  });
});

unzipPromise.then(async () => {
  console.log('ZIP file extracted successfully. Creating CRX file...');
  
  try {
    // Create a new CRX package
    const crxPacker = new ChromeExtension({
      rootDirectory: tempDir
    });
    
    // Load or generate private key
    if (fs.existsSync(pemFile)) {
      console.log('Using existing private key');
      await crxPacker.loadPrivateKey(fs.readFileSync(pemFile));
    } else {
      console.log('Generating new private key...');
      // Generate new key
      await crxPacker.generatePrivateKey();
      
      // Save the private key
      fs.writeFileSync(pemFile, crxPacker.privateKey);
      console.log(`New private key saved to ${pemFile}`);
    }
    
    // Pack the extension
    console.log('Packing extension...');
    const crxBuffer = await crxPacker.pack();
    
    // Write the CRX file to disk
    fs.writeFileSync(crxFile, crxBuffer);
    console.log(`CRX file created: ${crxFile}`);
    
    // Clean up temp directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log('Temporary directory cleaned up');
    } catch (cleanupError) {
      console.warn(`Warning: Could not clean up temporary directory: ${cleanupError.message}`);
    }
    
    console.log(`
CRX file creation complete! 

Next steps to publish on GitHub:
1. Go to: https://github.com/fvnks/proxy-scraper-extension/releases/new
2. Tag version: v${version}
3. Release title: Version ${version}
4. Description: Add your release notes here
5. Upload the following files:
   - ${zipFile}
   - ${crxFile}
6. Publish release

The updates.xml file has been updated to point to:
https://github.com/fvnks/proxy-scraper-extension/releases/download/v${version}/${crxFile}
`);
  } catch (error) {
    console.error('Error creating CRX file:', error);
    process.exit(1);
  }
}).catch(error => {
  console.error('Failed to extract ZIP file:', error.message);
  process.exit(1);
}); 