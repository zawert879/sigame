/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
	preset: 'ts-jest',
	// Node + private SIQ_DIR / PACKAGES_DIR / FRONTEND_STATIC_DIR for every test file (the server reads them at import time)
	testEnvironment: '<rootDir>/test/environment.ts',
	setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
	roots: ['<rootDir>/test'],
	testMatch: ['**/*.test.ts'],
};
