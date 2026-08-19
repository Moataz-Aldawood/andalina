const { DOMParser, parseHTML } = require('linkedom');
const mainDoc = parseHTML('<html></html>').document;
const parser = new DOMParser();
const includeDoc = parser.parseFromString('<head><link href="a.css"></head>', 'text/html');
const walker = mainDoc.createTreeWalker(includeDoc, -1);
const h = includeDoc.querySelector('head');
console.log(Array.from(h.childNodes).map(n => n.nodeName));
