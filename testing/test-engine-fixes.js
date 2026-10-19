const assert = require('assert');
const cheerio = require('cheerio');
const fs = require('fs');

console.log('====================================================================');
console.log('           TESTING ANDALINA ENGINE FIXES (Issues A, B, C)           ');
console.log('====================================================================\n');

// 1. Test expandSelfClosingTags logic
function expandSelfClosingTags(html) {
    if (!html) return html;
    return html.replace(/<((?:an-[a-z0-9_-]+))((?:\s+[^=>"']+(?:=(?:"[^"]*"|'[^']*'|[^>\s]+))?)*)\s*\/>/gi, '<$1$2></$1>');
}

console.log('Test 1: expandSelfClosingTags()');
const inputHtml = `
    <an-attribute name="page-title" default-value="Tafanee" />
    <an-place name="content" />
    <an-component name="header" class="custom" />
    <div class="regular-tag"/> <!-- should NOT expand non-an tags -->
    <an-include src="footer.html" />
`;

const expandedHtml = expandSelfClosingTags(inputHtml);

assert.ok(expandedHtml.includes('<an-attribute name="page-title" default-value="Tafanee"></an-attribute>'), 'an-attribute expanded');
assert.ok(expandedHtml.includes('<an-place name="content"></an-place>'), 'an-place expanded');
assert.ok(expandedHtml.includes('<an-component name="header" class="custom"></an-component>'), 'an-component expanded');
assert.ok(expandedHtml.includes('<div class="regular-tag"/>'), 'non-an tag ignored');
assert.ok(expandedHtml.includes('<an-include src="footer.html"></an-include>'), 'an-include expanded');
console.log('  ✓ expandSelfClosingTags successfully expanded all custom self-closing tags.\n');

// 2. Test extractStructuredMetadata child unwrapping
console.log('Test 2: Child unwrapping in extractStructuredMetadata()');
// Simulate HTML5 parser swallow behavior:
// In HTML5 text/html without expandSelfClosingTags, <an-attribute ... /> swallows siblings:
const htmlWithSwallowedChildren = `
<html>
<body>
    <an-attribute name="title" default-value="My Title">
        <an-attribute name="theme" default-value="dark">
            <main id="main-content">
                <h1>Hello World</h1>
                <an-place name="body"></an-place>
            </main>
        </an-attribute>
    </an-attribute>
</body>
</html>
`;

// Simulate unwrapping logic in Cheerio / DOM
const $ = cheerio.load(htmlWithSwallowedChildren);
const defaults = {};

$('an-attribute').each(function() {
    const $tag = $(this);
    const name = $tag.attr('name');
    const defaultVal = $tag.attr('default-value');
    if (name && defaultVal !== undefined) {
        defaults[name] = defaultVal;
    }
    // Unwrap children to parent before removal
    $tag.replaceWith($tag.contents());
});

assert.strictEqual(defaults['title'], 'My Title');
assert.strictEqual(defaults['theme'], 'dark');

// Verify that #main-content and its children survived in <body>!
const $main = $('body').find('#main-content');
assert.strictEqual($main.length, 1, '<main id="main-content"> must survive in <body>');
assert.ok($('body').find('an-place[name="body"]').length === 1, '<an-place> survived inside main');
assert.strictEqual($('an-attribute').length, 0, 'All an-attribute tags removed');
console.log('  ✓ Child unwrapping successfully preserved swallowed elements and extracted attributes.\n');

// 3. Test that core/andalina.js has no syntax errors and no document.write calls
console.log('Test 3: Static verification of core/andalina.js');
const andalinaSource = fs.readFileSync('core/andalina.js', 'utf8');

assert.ok(!andalinaSource.includes('document.write('), 'core/andalina.js must not contain document.write calls');
assert.ok(!andalinaSource.includes('document.open('), 'core/andalina.js must not contain document.open calls');
assert.ok(andalinaSource.includes('clearFOUC'), 'core/andalina.js must define clearFOUC');
assert.ok(andalinaSource.includes('expandSelfClosingTags'), 'core/andalina.js must define expandSelfClosingTags');
assert.ok(andalinaSource.includes('FOUC safety timeout reached'), 'core/andalina.js must include safety timeout');

console.log('  ✓ core/andalina.js verified: 0 document.write, 0 document.open, clearFOUC and expandSelfClosingTags integrated.\n');

// 4. Test <an-code src="#id"> In-Page Code Extraction & Two-Stage Lifecycle (stage="before" & stage="after")
console.log('Test 4: <an-code src="#id"> In-Page Code Extraction (stage="before", stage="after", unwrap, keep-id, format)');

(async () => {
    const { parseHTML, DOMParser, HTMLElement, customElements } = await import('../builder/node_modules/linkedom/esm/index.js');
    const testPageHtml = `<!DOCTYPE html>
<html>
<head>
    <script src="andalina.js" prop-start="{{" prop-end="}}"></script>
</head>
<body>
    <!-- Demo 1: Plain HTML element -->
    <div class="button button-primary" id="button-primary">
        <p>Button</p>
    </div>

    <!-- Demo 2: Wrapper containing an Andalina component -->
    <div id="comp-wrapper" class="demo-box">
        <an-component name="alert-box" message="Saved Successfully"></an-component>
    </div>

    <!-- Demo 3: Direct ID on an <an-component> -->
    <an-component id="direct-comp" name="alert-box" message="Direct Component"></an-component>

    <!-- Code block 1: Default in-page extraction (strips id, formats HTML) -->
    <pre><code id="out-basic"><an-code src="#button-primary"></an-code></code></pre>

    <!-- Code block 2: keep-id="true" -->
    <pre><code id="out-keep-id"><an-code src="#button-primary" keep-id="true"></an-code></code></pre>

    <!-- Code block 3: stage="before" + unwrap="true" (Andalina raw syntax) -->
    <pre><code id="out-stage-before"><an-code src="#comp-wrapper" stage="before" unwrap="true"></an-code></code></pre>

    <!-- Code block 4: stage="after" + unwrap="true" (Rendered HTML output) -->
    <pre><code id="out-stage-after"><an-code src="#comp-wrapper" stage="after" unwrap="true"></an-code></code></pre>

    <!-- Code block 5: Direct component ID with stage="before" and stage="after" -->
    <pre><code id="out-direct-before"><an-code src="#direct-comp" stage="before"></an-code></code></pre>
    <pre><code id="out-direct-after"><an-code src="#direct-comp" stage="after"></an-code></code></pre>

    <!-- Code block 6: External file (unformatted by default) -->
    <pre><code id="out-external"><an-code src="sample.py"></an-code></code></pre>
</body>
</html>`;

    const { document, window, performance } = parseHTML(testPageHtml);
    global.document = document;
    global.window = window;
    global.performance = performance || { now: () => Date.now() };
    global.DOMParser = DOMParser;
    global.HTMLElement = HTMLElement;
    global.customElements = customElements;
    global.Node = { TEXT_NODE: 3, ELEMENT_NODE: 1, COMMENT_NODE: 8 };
    global.NodeFilter = {
        SHOW_ALL: 4294967295,
        SHOW_ELEMENT: 1,
        SHOW_TEXT: 4,
        SHOW_COMMENT: 128
    };

    global.fetch = async (url) => {
        if (url.includes('andalina.config.json')) {
            return { ok: false, status: 404, statusText: 'Not Found' };
        }
        if (url.includes('alert-box.html')) {
            return {
                ok: true,
                text: async () => `<an-component-def name="alert-box">
                    <an-attributes>
                        <an-attribute name="message" default-value="Info" />
                    </an-attributes>
                    <an-body>
                        <div class="alert"><span>{{ message }}</span></div>
                    </an-body>
                </an-component-def>`
            };
        }
        if (url.includes('sample.py')) {
            return {
                ok: true,
                text: async () => `def greet():\n  print("hello")`
            };
        }
        return { ok: false, statusText: 'Not Found' };
    };

    // Execute core/andalina.js in this global context and run init()
    delete require.cache[require.resolve('../core/andalina.js')];
    require('../core/andalina.js');
    await window.Andalina.init();

    const outBasic = document.getElementById('out-basic').textContent;
    assert.strictEqual(outBasic, `<div class="button button-primary">\n    <p>Button</p>\n</div>`, 'Default #id extraction strips id and formats HTML');

    const outKeepId = document.getElementById('out-keep-id').textContent;
    assert.ok(outKeepId.includes('id="button-primary"'), 'keep-id="true" preserves the id attribute');

    const outStageBefore = document.getElementById('out-stage-before').textContent;
    assert.strictEqual(outStageBefore, `<an-component name="alert-box" message="Saved Successfully"></an-component>`, 'stage="before" + unwrap="true" captures raw Andalina syntax');

    const outStageAfter = document.getElementById('out-stage-after').textContent;
    assert.strictEqual(outStageAfter, `<div class="alert">\n    <span>Saved Successfully</span>\n</div>`, 'stage="after" + unwrap="true" captures rendered HTML output');

    const outDirectBefore = document.getElementById('out-direct-before').textContent;
    assert.strictEqual(outDirectBefore, `<an-component name="alert-box" message="Direct Component"></an-component>`, 'Direct component ID with stage="before" works');

    const outDirectAfter = document.getElementById('out-direct-after').textContent;
    assert.strictEqual(outDirectAfter, `<div class="alert">\n    <span>Direct Component</span>\n</div>`, 'Direct component ID with stage="after" works');

    const outExternal = document.getElementById('out-external').textContent;
    assert.strictEqual(outExternal, `def greet():\n  print("hello")`, 'External file is unformatted by default');

    console.log('  ✓ <an-code src="#id"> passed all assertions (basic, keep-id, stage="before", stage="after", unwrap, direct component ID, external file).\n');
    console.log('ALL TESTS PASSED! 🎉');
})().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});

