const fs = require('fs');
const file = 'c:/Users/moata/OneDrive/MOATAZ/Projects/Coding/Js/Andalina/website2/documentation.html';
let content = fs.readFileSync(file, 'utf8');

// The layout-template section has `<p><strong>1. The Parent Layout (master.html)</strong></p>`
// And `<p><strong>2. The Child Layout (mid-layout.html)</strong></p>`
content = content.replace('<p><strong>1. The Parent Layout (master.html)</strong></p>', '<p><strong>1. The Template (master.html)</strong></p>');
content = content.replace('<p><strong>2. The Child Layout (mid-layout.html)</strong></p>', '<p><strong>2. The Caller (mid-layout.html)</strong></p>');

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed labels.');
