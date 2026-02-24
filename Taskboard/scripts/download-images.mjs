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
  {
    name: 'requirements.jpg',
    url: 'https://loremflickr.com/1600/900/project,planning,meeting'
  },
  {
    name: 'design.jpg',
    url: 'https://loremflickr.com/1600/900/ui,design,wireframe'
  },
  {
    name: 'development.jpg',
    url: 'https://loremflickr.com/1600/900/coding,software,developer'
  },
  {
    name: 'features.jpg',
    url: 'https://loremflickr.com/1600/900/agile,sprint,kanban'
  },
  {
    name: 'testing.jpg',
    url: 'https://loremflickr.com/1600/900/testing,qa,code'
  },
  {
    name: 'documentation.jpg',
    url: 'https://loremflickr.com/1600/900/documentation,writing,laptop'
  },
  {
    name: 'deployment.jpg',
    url: 'https://loremflickr.com/1600/900/cloud,server,devops'
  },
  {
    name: 'monitoring.jpg',
    url: 'https://loremflickr.com/1600/900/dashboard,monitoring,operations'
  },
  {
    name: 'performance.jpg',
    url: 'https://loremflickr.com/1600/900/analytics,performance,metrics'
  },
  {
    name: 'security.jpg',
    url: 'https://loremflickr.com/1600/900/cybersecurity,security,lock'
  }
];

function downloadImage(url, filepath, attempt = 1) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Node.js' } }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        downloadImage(response.headers.location, filepath, attempt).then(resolve).catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        if (attempt < 3) {
          setTimeout(() => {
            downloadImage(url, filepath, attempt + 1).then(resolve).catch(reject);
          }, 600 * attempt);
          return;
        }
        reject(new Error(`Failed to download after ${attempt} attempts: ${response.statusCode}`));
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
  console.log('📸 Downloading thematic task images...\n');

  let successCount = 0;
  let failedCount = 0;

  for (const image of imageTypes) {
    const filepath = resolve(imagesDir, image.name);
    try {
      console.log(`  Downloading ${image.name}...`);
      await downloadImage(image.url, filepath);
      console.log(`  ✓ ${image.name}`);
      successCount += 1;
    } catch (error) {
      console.error(`  ✗ Failed to download ${image.name}:`, error.message);
      failedCount += 1;
    }
  }

  console.log(`\nDownloaded: ${successCount}, Failed: ${failedCount}`);

  if (failedCount > 0) {
    console.error('\n❌ Image download incomplete.');
    process.exit(1);
  }

  console.log('\n✅ Image download complete!\n');
}

main();
