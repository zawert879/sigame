/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: '<rootDir>/test/environment.ts',
	setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
	roots: ['<rootDir>/test'],
	testMatch: ['**/*.test.ts'],
};
