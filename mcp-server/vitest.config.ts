import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    // Resolve .js extension imports to .ts source files
    alias: [{ find: /^(\..+)\.js$/, replacement: '$1' }],
  },
});
