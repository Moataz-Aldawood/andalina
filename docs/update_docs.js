const fs = require('fs');

const file = 'R:/projects/Coding/Js/Andalina/website2/documentation.html';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove the old warning note from "How to Use"
const oldWarningRegex = /\s*<div class="andalina-important-card" style="margin-top: 15px;">\s*<strong>Syntax Highlighting Warning:[\s\S]*?<\/div>/;
content = content.replace(oldWarningRegex, '');

// 2. Create the new general Async Compatibility section
const newSection = `
                     <div id="async-compatibility">
                        <hr>
                        <h3>Third-Party JS Compatibility</h3>
                        <p>Because andalina dynamically fetches and injects HTML into the DOM asynchronously, it can cause race conditions with third-party JavaScript libraries (such as sliders, lightboxes, or UI frameworks) that attempt to scan the DOM immediately on page load.</p>
                        
                        <div class="andalina-important-card">
                           <strong>The Issue:</strong> If a third-party library runs before andalina has finished injecting your components, the library won't find the elements and will fail to initialize.
                        </div>

                        <h4>The Solution:</h4>
                        <p>You must initialize your third-party libraries <em>after</em> you are sure the asynchronous fetching has completed. A reliable way to handle this is by awaiting the component injections or using a <code>Promise.all</code> approach if you are manually fetching content.</p>

                        <h4>Example: Safe Initialization</h4>
                        <pre><code class="language-javascript">document.addEventListener("DOMContentLoaded", function() {
    // Collect all your async fetch operations
    const fetchPromises = [
        fetchComponent('header.html'),
        fetchComponent('slider.html')
    ];

    // Wait for everything to finish injecting
    Promise.all(fetchPromises).then(() => {
        // Safe to initialize 3rd party libraries now!
        initializeMySlider();
        initializeMyLightbox();
    });
});</code></pre>
                     </div>
`;

// Insert the new section before <div id="configuration">
content = content.replace('<div id="configuration">', newSection + '\n                     <div id="configuration">');

// 3. Add the new specific code highlight warning into <div id="code">
const newCodeWarning = `
                        <div class="andalina-important-card" style="margin-top: 15px;">
                           <strong>Syntax Highlighting Warning:</strong> If you are using a code highlighter like <code>highlight.js</code> or <code>Prism.js</code>, you must ensure it only runs <em>after</em> your <code>&lt;an-code&gt;</code> blocks have been fully fetched and injected. For a detailed explanation of this async race condition and how to fix it, please see the <a href="#async-compatibility"><strong>Third-Party JS Compatibility</strong></a> section.
                        </div>
`;

// Find where to insert it in <div id="code">. Let's insert it right after the paragraph describing <an-code>.
const codeParaRegex = /(<p>Used to inject unparsed source code directly from a file, perfectly formatted and safely\s*escaped for documentation blocks\.<\/p>)/;
content = content.replace(codeParaRegex, '$1' + newCodeWarning);

// 4. Update the sidelist menu to include the new section
const sidelistItem = `
                  <li title="3rd Party JS" class="sidelist">
                     <a href="#async-compatibility">3rd Party JS Compatibility</a>
                  </li>`;
content = content.replace('<li title="Configuration" class="sidelist">', sidelistItem + '\n                  <li title="Configuration" class="sidelist">');


fs.writeFileSync(file, content, 'utf8');
console.log('Documentation updated with async compatibility section and specific highlight warning.');
