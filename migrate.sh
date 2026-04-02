#!/bin/bash
set -e

echo "Starting Sub-phase 0.1 migration..."

# 1. Remove existing npm artifacts
rm -rf node_modules package-lock.json

# 2. Scaffolding directories
mkdir -p apps/web packages

# 3. Move frontend files to apps/web
# We don't move README, git files, or project_upgrade.md
mv src public index.html eslint.config.js package.json tsconfig.app.json tsconfig.cli.json tsconfig.json tsconfig.node.json vite.config.ts .env apps/web/ 2>/dev/null || true

# 4. Write root pnpm-workspace.yaml
cat << 'EOF' > pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
EOF

# 5. Write root turbo.json
cat << 'EOF' > turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {}
  }
}
EOF

# 6. Write root package.json
cat << 'EOF' > package.json
{
  "name": "tokensense-monorepo",
  "private": true,
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "latest"
  },
  "engines": {
    "node": ">=18"
  }
}
EOF

# 7. Rename the web app's package name
sed -i 's/"name": "tokensense"/"name": "@tokensense\/web"/' apps/web/package.json

echo "✅ Migration layout complete!"
echo "Next step: Run 'pnpm install' in this directory."
