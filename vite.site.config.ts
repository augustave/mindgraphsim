import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8'));

function safeGitSha(): string {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'unknown';
  }
}

export default defineConfig({
  define: {
    __MGS_VERSION__: JSON.stringify(pkg.version),
    __MGS_GIT_SHA__: JSON.stringify(safeGitSha()),
    __MGS_BUILT_AT__: JSON.stringify(new Date().toISOString()),
  },
  build: {
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    open: false,
  },
});
