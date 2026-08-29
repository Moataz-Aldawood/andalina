const postcss = require('postcss');
const fs = require('fs');

const css = fs.readFileSync('R:/projects/Coding/Js/Andalina/website2/css/style_purged.css', 'utf8');

const variables = [];
const reset = [];
const layout = [];
const components = [];
const utilities = [];
const mediaQueries = [];

const plugin = postcss.plugin('css-sorter', () => {
    return (root) => {
        root.walk(node => {
            if (node.parent !== root) return; // Only top-level rules

            if (node.type === 'atrule' && node.name === 'media') {
                mediaQueries.push(node.toString());
                return;
            }
            if (node.type === 'atrule') {
                variables.push(node.toString()); // like @import, @charset
                return;
            }
            if (node.type !== 'rule') return;

            const selector = node.selector || '';
            
            if (selector.includes(':root')) {
                variables.push(node.toString());
            } else if (/^[a-zA-Z]/.test(selector) && !selector.includes('.')) {
                // E.g. body, h1, a, p
                reset.push(node.toString());
            } else if (selector.includes('.container') || selector.includes('.section') || selector.includes('.row') || selector.includes('.column') || selector.includes('.col-')) {
                layout.push(node.toString());
            } else if (selector.match(/\.(mt|mb|ml|mr|pt|pb|pl|pr|p-|m-|text-|bg-|has-|d-|w-|h-|align-|justify-)/)) {
                utilities.push(node.toString());
            } else {
                components.push(node.toString());
            }
        });
    };
});

postcss([plugin]).process(css, { from: undefined }).then(() => {
    const sortedCSS = `
/* =========================================
   1. VARIABLES & ROOT
========================================= */
${variables.join('\n\n')}

/* =========================================
   2. RESET & BASE TYPOGRAPHY
========================================= */
${reset.join('\n\n')}

/* =========================================
   3. LAYOUT & GRID
========================================= */
${layout.join('\n\n')}

/* =========================================
   4. COMPONENTS
========================================= */
${components.join('\n\n')}

/* =========================================
   5. UTILITIES & HELPERS
========================================= */
${utilities.join('\n\n')}

/* =========================================
   6. MEDIA QUERIES (RESPONSIVE)
========================================= */
${mediaQueries.join('\n\n')}
`;

    fs.writeFileSync('R:/projects/Coding/Js/Andalina/website2/css/style.css', sortedCSS.trim(), 'utf8');
    console.log('CSS successfully logically sorted and saved to style.css.');
}).catch(err => {
    console.error('Error sorting CSS:', err);
});
