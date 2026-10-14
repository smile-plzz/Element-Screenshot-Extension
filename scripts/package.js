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

  // 2. Create zip archives
  const chromeZip = path.join(releaseDir, 'elementshot-chrome-v1.0.0.zip');
  const firefoxZip = path.join(releaseDir, 'elementshot-firefox-v1.0.0.zip');

  function zipFolder(sourceDir, zipPath) {
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    try {
      if (process.platform === 'win32') {
        execSync(
          `powershell -Command "Compress-Archive -Path '${sourceDir}\\*' -DestinationPath '${zipPath}' -Force"`,
          { stdio: 'ignore' }
        );
      } else {
        execSync(`cd "${sourceDir}" && zip -rq "${zipPath}" ./*`, { stdio: 'ignore' });
      }
      console.log(`Created archive: ${zipPath}`);
    } catch (err) {
      console.warn(`Could not create archive for ${zipPath}:`, err);
    }
  }

  zipFolder(distDir, chromeZip);
  zipFolder(firefoxDir, firefoxZip);

  console.log('Packaging complete!');
}

packageExtensions();
