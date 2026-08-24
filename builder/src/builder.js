const fs = require('fs');
const path = require('path');
const { parseHTML, DOMParser, HTMLElement, customElements } = require('linkedom');

async function buildProject(srcDir, destDir, options = {}) {
    console.log(`[Builder] Starting build for project: ${srcDir}`);
    console.log(`[Builder] Output directory: ${destDir}`);

    if (options.clearBeforeBuild && fs.existsSync(destDir)) {
        console.log(`[Builder] Clearing output directory contents...`);
        try {
            const files = fs.readdirSync(destDir);
            for (const file of files) {
                const fullPath = path.join(destDir, file);
                try {
                    fs.rmSync(fullPath, { recursive: true, force: true });
                } catch (e) {
                    console.warn(`[Builder] Could not delete ${fullPath}: ${e.message}`);
                }
            }
        } catch (e) {
            console.warn(`[Builder] Could not read output directory to clear it: ${e.message}`);
        }
    }

    // Ensure dest directory exists
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
    }

    // Load config if it exists to know which directories to ignore
    let config = {
        componentsPath: 'components',
        codesPath: '',
        layoutsPath: '',
        templatesPath: '',
        includesPath: 'includes'
    };

    const configPath = path.join(srcDir, 'andalina.config.json');
    if (fs.existsSync(configPath)) {
        try {
            config = { ...config, ...JSON.parse(fs.readFileSync(configPath, 'utf8')) };
        } catch (err) {
            console.error(`[Builder] Error reading config: ${err.message}`);
        }
    }

    const protectedDirs = [
        destDir,
        config.componentsPath,
        config.codesPath,
        config.layoutsPath,
        config.templatesPath,
        config.includesPath
    ].filter(Boolean).map(p => path.resolve(srcDir, p));

    const adapterName = options.target || 'ssg';
    let AdapterClass;
    try {
        AdapterClass = require(`./adapters/${adapterName}.js`);
    } catch (err) {
        console.error(`[Builder] Error loading adapter '${adapterName}':`, err.message);
        throw err;
    }
    const adapter = new AdapterClass({ ...config, srcDir, destDir });

    // Find all public HTML files and static assets
    const publicFiles = [];
    const assetFiles = [];

    const ignoredNames = new Set([
        '.git', 'node_modules', '.vscode', '.DS_Store', '.agents', '.gemini',
        'package.json', 'package-lock.json', 'andalina.config.json',
        'README.md', 'LICENSE'
    ]);

    function walk(dir) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            if (ignoredNames.has(file)) continue;

            const fullPath = path.join(dir, file);
            
            // Skip protected directories
            if (protectedDirs.some(pDir => fullPath.startsWith(pDir))) {
                continue;
            }

            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                walk(fullPath);
            } else if (adapter.shouldProcess(fullPath)) {
                publicFiles.push(fullPath);
            } else {
                assetFiles.push(fullPath);
            }
        }
    }

    walk(srcDir);

    console.log(`[Builder] Found ${publicFiles.length} public HTML pages to compile.`);

    for (const filePath of publicFiles) {
        console.log(`[Builder] Compiling: ${path.relative(srcDir, filePath)}`);
        const html = fs.readFileSync(filePath, 'utf8');
        
        // 1. Setup DOM Environment using linkedom
        const { document, window, performance } = parseHTML(html);
        
        // 2. Setup Globals required by core/andalina.js
        global.document = document;
        global.window = window;
        global.performance = performance || { now: () => Date.now() };
        global.DOMParser = DOMParser;
        global.HTMLElement = HTMLElement;
        global.customElements = customElements;
        global.Node = { TEXT_NODE: 3, ELEMENT_NODE: 1, COMMENT_NODE: 8 };
        global.NodeFilter = {
            SHOW_ALL: 4294967295,
            SHOW_ELEMENT: 1,
            SHOW_TEXT: 4,
            SHOW_COMMENT: 128
        };

        // Polyfill fetch for local files
        const originalFetch = global.fetch; // Node 18+ has fetch
        global.fetch = async (url) => {
            try {
                if (url.startsWith('http://') || url.startsWith('https://')) {
                    if (originalFetch) return await originalFetch(url);
                    throw new Error('Native fetch not available for HTTP');
                }
                
                // Strip query parameters (like ?v=1.2.0)
                const cleanUrl = url.split('?')[0];
                let targetPath = path.resolve(path.dirname(filePath), cleanUrl);

                // Fallback to srcDir if not found (legacy behavior)
                if (!fs.existsSync(targetPath)) {
                    targetPath = path.join(srcDir, cleanUrl);
                }

                console.log(`[Builder] fetch() called for: ${url} -> resolving to: ${targetPath}`);

                // Final fallback if file doesn't exist
                if (!fs.existsSync(targetPath)) {
                     console.log(`[Builder] fetch() failed, file not found: ${targetPath}`);
                     return { ok: false, statusText: "File not found" };
                }

                const content = await fs.promises.readFile(targetPath, 'utf8');
                return {
                    ok: true,
                    text: async () => content,
                    json: async () => {
                        try {
                            return JSON.parse(content);
                        } catch (e) {
                            console.error(`[Builder] JSON.parse failed for ${targetPath}:`, e);
                            throw e;
                        }
                    }
                };
            } catch (err) {
                console.error(`[Builder] fetch() exception for ${url}:`, err);
                return { ok: false, statusText: err.message };
            }
        };

        // 3. Load and Run Andalina Core
        // Delete require cache so we get a fresh instance per file (prevents state leakage)
        let corePath;
        try {
            let localPath = path.resolve(__dirname, '../../core/andalina.js');
            if (fs.existsSync(localPath)) {
                corePath = localPath;
            } else {
                corePath = require.resolve('andalina/core/andalina.js');
            }
        } catch (e) {
            // Fallback for VS Code Extension bundle
            corePath = path.resolve(__dirname, 'andalina-core.js');
        }
        delete require.cache[require.resolve(corePath)];
        require(corePath);

        if (!window.Andalina || !window.Andalina.init) {
            throw new Error("Andalina.init is not exported. Did you update core/andalina.js?");
        }

        // Wait for composition to finish
        await window.Andalina.init();

        // 3.5 Cleanup: Remove Andalina runtime tags for pure static output
        const scripts = document.querySelectorAll('script');
        scripts.forEach(script => {
            if (script.src && script.src.includes('andalina')) {
                script.remove();
            }
        });
        const foucStyle = document.getElementById('andalina-fouc');
        if (foucStyle) foucStyle.remove();

        // Remove the exposed init function from the window just to be clean
        delete window.Andalina;

        // 4. Transform via Adapter
        const outputCode = await adapter.transform(document, { filePath, relativePath: path.relative(srcDir, filePath) });
        
        let relativePath = path.relative(srcDir, filePath);
        // Rename output extension based on adapter
        const ext = path.extname(relativePath);
        relativePath = relativePath.slice(0, -ext.length) + adapter.extension;
        
        const outPath = path.join(destDir, relativePath);

        // Ensure output dir exists
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        fs.writeFileSync(outPath, outputCode, 'utf8');
    }

    if (assetFiles.length > 0) {
        console.log(`[Builder] Copying ${assetFiles.length} asset files...`);
        for (const assetPath of assetFiles) {
            const relativePath = path.relative(srcDir, assetPath);
            const outPath = path.join(destDir, relativePath);
            fs.mkdirSync(path.dirname(outPath), { recursive: true });
            fs.copyFileSync(assetPath, outPath);
        }
    }

    console.log(`[Builder] Build complete! Output saved to ${destDir}`);
}

module.exports = { buildProject };
