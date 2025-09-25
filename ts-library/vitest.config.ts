/**
 * Конфигурация тестового раннера Vitest для запуска модульных тестов библиотеки.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      reporter: ['text', 'json', 'html']
    }
  }
});
