import { defineConfig } from 'vitest/config';

// Pruebas de integración contra una base de datos aparte (comisiones_test).
// Así se pueden probar permisos, triggers y reglas sin tocar los datos reales.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    // Una sola copia de la app y una sola base: se ejecutan en serie.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ??
        'postgresql://comisiones:dilan_dev_2026@127.0.0.1:55433/comisiones_test?schema=public',
      JWT_SECRET: 'secreto-de-pruebas-con-mas-de-32-caracteres',
      WEB_ORIGIN: 'http://localhost:3100',
    },
  },
});
