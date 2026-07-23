const fs = require('fs');
const path = require('path');

const codesDir = 'c:/Users/moata/OneDrive/MOATAZ/Projects/Coding/Js/Andalina/website2/codes';
const docFile = 'c:/Users/moata/OneDrive/MOATAZ/Projects/Coding/Js/Andalina/website2/documentation.html';

const mappings = {
    'code-1.txt': 'installation-example-01.txt',
    'code-2.txt': 'an-repeat-example-01.txt',
    'code-17.txt': 'an-repeat-rendered-html-1.txt',

    'code-3.txt': 'an-include-example-01.txt',
    'code-4.txt': 'an-include-example-02.txt',
    'code-18.txt': 'an-include-rendered-html-1.txt',

    'code-5.txt': 'an-component-example-01.txt',
    'code-6.txt': 'an-component-example-02.txt',
    'code-19.txt': 'an-component-rendered-html-1.txt',

    'code-7.txt': 'an-layout-template-example-01.txt',
    'code-8.txt': 'an-layout-template-example-02.txt',
    'code-20.txt': 'an-layout-template-rendered-html-1.txt',

    'code-9.txt': 'an-page-template-example-01.txt',
    'code-10.txt': 'an-page-template-example-02.txt',
    'code-21.txt': 'an-page-template-rendered-html-1.txt',

    'code-11.txt': 'an-code-example-01.txt',
    'code-12.txt': 'an-code-example-02.txt',
    'code-13.txt': 'an-code-example-03.txt',

    'code-14.txt': 'configuration-example-01.txt',
    'code-15.txt': 'configuration-example-02.txt',

    'code-16.txt': 'show-rendered-html-example-01.txt'
};

let docContent = fs.readFileSync(docFile, 'utf8');

for (const [oldName, newName] of Object.entries(mappings)) {
    const oldPath = path.join(codesDir, oldName);
    const newPath = path.join(codesDir, newName);
    
    // Rename file if it exists
    if (fs.existsSync(oldPath)) {
        fs.renameSync(oldPath, newPath);
        console.log(`Renamed ${oldName} to ${newName}`);
    } else {
        console.log(`Skipped ${oldName} (does not exist)`);
    }

    // Replace in documentation.html
    // We use a global replace for the specific oldName string
    const searchStr = `src="codes/${oldName}"`;
    const replaceStr = `src="codes/${newName}"`;
    docContent = docContent.split(searchStr).join(replaceStr);
}

fs.writeFileSync(docFile, docContent, 'utf8');
console.log('Finished updating documentation.html.');
