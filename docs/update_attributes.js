const fs = require('fs');

const file = 'R:/projects/Coding/Js/Andalina/website2/documentation.html';
let content = fs.readFileSync(file, 'utf8');

const nameAttrText = `                           <li><code>name</code> <em>(Optional)</em>: The name of the file (resolves to <code>[configuredPath]/[name].html</code>). <em>Note: You must provide either <code>src</code> or <code>name</code>.</em></li>`;

// Update <an-include> attributes
const includeRegex = /(<h3[^>]*>.*?<span[^>]*>-include&gt;<\/span><\/h3>[\s\S]*?<h4>Attributes:<\/h4>\s*<ul>\s*<li><code>src<\/code> <em>\(Required\)<\/em>: The path to the HTML\/XHTML file you want to\s*include\.<\/li>)/;
content = content.replace(includeRegex, `$1\n${nameAttrText}`);

// Update <an-layout-template> attributes
const layoutRegex = /(<h3[^>]*>.*?<span[^>]*>-layout-template&gt;<\/span><\/h3>[\s\S]*?<h4>Attributes:<\/h4>\s*<ul>\s*<li><code>src<\/code> <em>\(Required\)<\/em>: The path to the parent layout HTML\/XHTML file\.<\/li>)/;
content = content.replace(layoutRegex, `$1\n${nameAttrText}`);

// Update <an-page-template> attributes
const pageRegex = /(<h3[^>]*>.*?<span[^>]*>-page-template&gt;<\/span><\/h3>[\s\S]*?<h4>Attributes:<\/h4>\s*<ul>\s*<li><code>src<\/code> <em>\(Required\)<\/em>: The path to the layout HTML\/XHTML file\.<\/li>)/;
content = content.replace(pageRegex, `$1\n${nameAttrText}`);

// Fix "Required" to "Optional" for src in all three tags
// But to be precise, I'll just change the text directly in the HTML manually or via simple string replacement.

content = content.replace(/<li><code>src<\/code> <em>\(Required\)<\/em>: The path to the HTML\/XHTML file you want to\s*include\.<\/li>/, `<li><code>src</code> <em>(Optional)</em>: The exact path to the target HTML/XHTML file.</li>`);
content = content.replace(/<li><code>src<\/code> <em>\(Required\)<\/em>: The path to the parent layout HTML\/XHTML file\.<\/li>/, `<li><code>src</code> <em>(Optional)</em>: The exact path to the parent layout HTML/XHTML file.</li>`);
content = content.replace(/<li><code>src<\/code> <em>\(Required\)<\/em>: The path to the layout HTML\/XHTML file\.<\/li>/, `<li><code>src</code> <em>(Optional)</em>: The exact path to the layout HTML/XHTML file.</li>`);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed text content.');
