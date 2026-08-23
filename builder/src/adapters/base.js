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
}

module.exports = BaseAdapter;
