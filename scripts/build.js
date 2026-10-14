import { build } from 'vite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');
const watching = process.argv.includes('--watch');

async function buildExtension() {
  console.log('Building ElementShot extension...');

  // Clean dist directory
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
  }
  fs.mkdirSync(distDir, { recursive: true });

  // 1. Build Options & Offscreen pages
  console.log('1. Building Options and Offscreen HTML/JS pages...');
  await build({
    root: rootDir,
    base: './',
    build: {
      outDir: distDir,
      emptyOutDir: false,
      watch: watching ? {} : null,
      rollupOptions: {
        input: {
          options: path.resolve(rootDir, 'src/options/options.html'),
          offscreen: path.resolve(rootDir, 'src/offscreen/offscreen.html'),
        },
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: 'chunks/[name].js',
          assetFileNames: 'assets/[name].[ext]',
        },
      },
    },
  });

  // Normalize HTML files to dist root (if placed under src/options/ or src/offscreen/)
  const optionsHtmlSrc = path.join(distDir, 'src/options/options.html');
  if (fs.existsSync(optionsHtmlSrc)) {
    let content = fs.readFileSync(optionsHtmlSrc, 'utf-8');
    content = content.replace(/\.\.\/\.\.\//g, './');
    fs.writeFileSync(path.join(distDir, 'options.html'), content, 'utf-8');
  }
  const offscreenHtmlSrc = path.join(distDir, 'src/offscreen/offscreen.html');
  if (fs.existsSync(offscreenHtmlSrc)) {
    let content = fs.readFileSync(offscreenHtmlSrc, 'utf-8');
    content = content.replace(/\.\.\/\.\.\//g, './');
    fs.writeFileSync(path.join(distDir, 'offscreen.html'), content, 'utf-8');
  }
  const srcInDist = path.join(distDir, 'src');
  if (fs.existsSync(srcInDist)) {
    fs.rmSync(srcInDist, { recursive: true, force: true });
  }

  // 2. Build Content Script as standalone IIFE (no imports, single self-contained bundle)
  console.log('2. Bundling Content Script (standalone IIFE)...');
  await build({
    root: rootDir,
    build: {
      outDir: distDir,
      emptyOutDir: false,
      watch: watching ? {} : null,
      lib: {
        entry: path.resolve(rootDir, 'src/content/index.ts'),
        name: 'ElementShotContent',
        formats: ['iife'],
        fileName: () => 'content.js',
      },
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
    },
  });

  // 3. Build Background Service Worker as standalone ES module
  console.log('3. Bundling Background Service Worker (standalone ES)...');
  await build({
    root: rootDir,
    build: {
      outDir: distDir,
      emptyOutDir: false,
      watch: watching ? {} : null,
      lib: {
        entry: path.resolve(rootDir, 'src/background/index.ts'),
        formats: ['es'],
        fileName: () => 'background.js',
      },
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
    },
  });

  // 4. Copy static assets: manifest.json, icons, test-pages
  console.log('4. Copying manifest, icons, and test-pages...');
  fs.copyFileSync(
    path.resolve(rootDir, 'public/manifest.json'),
    path.resolve(distDir, 'manifest.json')
  );

  const iconsDir = path.resolve(rootDir, 'public/icons');
  if (fs.existsSync(iconsDir)) {
    fs.cpSync(iconsDir, path.resolve(distDir, 'icons'), { recursive: true });
  }

  console.log('Build complete! Unpacked extension ready at dist/');
}

buildExtension().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
