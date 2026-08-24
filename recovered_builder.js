const fs = require('fs');
const path = require('path');
const { parseHTML } = require('linkedom');

async function buildProject(srcDir, destDir) {
    console.log(`[Builder] Starting build for project: ${srcDir}`);
    console.log(`[Builder] Output directory: ${destDir}`);

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
        config.componentsPath,
        config.codesPath,
        config.layoutsPath,
        config.templatesPath,
        config.includesPath
    ].filter(Boolean).map(p => path.join(srcDir, p));

    // Find all public HTML files
    const publicFiles = [];

    function walk(dir) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            
            // Skip protected directories
            if (protectedDirs.some(pDir => fullPath.startsWith(pDir))) {
                continue;
            }

            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                walk(fullPath);
            } else if (fullPath.endsWith('.html')) {
                publicFiles.push(fullPath);
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
                const targetPath = path.join(srcDir, cleanUrl);
                
                const content = await fs.promises.readFile(targetPath, 'utf8');
                return {
                    ok: true,
                    text: async () => content,
                    json: async () => JSON.parse(content)
                };
            } catch (err) {
                return { ok: false, statusText: err.message };
            }
        };

        // 3. Load and Run Andalina Core
        // Delete require cache so we get a fresh instance per file (prevents state leakage)
        const corePath = path.resolve(__dirname, '../../core/andalina.js');
        delete require.cache[require.resolve(corePath)];
        require(corePath);

        if (!window.Andalina || !window.Andalina.init) {
            throw new Error("Andalina.init is not exported. Did you update core/andalina.js?");
        }

        // Wait for composition to finish
        await window.Andalina.init();

        // 4. Serialize and write output
        const finalHtml = document.toString(); // linkedom serialization
        const relativePath = path.relative(srcDir, filePath);
        const outPath = path.join(destDir, relativePath);

        // Ensure output dir exists
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        fs.writeFileSync(outPath, finalHtml, 'utf8');
    }

    console.log(`[Builder] Build complete! Assets saved to ${destDir}`);
}

module.exports = { buildProject };