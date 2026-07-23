const fs = require('fs');
const file = 'c:/Users/moata/OneDrive/MOATAZ/Projects/Coding/Js/Andalina/website2/documentation.html';
let content = fs.readFileSync(file, 'utf8');

// Replace the complex span structures with plain text
// For normal tags: <span class="an-tag">&lt;</span><span class="an-prefix">an</span><span class="an-tag">-include&gt;</span>
const fullTagRegex = /<span class="an-tag">&lt;<\/span><span class="an-prefix">an<\/span><span class="an-tag">-([a-zA-Z0-9-]+)&gt;<\/span>/g;
content = content.replace(fullTagRegex, '&lt;an-$1&gt;');

// For attributes and self closing:
const fullTagAttr = /<span class="an-tag">&lt;<\/span><span class="an-prefix">an<\/span><span class="an-tag">-([^>]+)&gt;<\/span>/g;
content = content.replace(fullTagAttr, '&lt;an-$1&gt;');

// For closing tags:
const fullTagClose = /<span class="an-tag">&lt;\/<\/span><span class="an-prefix">an<\/span><span class="an-tag">-([a-zA-Z0-9-]+)&gt;<\/span>/g;
content = content.replace(fullTagClose, '&lt;/an-$1&gt;');

// Also remove the CSS block that defined these
content = content.replace(/<style>[\s\S]*?\.an-prefix[\s\S]*?<\/style>/, '');

fs.writeFileSync(file, content, 'utf8');
console.log('Cleaned span tags.');
