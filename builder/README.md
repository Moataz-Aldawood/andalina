# Andalina Builder

Andalina Builder is the Ahead-Of-Time (AOT) static compiler for the Andalina HTML composition engine. 

While Andalina works entirely in the browser at development time, Andalina Builder allows you to compile your project into fully composed, optimized, standard static HTML files for production (e.g., for GitHub Pages, CDN deployment, and maximum SEO performance).

## Installation

```bash
npm install -g andalina-builder
```

## Usage

In your Andalina project root directory:

```bash
# Build the current directory to ./dist
andalina build

# Or using npx
npx andalina-builder --src ./src --dest ./dist
```

### Options
- `--src <dir>` : The source directory of your Andalina project (default: current directory)
- `--dest <dir>`: The output directory for compiled HTML (default: `./dist`)

## Features
- Full support for `<an-component>`, `<an-layout>`, `<an-include>`, and `<an-repeat>`
- Dynamically resolves and evaluates `<an-data>` data fetching during the build process to generate static site snapshots.
- Polyfilled mock DOM environment via `linkedom` for fast headless composition without puppeteer.
