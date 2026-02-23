#!/usr/bin/env node

import { createWriteStream, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const imagesDir = resolve(__dirname, '..', 'images');

mkdirSync(imagesDir, { recursive: true });

const imageTypes = [
  { name: 'requirements.jpg', url: 'https://picsum.photos/seed/requirements/800/600' },
  { name: 'design.jpg', url: 'https://picsum.photos/seed/design/800/600' },
  { name: 'development.jpg', url: 'https://picsum.photos/seed/development/800/600' },
  { name: 'features.jpg', url: 'https://picsum.photos/seed/features/800/600' },
  { name: 'testing.jpg', url: 'https://picsum.photos/seed/testing/800/600' },
  { name: 'documentation.jpg', url: 'https://picsum.photos/seed/documentation/800/600' },
  { name: 'deployment.jpg', url: 'https://picsum.photos/seed/deployment/800/600' },
  { name: 'monitoring.jpg', url: 'https://picsum.photos/seed/monitoring/800/600' },
  { name: 'performance.jpg', url: 'https://picsum.photos/seed/performance/800/600' },
  { name: 'security.jpg', url: 'https://picsum.photos/seed/security/800/600' }
];

function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Node.js' } }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        downloadImage(response.headers.location, filepath).then(resolve).catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      const file = createWriteStream(filepath);
      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve();
      });

      file.on('error', (err) => {
        reject(err);
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('📸 Downloading placeholder images...\n');

  for (const image of imageTypes) {
    const filepath = resolve(imagesDir, image.name);
    try {
      console.log(`  Downloading ${image.name}...`);
      await downloadImage(image.url, filepath);
      console.log(`  ✓ ${image.name}`);
    } catch (error) {
      console.error(`  ✗ Failed to download ${image.name}:`, error.message);
    }
  }

  console.log('\n✅ Image download complete!\n');
}

main();
