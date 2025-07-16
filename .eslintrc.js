module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    es2022: true
  },
  extends: [
    'eslint:recommended',
    'plugin:vue/essential'
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  rules: {
    // Vue-specific rules
    'vue/multi-word-component-names': 'off',
    'vue/no-unused-vars': 'error',
    
    // General JavaScript rules
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }],
    'no-undef': 'error',
    
    // Code style (relaxed for easier adoption)
    'indent': ['warn', 2],
    'quotes': ['warn', 'single', { 'allowTemplateLiterals': true }],
    'semi': ['warn', 'always']
  },
  globals: {
    // Element UI components are globally available
    '$': 'readonly',
    'Vue': 'readonly'
  }
}; 