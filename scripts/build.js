import { resolve } from 'node:path';
import { build } from 'vite';

function expandEnv(value) {
  return value.replace(/%([^%]+)%/g, (match, name) => process.env[name] ?? match);
}

const custom = process.argv[2];
const outDir = custom ? resolve(expandEnv(custom)) : resolve('dist');

try {
  await build({ build: { outDir, emptyOutDir: true } });
  console.log(`Build completed. Output directory: ${outDir}`);
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}