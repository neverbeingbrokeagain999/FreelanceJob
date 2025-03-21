export default {
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/tests/mocks/fileMock.js',
    '\\.(css|less|scss|sass)$': '<rootDir>/tests/mocks/styleMock.js',
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(@babel/runtime|axios|socket.io-client)/)',
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.test.jsx'
  ],
  transform: {
    '^.+\\.(js|jsx|mjs)$': 'babel-jest'
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/**/*.d.js'
  ],
  coverageDirectory: 'coverage',
  moduleDirectories: ['node_modules', 'src'],
  extensionsToTreatAsEsm: ['.jsx', '.mjs'],
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons']
  }
}