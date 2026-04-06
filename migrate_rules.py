#!/usr/bin/env python3
import os
import shutil
import re
import json

print("Starting Sub-phase 0.3 migration...")

# 1. Create packages/rules-engine directory structure
os.makedirs("packages/rules-engine/src/config", exist_ok=True)

# 2. Write package.json and tsconfig.json for @tokensense/rules-engine
package_json_content = """{
  "name": "@tokensense/rules-engine",
  "version": "1.0.0",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts",
  "dependencies": {
    "@tokensense/types": "workspace:*"
  }
}"""
with open("packages/rules-engine/package.json", "w") as f:
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
with open("packages/rules-engine/tsconfig.json", "w") as f:
    f.write(tsconfig_content)

# 3. Move the rules files
files_to_move = [
    ("apps/web/src/rules.ts", "packages/rules-engine/src/rules.ts"),
    ("apps/web/src/aggregator.ts", "packages/rules-engine/src/aggregator.ts"),
    ("apps/web/src/config/ruleThresholds.ts", "packages/rules-engine/src/config/ruleThresholds.ts"),
]

for src, dst in files_to_move:
    if os.path.exists(src):
        shutil.move(src, dst)

# Create index.ts
with open("packages/rules-engine/src/index.ts", "w") as f:
    f.write("export * from './rules';\nexport * from './aggregator';\nexport * from './config/ruleThresholds';\n")

print("Created @tokensense/rules-engine package.")

# 4. Update imports across all remaining files in apps/web/src
def process_file(filepath):
    with open(filepath, "r") as f:
        content = f.read()

    # Regex to find imports ending with /rules, /aggregator, or /config/ruleThresholds
    new_content = re.sub(
        r"from\s+['\"](\.\/|\.\.\/).*?(rules|aggregator|config\/ruleThresholds)['\"]",
        r"from '@tokensense/rules-engine'",
        content
    )

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
    web_pkg["dependencies"]["@tokensense/rules-engine"] = "workspace:*"
    with open(web_pkg_path, "w") as f:
        json.dump(web_pkg, f, indent=2)
    print("Added @tokensense/rules-engine to apps/web/package.json")

# Note: We do not need to rewrite imports INSIDE packages/rules-engine/src
# because they automatically preserve their sibling relative structures perfectly.

print("✅ Sub-phase 0.3 migration complete!")
print("Next step: Run 'pnpm install' in this directory.")
