import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');
const firefoxDir = path.resolve(rootDir, 'dist-firefox');
const releaseDir = path.resolve(rootDir, 'releases');

function packageExtensions() {
  console.log('Packaging ElementShot extensions...');

  if (!fs.existsSync(distDir)) {
    console.error('Dist directory does not exist. Run npm run build first.');
    process.exit(1);
  }

  // Create releases folder
  if (!fs.existsSync(releaseDir)) {
    fs.mkdirSync(releaseDir, { recursive: true });
  }

  // 1. Prepare Firefox dist directory
  if (fs.existsSync(firefoxDir)) {
    fs.rmSync(firefoxDir, { recursive: true, force: true });
  }
  fs.cpSync(distDir, firefoxDir, { recursive: true });

  // Read chrome manifest and adapt for Firefox
  const chromeManifestPath = path.join(distDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(chromeManifestPath, 'utf-8'));

  manifest.background = {
    scripts: ['background.js'],
    type: 'module',
  };
  manifest.browser_specific_settings = {
    gecko: {
      id: 'elementshot@smile-plzz.github.io',
      strict_min_version: '109.0',
    },
  };

  fs.writeFileSync(
    path.join(firefoxDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf-8'
  );

  console.log('Firefox unpacked build created at dist-firefox/');

  // 2. Create zip archives using PowerShell Compress-Archive
  const chromeZip = path.join(releaseDir, 'elementshot-chrome-v1.0.0.zip');
  const firefoxZip = path.join(releaseDir, 'elementshot-firefox-v1.0.0.0.zip');

  if (fs.existsSync(chromeZip)) fs.unlinkSync(chromeZip);
  if (fs.existsSync(firefoxZip)) fs.unlinkSync(firefoxZip);

  try {
    execSync(
      `powershell -Command "Compress-Archive -Path '${distDir}\\*' -DestinationPath '${chromeZip}' -Force"`,
      { stdio: 'inherit' }
    );
    console.log(`Created Chrome/Edge package: ${chromeZip}`);

    execSync(
      `powershell -Command "Compress-Archive -Path '${firefoxDir}\\*' -DestinationPath '${firefoxZip}' -Force"`,
      { stdio: 'inherit' }
    );
    console.log(`Created Firefox package: ${firefoxZip}`);
  } catch (err) {
    console.warn('Zip archiving notice:', err);
  }

  console.log('Packaging complete!');
}

packageExtensions();
