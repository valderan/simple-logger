/**
 * Файл конфигурации сборщика tsup: описывает параметры компиляции библиотеки в форматы ESM и CJS.
 */
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  splitting: false,
  sourcemap: true,
  clean: true,
  format: ['esm', 'cjs'],
  dts: true,
  target: 'es2020',
  minify: false
});
