import { resolve } from 'node:path';
import { build } from 'vite';

const outDir = process.argv[2] ? resolve(process.argv[2]) : resolve('dist');

try {
  await build({ build: { outDir } });
  console.log(`Build completed. Output directory: ${outDir}`);
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}