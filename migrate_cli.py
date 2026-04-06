#!/usr/bin/env python3
import os
import shutil
import re
import json

print("Starting Sub-phase 0.4 migration...")

# 1. Create packages/cli directory structure
os.makedirs("packages/cli/src", exist_ok=True)

# 2. Write package.json and tsconfig.json for @tokensense/cli
package_json_content = """{
  "name": "@tokensense/cli",
  "version": "1.0.0",
  "private": true,
  "main": "dist/cli.js",
  "bin": {
    "tokensense": "./dist/cli.js"
  },
  "scripts": {
    "start": "tsx src/cli.ts",
    "build": "tsc"
  },
  "dependencies": {
    "@tokensense/types": "workspace:*",
    "@tokensense/rules-engine": "workspace:*",
    "tsx": "^4.7.1"
  }
}"""
with open("packages/cli/package.json", "w") as f:
    f.write(package_json_content)

tsconfig_content = """{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "declaration": true
  },
  "include": ["src"]
}"""
with open("packages/cli/tsconfig.json", "w") as f:
    f.write(tsconfig_content)

# 3. Move cli.ts and copy its required datasets
if os.path.exists("apps/web/src/cli.ts"):
    shutil.move("apps/web/src/cli.ts", "packages/cli/src/cli.ts")

if os.path.exists("apps/web/src/mockData.ts"):
    shutil.copy("apps/web/src/mockData.ts", "packages/cli/src/mockData.ts")

if os.path.exists("apps/web/src/recommendations.ts"):
    shutil.copy("apps/web/src/recommendations.ts", "packages/cli/src/recommendations.ts")

print("Created @tokensense/cli package and moved CLI utility.")

# 4. Update the imports inside cli.ts
cli_path = "packages/cli/src/cli.ts"
if os.path.exists(cli_path):
    with open(cli_path, "r") as f:
        content = f.read()

    # The CLI originally appended .js for tsx/esm runtime compatibility.
    # We replace the extracted package imports.
    content = content.replace("from './aggregator.js'", "from '@tokensense/rules-engine'")
    content = content.replace("from './rules.js'", "from '@tokensense/rules-engine'")
    content = content.replace("from './types.js'", "from '@tokensense/types'")

    with open(cli_path, "w") as f:
        f.write(content)
        
print("✅ Sub-phase 0.4 migration complete!")
print("Next step: Run 'pnpm install' in this directory, then 'pnpm --filter @tokensense/cli run start' to verify the CLI.")
