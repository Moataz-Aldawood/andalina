const fs = require('fs');

const file = 'docs/documentation.html';
let content = fs.readFileSync(file, 'utf8');

// The regex will match the entire include block
const includeBlockRegex = /\s*<div id="include">[\s\S]*?<\/div>/;
const match = content.match(includeBlockRegex);

if (match) {
    const includeBlock = match[0];
    
    // Remove the include block from its current position
    content = content.replace(includeBlockRegex, '');
    
    // Insert the include block right before <div id="data">
    content = content.replace(/\s*<div id="data">/, includeBlock + '\n\n                     <div id="data">');
    
    fs.writeFileSync(file, content, 'utf8');
    console.log("Reordered include block successfully.");
} else {
    console.log("Include block not found.");
}
