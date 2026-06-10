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
        // Write to dist/ but with a specific name
        outDir: 'dist',
        // Engine config appends to dist/ so the site build (which empties it)
        // must run first when both are produced.
        emptyOutDir: false,
        lib: {
            entry: resolve(__dirname, 'src/engine.ts'),
            name: 'MindGraphSimEngine',
            formats: ['iife'],
            fileName: () => 'mgs-engine.js'
        },
        rollupOptions: {
            // Ensure we don't bundle external dependencies if any (none expected for the engine core)
        }
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
        },
    },
});
