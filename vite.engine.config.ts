import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        // Write to dist/ but with a specific name
        outDir: 'dist',
        // Do not empty dist, or we might lose other assets if built separately (though usually we build one after another)
        // Actually, let's allow emptying if we run this as the main build command for the engine.
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
