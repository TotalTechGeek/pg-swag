import globals from 'globals'
import pluginJs from '@eslint/js'

export default [
  { languageOptions: { globals: globals.node } },
  pluginJs.configs.recommended,
  // remove eslint-comments/no-unused-disable
  { rules: { 'eslint-comments/no-unused-disable': 'off' } }
]
