const { PurgeCSS } = require('purgecss');
const fs = require('fs');

(async () => {
    try {
        const purgeCSSResult = await new PurgeCSS().purge({
            content: [
                'c:/Users/moata/OneDrive/MOATAZ/Projects/Coding/Js/Andalina/website2/*.html',
                'c:/Users/moata/OneDrive/MOATAZ/Projects/Coding/Js/Andalina/website2/js/*.js'
            ],
            css: ['c:/Users/moata/OneDrive/MOATAZ/Projects/Coding/Js/Andalina/website2/css/style.css'],
            safelist: ['active', 'show', 'collapsed', 'scrolled'] // Safelist common dynamic classes just in case
        });

        fs.writeFileSync('c:/Users/moata/OneDrive/MOATAZ/Projects/Coding/Js/Andalina/website2/css/style_purged.css', purgeCSSResult[0].css);
        console.log('PurgeCSS completed successfully with JS scan and safelist.');
    } catch (e) {
        console.error('Error running PurgeCSS:', e);
    }
})();
