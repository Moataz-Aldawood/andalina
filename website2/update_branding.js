const fs = require('fs');
const path = require('path');

const files = ['index.html', 'documentation.html', 'demos.html'];
const brandLogoHtml = `<span class="brand-logo">&lt;<span class="brand-highlight">an</span>-dalina&gt;</span>`;
const brandLogoNav = `<span class="brand-logo" style="font-size: 1.75rem;">&lt;<span class="brand-highlight">an</span>-dalina&gt;</span>`;
const brandLogoFooter = `<span class="brand-logo" style="font-size: 1.5rem;">&lt;<span class="brand-highlight">an</span>-dalina&gt;</span>`;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace navbar logo
    content = content.replace(/<img class="img-fluid" src="images\/logo\.png" alt="godocs" width="155px">/g, brandLogoNav);
    
    // Replace footer logo
    content = content.replace(/<img class="img-fluid" src="images\/logo\.png" alt="Hugo documentation theme">/g, brandLogoFooter);
    
    // Replace the word "Andalina" outside of HTML tags using lookaround
    // The regex `(?![^<]*>)` ensures there's no closing `>` ahead without an opening `<` first, meaning we are outside a tag.
    // We only replace exact whole words "Andalina".
    const andalinaRegex = /(?![^<]*>)\bAndalina\b/g;
    content = content.replace(andalinaRegex, brandLogoHtml);

    // Replace <an-*> tags written as text (e.g., &lt;an-component&gt;)
    // We want to format &lt;an-SOMETHING&gt; -> <span class="brand-tag">&lt;<span class="brand-highlight">an</span>-SOMETHING&gt;</span>
    const tagRegex = /(?![^<]*>)&lt;an-([a-zA-Z0-9_-]+)&gt;/g;
    content = content.replace(tagRegex, `<span class="brand-tag">&lt;<span class="brand-highlight">an</span>-$1&gt;</span>`);

    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
});
