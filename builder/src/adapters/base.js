class BaseAdapter {
    constructor(config) {
        this.config = config;
    }

    /**
     * The file extension for output files (e.g., '.html', '.blade.php').
     */
    get extension() {
        return '.html';
    }

    /**
     * Transform a parsed DOM document into the target language string.
     * @param {Document} document - The linkedom Document object
     * @param {Object} context - Context containing filename, srcPath, etc.
     * @returns {Promise<string>} - The serialized output code
     */
    async transform(document, context) {
        throw new Error('transform() must be implemented by the adapter.');
    }

    /**
     * Hook to allow the adapter to filter which files it wants to process.
     * By default, it processes all .html files.
     * @param {string} filePath 
     * @returns {boolean}
     */
    shouldProcess(filePath) {
        return filePath.endsWith('.html');
    }
    /**
     * Removes Andalina-specific development artifacts from the DOM before generating output.
     * @param {Document} document 
     */
    cleanup(document) {
        const prefix = this.config.prefix || 'an';
        
        // Remove andalina script tags
        const scripts = document.querySelectorAll('script');
        scripts.forEach(script => {
            if (script.src && script.src.includes('andalina.js')) {
                script.remove();
            }
        });

        // Remove Andalina FOUC style
        const foucStyle = document.getElementById('andalina-fouc');
        if (foucStyle) foucStyle.remove();

        // Remove <an-data> tags
        const dataNodes = document.querySelectorAll(`${prefix}-data`);
        dataNodes.forEach(node => node.remove());

        // Remove Andalina comments (<!-- an-comment: ... -->)
        const walker = document.createTreeWalker(document, 128); // NodeFilter.SHOW_COMMENT = 128
        const commentsToRemove = [];
        let currentNode;
        while ((currentNode = walker.nextNode())) {
            if (currentNode.nodeValue.trim().startsWith(`${prefix}-comment`)) {
                commentsToRemove.push(currentNode);
            }
        }
        commentsToRemove.forEach(node => node.remove());
    }
}

module.exports = BaseAdapter;
