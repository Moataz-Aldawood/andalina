#!/usr/bin/env node

const path = require('path');
const { buildProject } = require('../src/builder.js');

// Simple argument parser
const args = process.argv.slice(2);
let srcDir = process.cwd();
let destDir = path.join(process.cwd(), 'dist');

for (let i = 0; i < args.length; i++) {
    if (args[i] === 'build') {
        // Just ignore 'build' command as it's the default action
        continue;
    } else if (args[i] === '--src' && args[i + 1]) {
        srcDir = path.resolve(process.cwd(), args[i + 1]);
        i++;
    } else if (args[i] === '--dest' && args[i + 1]) {
        destDir = path.resolve(process.cwd(), args[i + 1]);
        i++;
    } else if (args[i] === '--help') {
        console.log(`
Andalina Builder CLI

Usage:
  npx andalina-builder [options]

Options:
  --src <dir>     The source directory of your Andalina project (default: current directory)
  --dest <dir>    The output directory for compiled HTML (default: ./dist)
  --help          Show this help message
        `);
        process.exit(0);
    }
}

// Run the builder
buildProject(srcDir, destDir)
    .then(() => {
        process.exit(0);
    })
    .catch((err) => {
        console.error('[Builder] Fatal Error:', err);
        process.exit(1);
    });
