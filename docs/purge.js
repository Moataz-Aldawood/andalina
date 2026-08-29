const { PurgeCSS } = require('purgecss');
const fs = require('fs');

(async () => {
    try {
        const purgeCSSResult = await new PurgeCSS().purge({
            content: [
                'R:/projects/Coding/Js/Andalina/website2/*.html',
                'R:/projects/Coding/Js/Andalina/website2/js/*.js'
            ],
            css: ['R:/projects/Coding/Js/Andalina/website2/css/style.css'],
            safelist: ['active', 'show', 'collapsed', 'scrolled'] // Safelist common dynamic classes just in case
        });

        fs.writeFileSync('R:/projects/Coding/Js/Andalina/website2/css/style_purged.css', purgeCSSResult[0].css);
        console.log('PurgeCSS completed successfully with JS scan and safelist.');
    } catch (e) {
        console.error('Error running PurgeCSS:', e);
    }
})();
