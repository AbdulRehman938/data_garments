import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourcePath = path.join(__dirname, '..', '.htaccess');
const destPath = path.join(__dirname, '..', 'dist', '.htaccess');

try {
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, destPath);
    console.log('.htaccess copied to dist folder');
  } else {
    console.log('.htaccess not found, skipping copy');
  }
} catch (error) {
  console.error('Error copying .htaccess:', error);
  process.exit(1);
}
