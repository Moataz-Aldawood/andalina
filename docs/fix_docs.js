const fs = require('fs');

const file = 'c:/Users/moata/OneDrive/MOATAZ/Projects/Coding/Js/Andalina/website2/documentation.html';
let content = fs.readFileSync(file, 'utf8');

// Wrap the <an-code> inside <pre class="rendered-html-block"> with a <code class="language-html"> tag
const renderedRegex = /<pre class="rendered-html-block"><an-code src="([^"]+)"><\/an-code><\/pre>/g;

content = content.replace(renderedRegex, '<pre class="rendered-html-block"><code class="language-html"><an-code src="$1"></an-code></code></pre>');

// Also add a note under the existing Important Note in "How to use"
const noteToAdd = `
                        <div class="andalina-important-card" style="margin-top: 15px;">
                           <strong>Syntax Highlighting Warning:</strong> Because andalina injects HTML asynchronously, third-party libraries that scan the DOM on page load (like <code>highlight.js</code>) might run <em>before</em> your templates have finished loading. To fix this, you must initialize your syntax highlighter only after andalina has finished rendering, or use a <code>Promise.all</code> approach for dynamic fetches.
                        </div>`;

const targetNote = /for andalina to work!\s*<\/div>/;
content = content.replace(targetNote, `for andalina to work!\n                        </div>${noteToAdd}`);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed rendered code blocks and added warning note.');
