const fs = require('fs');
const path = require('path');

const file = 'R:/projects/Coding/Js/Andalina/website2/documentation.html';
const codesDir = 'R:/projects/Coding/Js/Andalina/website2/codes';
let content = fs.readFileSync(file, 'utf8');

// Also process <pre class="rendered-html-block"> that don't have <code> tags but represent code
const codeRegex = /<pre><code([^>]*)>([\s\S]*?)<\/code><\/pre>/g;
let counter = 1;

content = content.replace(codeRegex, (match, p1, p2) => {
    const filename = `code-${counter}.txt`;
    
    // We must unescape HTML entities because they are currently escaped in the HTML
    // But wait, if they are fetched as raw text, they don't need to be escaped. 
    // Actually, if we inject it via JS using .textContent, it shouldn't be escaped in the file.
    let rawText = p2
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"');
    
    // Trim leading newline if present but keep indentation
    if (rawText.startsWith('\n')) rawText = rawText.slice(1);
    
    fs.writeFileSync(path.join(codesDir, filename), rawText, 'utf8');
    counter++;
    
    return `<pre><code${p1}><an-code src="codes/${filename}"></an-code></code></pre>`;
});

// For the rendered-html-block: <pre class="rendered-html-block">...</pre>
const renderedRegex = /<pre class="rendered-html-block">([\s\S]*?)<\/pre>/g;

content = content.replace(renderedRegex, (match, p1) => {
    const filename = `code-${counter}.txt`;
    
    let rawText = p1
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"');
        
    if (rawText.startsWith('\n')) rawText = rawText.slice(1);
    
    fs.writeFileSync(path.join(codesDir, filename), rawText, 'utf8');
    counter++;
    
    return `<pre class="rendered-html-block"><an-code src="codes/${filename}"></an-code></pre>`;
});

fs.writeFileSync(file, content, 'utf8');
console.log(`Successfully extracted ${counter - 1} code blocks.`);
