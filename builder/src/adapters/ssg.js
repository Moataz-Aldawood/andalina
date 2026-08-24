const path = require('path');
const fs = require('fs');
const BaseAdapter = require('./base.js');

class SsgAdapter extends BaseAdapter {
    
    get extension() {
        return '.html';
    }

    shouldProcess(filePath) {
        // SSG only processes top-level public pages (it ignores components, layouts, templates because they are inlined)
        const relativePath = path.relative(this.config.srcDir, filePath).replace(/\\/g, '/');
        
        // Ignore internal Andalina directories
        const ignoreDirs = [
            this.config.componentsPath,
            this.config.layoutsPath,
            this.config.templatesPath,
            this.config.includesPath,
            this.config.codesPath
        ].filter(Boolean);

        for (const dir of ignoreDirs) {
            if (relativePath.startsWith(dir + '/')) {
                return false;
            }
        }
        
        return filePath.endsWith('.html');
    }

    async transform(document, context) {
        // Run Andalina Core to fully flatten the DOM
        let corePath;
        try {
            let localPath = path.resolve(__dirname, '../../../core/andalina.js');
            if (fs.existsSync(localPath)) {
                corePath = localPath;
            } else {
                corePath = require.resolve('andalina/core/andalina.js');
            }
        } catch (e) {
            corePath = path.resolve(__dirname, 'andalina-core.js');
        }
        
        // Clear require cache for a fresh instance per file
        delete require.cache[require.resolve(corePath)];
        require(corePath);

        const window = document.defaultView;

        if (!window.Andalina || !window.Andalina.init) {
            throw new Error("Andalina.init is not exported. Did you update core/andalina.js?");
        }

        // Wait for composition to finish
        await window.Andalina.init();

        // Cleanup: Remove Andalina runtime tags for pure static output
        this.cleanup(document);

        delete window.Andalina;

        return document.toString();
    }
}

module.exports = SsgAdapter;
