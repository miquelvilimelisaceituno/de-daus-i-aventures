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
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
