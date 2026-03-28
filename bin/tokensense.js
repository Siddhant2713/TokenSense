#!/usr/bin/env node
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Use tsx to handle TypeScript
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Dynamic import of tsx to register the TypeScript loader
const tsx = await import('tsx/esm/api');
tsx.register();

// Now import and run the actual CLI
await import(pathToFileURL(resolve(__dirname, '..', 'src', 'cli.ts')).href);
