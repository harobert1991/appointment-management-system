import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  setupFiles: ['<rootDir>/src/test/setupTimezone.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  verbose: true,
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverage: false,
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/**/*.d.ts',
    '!src/**/*.types.ts',
    '!src/**/index.ts',
    '!src/**/*.schema.ts'
  ]
};

export default config; 