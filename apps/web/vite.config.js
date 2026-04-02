import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
const typesDir = path.resolve(__dirname, '../../packages/types/src');
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@family-life/types': typesDir,
        },
        extensions: ['.ts', '.tsx', '.mts', '.js', '.jsx', '.mjs', '.json'],
    },
    server: {
        port: 5173,
        fs: {
            allow: ['../..'],
        },
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
        },
    },
});
