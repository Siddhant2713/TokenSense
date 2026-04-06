#!/usr/bin/env python3
import os
import shutil
import glob
import re
import json

print("Starting Sub-phase 0.2 migration...")

# 1. Create packages/types directory structure
os.makedirs("packages/types/src", exist_ok=True)

# 2. Write package.json and tsconfig.json for @tokensense/types
package_json_content = """{
  "name": "@tokensense/types",
  "version": "1.0.0",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts",
  "dependencies": {}
}"""
with open("packages/types/package.json", "w") as f:
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
    "declaration": true
  },
  "include": ["src"]
}"""
with open("packages/types/tsconfig.json", "w") as f:
    f.write(tsconfig_content)

# 3. Move the type files and create index.ts
if os.path.exists("apps/web/src/types.ts"):
    shutil.move("apps/web/src/types.ts", "packages/types/src/types.ts")
if os.path.exists("apps/web/src/router/types.ts"):
    shutil.move("apps/web/src/router/types.ts", "packages/types/src/router.ts")

with open("packages/types/src/index.ts", "w") as f:
    f.write("export * from './types';\nexport * from './router';\n")

print("Created @tokensense/types package.")

# 4. Update imports across all files in apps/web/src
def process_file(filepath):
    with open(filepath, "r") as f:
        content = f.read()

    # Regex to find imports ending with /types or exactly ./types or ../types
    # e.g., import { Modal } from './types';
    # e.g., } from './router/types';
    
    # We want to replace paths like:
    # './types', '../types', './router/types', '../../types'
    # with '@tokensense/types'
    new_content = re.sub(r"from\s+['\"](\.\/|\.\.\/).*?types['\"]", r"from '@tokensense/types'", content)

    if new_content != content:
        with open(filepath, "w") as f:
            f.write(new_content)
        print(f"Updated imports in {filepath}")

for root, _, files in os.walk("apps/web/src"):
    for file in files:
        if file.endswith((".ts", ".tsx")):
            process_file(os.path.join(root, file))

# 5. Add dependency to apps/web/package.json
web_pkg_path = "apps/web/package.json"
if os.path.exists(web_pkg_path):
    with open(web_pkg_path, "r") as f:
        web_pkg = json.load(f)
    if "dependencies" not in web_pkg:
        web_pkg["dependencies"] = {}
    web_pkg["dependencies"]["@tokensense/types"] = "workspace:*"
    with open(web_pkg_path, "w") as f:
        json.dump(web_pkg, f, indent=2)
    print("Added @tokensense/types to apps/web/package.json")

print("✅ Sub-phase 0.2 migration complete!")
print("Next step: Run 'pnpm install' in this directory.")
