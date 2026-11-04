import { defineConfig } from 'vitest/config';

// Cada arquivo de teste monta um banco com todas as migrations, o que leva alguns segundos
export default defineConfig({ test: { hookTimeout: 60000 } });
