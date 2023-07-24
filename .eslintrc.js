const process = require('node:process')
process.env.ESLINT_TSCONFIG = 'tsconfig.json'

module.exports = {
  "extends": ["@antfu", "@nuxtjs/eslint-config-typescript"],
  rules: {
    "no-console": "off",
    'comma-dangle': ["error", "always-multiline"],
    "@typescript-eslint/comma-dangle": ["error", "always-multiline"],
    "semi": ["error", "always"],
    "@typescript-eslint/semi": ["error", "always"],
    "brace-style": ["error", "1tbs", { "allowSingleLine": true }],
    "@typescript-eslint/brace-style": ["error", "1tbs", { "allowSingleLine": true }],
    "@typescript-eslint/no-unused-vars": "warn",
    "vue/no-multiple-template-root": "warn",
    "@typescript-eslint/space-before-function-paren": ["error", "always"],
    "n/prefer-global/process": "off",
  }
}
