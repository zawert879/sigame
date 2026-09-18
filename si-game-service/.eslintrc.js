const namingConvention = objectKeyFormats => {
	const skipQuoted = {regex: '[^\\p{L}\\p{N}_$]', match: false};
	const underscores = {leadingUnderscore: 'allowSingleOrDouble', trailingUnderscore: 'allow'};
	return [
		'error',
		{
			selector: [
				'variable',
				'function',
				'classProperty',
				'parameterProperty',
				'classMethod',
				'objectLiteralMethod',
				'typeMethod',
				'accessor',
			],
			format: ['strictCamelCase'],
			...underscores,
			filter: skipQuoted,
		},
		{
			selector: 'objectLiteralProperty',
			format: objectKeyFormats,
			...underscores,
			filter: skipQuoted,
		},
		{
			selector: 'variable',
			modifiers: ['const'],
			format: ['strictCamelCase', 'UPPER_CASE'],
			filter: skipQuoted,
		},
		{selector: 'typeLike', format: ['StrictPascalCase']},
		{
			selector: 'variable',
			types: ['boolean'],
			format: ['StrictPascalCase'],
			prefix: ['is', 'has', 'can', 'should', 'will', 'did'],
		},
		{selector: 'interface', filter: '^(?!I)[A-Z]', format: ['StrictPascalCase']},
		{selector: 'typeParameter', filter: '^T$|^[A-Z][a-zA-Z]+$', format: ['StrictPascalCase']},
		{selector: ['classProperty', 'objectLiteralProperty'], format: null, modifiers: ['requiresQuotes']},
	];
};

module.exports = {
	env: {
		browser: true,
		es2021: true,
	},
	extends: 'xo',
	overrides: [
		{
			env: {
				node: true,
			},
			files: [
				'.eslintrc.{js,cjs}',
				'jest.config.js',
			],
			parserOptions: {
				sourceType: 'script',
			},
		},
		{
			extends: [
				'xo-typescript',
			],
			files: [
				'*.ts',
				'*.tsx',
			],
			parserOptions: {
				project: './tsconfig.eslint.json',
				tsconfigRootDir: __dirname,
			},
			rules: {
				semi: ['error', 'never'],
				'@typescript-eslint/semi': 'off',
				'@typescript-eslint/object-curly-spacing': ['error', 'always'],
				'no-unexpected-multiline': 'error',
				'@typescript-eslint/indent': ['error', 2],
				'@typescript-eslint/ban-types': 'off',
				'@typescript-eslint/prefer-readonly': 'off',
				'capitalized-comments': 'off',
				'no-implicit-coercion': 'off',
				'@typescript-eslint/no-namespace': ['error', {allowDeclarations: true}],
				'@typescript-eslint/naming-convention': namingConvention(['strictCamelCase']),
			},

		},
		{
			env: {
				node: true,
				jest: true,
			},
			files: [
				'test/**/*.ts',
			],
			rules: {
				'@typescript-eslint/naming-convention': namingConvention(['strictCamelCase', 'UPPER_CASE']),
			},
		},
	],
	parserOptions: {
		ecmaVersion: 'latest',
		sourceType: 'module',
	},
	rules: {
		'object-curly-spacing': 'off',
	},
};
