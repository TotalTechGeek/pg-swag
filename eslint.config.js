import globals from 'globals'
import pluginJs from '@eslint/js'
import standard from 'eslint-config-standard'

for (const rule in standard.rules) {
  if (rule.startsWith('import/') || rule.startsWith('n/') || rule.startsWith('promise/')) delete standard.rules[rule]
}

export default [
  { languageOptions: { globals: globals.node } },
  pluginJs.configs.recommended,
  // This was kind of weird to get the standard rules to get to work with the new format
  { rules: { ...standard.rules } },
  {
    rules: {
      'eslint-comments/no-unused-disable': 'off',
      'no-unmodified-loop-condition': 'off'
    }
  }
]
