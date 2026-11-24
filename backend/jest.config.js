/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts', '**/*.steps.ts'],
  // Els tests parlen amb Neon (Frankfurt) i, a la CI, des dels EUA: cada consulta
  // triga ~0,1 s i un escenari en fa desenes. Els 5 s per defecte no hi arriben.
  testTimeout: 30_000,
  transform: {
    '^.+\\.tsx?$': '@swc/jest',
  },
  // Cobertura (npm run test:coverage): tot src/ menys el client generat de Prisma
  // i server.ts (només arrenca el servidor). Si baixa dels mínims, Jest falla.
  collectCoverageFrom: ['src/**/*.ts', '!src/generated/**', '!src/server.ts'],
  coverageReporters: ['text', 'text-summary', 'json-summary', 'html'],
  coverageThreshold: {
    global: { statements: 85, branches: 75, functions: 85, lines: 85 },
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
