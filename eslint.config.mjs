import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'

const eslintConfig = defineConfig([
    ...nextVitals,
    // Override default ignores of eslint-config-next.
    globalIgnores([
        // Default ignores of eslint-config-next:
        '.next/**',
        '.content-collections/**',
        '.open-next/**',
        '.wrangler/**',
        '.claude/**',
        'node_modules/**',
        'supabase/.branches/**',
        'supabase/.temp/**',
        'out/**',
        'build/**',
        '.DS_Store',
        '**/.DS_Store',
        'tsconfig.tsbuildinfo',
        'next-env.d.ts',
    ]),
])

export default eslintConfig
