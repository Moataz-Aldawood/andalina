/**
 * Andalina - Zero-dependency HTML template parser
 * A development-time tool for client-side HTML composition.
 * Version: 1.8.1
 * License: GNU Lesser General Public License v3.0 (LGPL-3.0-or-later)
 */
(function() {
    // 1. Configuration (Prefix detection)
    const scriptTag = document.currentScript || Array.from(document.querySelectorAll('script')).find(s => (s.getAttribute('src') || '').includes('andalina.js'));

    let globalConfig = {
        showRenderedHtml: false,
        debug: false,
        preventFOUC: false,
        propStart: null, // Mandatory
        propEnd: null,   // Mandatory
        prefix: 'an',
        componentsPath: 'components',
        codesPath: '',
        layoutsPath: '',
        templatesPath: '',
        includesPath: 'includes',
        extension: '.html',
        version: ''
    };

    const globalData = {};
    const rawSnapshots = new Map();
    const renderedSnapshots = new Map();

    function resolvePath(obj, path) {
        const normalizedPath = path.replace(/\[(\d+)\]/g, '.$1');
        return normalizedPath.split('.').reduce((acc, part) => acc && acc[part] !== undefined ? acc[part] : undefined, obj);
    }

    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function isEnabled(val) {
        return val === 'enabled' || val === true || val === 'true';
    }

    function formatHTML(html) {
        if (!html) return '';
        // Clean up extra whitespaces between tags
        html = html.replace(/>\s*</g, '><');

        // Split on tags
        const reg = /(<[^>]+>)/g;
        const parts = html.split(reg).filter(Boolean);
        let formatted = '';
        let indent = '';
        const tab = '    '; // 4 spaces
        const voidElements = ['input', 'img', 'br', 'hr', 'link', 'meta', 'use', 'col', 'base', 'area', 'embed', 'param', 'source', 'track', 'wbr'];

        parts.forEach(part => {
            if (part.startsWith('</')) {
                // Closing tag
                indent = indent.substring(tab.length);
                formatted += indent + part + '\n';
            } else if (part.startsWith('<') && !part.endsWith('/>') && !part.startsWith('<!')) {
                // Opening tag
                const tagNameMatch = part.match(/^<([\w:-]+)/);
                const tagName = tagNameMatch ? tagNameMatch[1].toLowerCase() : '';
                const isVoid = voidElements.includes(tagName);

                formatted += indent + part + '\n';
                if (!isVoid) {
                    indent += tab;
                }
            } else if (part.startsWith('<') && (part.endsWith('/>') || part.startsWith('<!'))) {
                // Self-closing tag or comment/doctype
                formatted += indent + part + '\n';
            } else {
                // Text node
                if (part.trim()) {
                    formatted += indent + part.trim() + '\n';
                }
            }
        });

        // Post-processing to join inline text tags and empty tag pairs back to a single line
        formatted = formatted
            .replace(/(<([\w:-]+)[^>]*>)\n\s*([^<]+)\n\s*(<\/\2>)/g, '$1$3$4')
            .replace(/(<([\w:-]+)[^>]*>)\n\s*(<\/\2>)/g, '$1$3');

        return formatted.trim();
    }

    function findElementById(root, id) {
        if (!root || !id) return null;
        if (root.getElementById) {
            const found = root.getElementById(id);
            if (found) return found;
        }
        if (typeof document !== 'undefined' && document.getElementById) {
            const found = document.getElementById(id);
            if (found) return found;
        }
        if (typeof document !== 'undefined' && document.createTreeWalker) {
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
            let node = walker.nextNode();
            while (node) {
                if (node.getAttribute && node.getAttribute('id') === id) {
                    return node;
                }
                node = walker.nextNode();
            }
        }
        return null;
    }

    function captureRawSnapshots(root) {
        if (!root || typeof document === 'undefined' || !document.createTreeWalker) return;
        if (root.nodeType === Node.ELEMENT_NODE && root.getAttribute) {
            const rootId = root.getAttribute('id');
            if (rootId && !rawSnapshots.has(rootId)) {
                rawSnapshots.set(rootId, root.cloneNode(true));
            }
        }
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
        let el = walker.nextNode();
        while (el) {
            if (el.getAttribute) {
                const id = el.getAttribute('id');
                if (id && !rawSnapshots.has(id)) {
                    rawSnapshots.set(id, el.cloneNode(true));
                }
            }
            el = walker.nextNode();
        }
    }

    function recordRenderedSnapshot(id, fragment) {
        if (!id || !fragment) return;
        const wrapper = document.createElement('div');
        wrapper.setAttribute('data-an-unwrap', 'true');
        Array.from(fragment.childNodes).forEach(n => wrapper.appendChild(n.cloneNode(true)));
        renderedSnapshots.set(id, wrapper);
    }

    function clearFOUC() {
        if (!globalConfig.preventFOUC) return;
        if (typeof document === 'undefined') return;
        const foucStyle = document.getElementById('andalina-fouc');
        if (foucStyle) {
            foucStyle.remove();
            if (document.body && typeof document.body.animate === 'function') {
                document.body.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: 'ease-in' });
            }
        }
    }

    // Aggressively prevent FOUC if script tag dictates it (before async config load)
    if (scriptTag && (isEnabled(scriptTag.getAttribute('prevent-fouc')) || isEnabled(scriptTag.getAttribute('data-prevent-fouc')))) {
        globalConfig.preventFOUC = true;
        document.head.insertAdjacentHTML('beforeend', '<style id="andalina-fouc">body { opacity: 0 !important; }</style>');
        if (typeof window !== 'undefined') {
            setTimeout(() => {
                if (document.getElementById('andalina-fouc')) {
                    console.warn('[Andalina] FOUC safety timeout reached (4s). Revealing page body.');
                    clearFOUC();
                }
            }, 4000);
        }
    }

    // Tag definitions
    let tInclude, tLayout, tComponent, tTemplate, tInject, tPlace, tAttribute, tRepeat, tCode, tData;
    let tComponentDef, tLayoutDef, tAttributes, tBody;

    function buildTagNames() {
        const p = globalConfig.prefix;
        tInclude = `${p}-include`;
        tLayout = `${p}-layout`;
        tComponent = `${p}-component`;
        tTemplate = `${p}-template`;
        tInject = `${p}-inject`;
        tPlace = `${p}-place`;
        tAttribute = `${p}-attribute`;
        tRepeat = `${p}-repeat`;
        tCode = `${p}-code`;
        tData = `${p}-data`;
        tComponentDef = `${p}-component-def`;
        tLayoutDef = `${p}-layout-def`;
        tAttributes = `${p}-attributes`;
        tBody = `${p}-body`;
    }

    // Cache for fetched fragments
    const cache = new Map();

    // Expands XML-style self-closing Andalina tags (<an-tag ... />) into explicit pairs (<an-tag ...></an-tag>)
    // This prevents HTML5 parsers (DOMParser) from nesting subsequent sibling elements inside non-void custom tags.
    function expandSelfClosingTags(html) {
        if (!html) return html;
        return html.replace(/<((?:an-[a-z0-9_-]+))((?:\s+[^=>"']+(?:=(?:"[^"]*"|'[^']*'|[^>\s]+))?)*)\s*\/>/gi, '<$1$2></$1>');
    }

    // Sanitizes local development-server reload scripts (e.g. VS Code Live Server WebSocket reloaders)
    function sanitizeDevServerScripts(html) {
        if (!html) return html;
        return html
            .replace(/<!--\s*Code injected by live-server\s*-->[\s\S]*?<\/script>/gi, '')
            .replace(/<script\b[^>]*>[\s\S]*?(?:Live-Reloading|live-server|Live reload enabled)[\s\S]*?<\/script>/gi, '');
    }

    function isDevServerScript(scriptNode) {
        if (!scriptNode) return false;
        const text = scriptNode.textContent || scriptNode.innerHTML || '';
        return text.includes('Code injected by live-server') || 
               text.includes('Live-Reloading') || 
               text.includes('Live reload enabled') || 
               (text.includes('WebSocket') && text.includes('reload') && text.includes('refreshcss'));
    }

    async function fetchFragment(url) {
        if (cache.has(url)) {
            return cache.get(url);
        }
        try {
            let fetchUrl = url;
            if (globalConfig.version) {
                const separator = fetchUrl.includes('?') ? '&' : '?';
                fetchUrl += `${separator}v=${encodeURIComponent(globalConfig.version)}`;
            }
            const response = await fetch(fetchUrl);
            if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
            let text = await response.text();
            text = sanitizeDevServerScripts(text);
            cache.set(url, text);
            return text;
        } catch (error) {
            console.error(`[Andalina] Error fetching template:`, error);
            return `<div style="color:red; padding: 10px; border: 1px solid red;">[Andalina] Error loading ${url}</div>`;
        }
    }

    // Safely clones a node. If it's a script, it creates a NEW script tag 
    // so the browser executes it when appended to the DOM.
    // Uses .textContent (not .innerHTML) to avoid entity mangling (&amp;&amp; / &lt;) in script bodies.
    function cloneNodeSafe(node) {
        if (node.tagName === 'SCRIPT') {
            if (isDevServerScript(node)) {
                return document.createComment(' [Andalina] Stripped dev-server live reload script ');
            }
            const newScript = document.createElement('script');
            Array.from(node.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
            newScript.textContent = node.textContent;
            return newScript;
        }
        
        const clone = node.cloneNode(true);
        // Recursively fix nested scripts
        const scripts = clone.querySelectorAll ? clone.querySelectorAll('script') : [];
        scripts.forEach(script => {
            if (isDevServerScript(script)) {
                script.remove();
                return;
            }
            const newScript = document.createElement('script');
            Array.from(script.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
            newScript.textContent = script.textContent;
            script.replaceWith(newScript);
        });
        return clone;
    }

    function copyAttributes(source, target) {
        if (!source || !target) return;
        while (target.attributes.length > 0) {
            target.removeAttribute(target.attributes[0].name);
        }
        Array.from(source.attributes).forEach(attr => {
            target.setAttribute(attr.name, attr.value);
        });
    }

    // Extracts <an-attributes> and <an-attribute> tags in O(1) DOM time without regex stripping
    function extractStructuredMetadata(doc) {
        const defaults = {};
        const mandatoryAttrs = new Set();
        const attributesNode = doc.querySelector(tAttributes);
        if (attributesNode) {
            const attrTags = Array.from(attributesNode.querySelectorAll(tAttribute));
            attrTags.forEach(attrTag => {
                const name = attrTag.getAttribute('name');
                const defaultVal = attrTag.getAttribute('default-value');
                const mandatory = attrTag.getAttribute('mandatory') === 'true';
                if (name) {
                    if (defaultVal !== null) defaults[name] = defaultVal;
                    if (mandatory) mandatoryAttrs.add(name);
                }
            });
            attributesNode.remove();
        } else {
            // Support <an-attribute> in head/body for page templates
            const strayAttrs = Array.from(doc.querySelectorAll(tAttribute));
            strayAttrs.forEach(attrTag => {
                const name = attrTag.getAttribute('name');
                const defaultVal = attrTag.getAttribute('default-value');
                const mandatory = attrTag.getAttribute('mandatory') === 'true';
                if (name) {
                    if (defaultVal !== null) defaults[name] = defaultVal;
                    if (mandatory) mandatoryAttrs.add(name);
                }
                // Safely unwrap any swallowed sibling DOM nodes before removing
                if (attrTag.parentNode) {
                    while (attrTag.firstChild) {
                        attrTag.parentNode.insertBefore(attrTag.firstChild, attrTag);
                    }
                }
                attrTag.remove();
            });
        }
        return { defaults, mandatoryAttrs };
    }

    function processProps(targetNode, doc, fetchTime, templateDefaults = {}, mandatoryAttrs = new Set()) {        // 1. Gather props from the caller tag
        const props = {};
        Array.from(targetNode.attributes).forEach(attr => {
            if (!['name', 'src'].includes(attr.name)) {
                props[attr.name] = attr.value;
            }
        });

        // 2. Merge extracted template defaults
        const defaultKeys = Object.keys(templateDefaults);
        if (defaultKeys.length > 0 && globalConfig.debug) {
            console.log(`%c                 ├─ Found ${defaultKeys.length} <an-attribute> tags`, 'color: #7f8c8d; font-size: 11px;');
        }
        
        for (const [key, val] of Object.entries(templateDefaults)) {
            if (props[key] === undefined) {
                props[key] = val;
            }
        }

        if (mandatoryAttrs.size > 0 && globalConfig.debug) {
            mandatoryAttrs.forEach(name => {
                if (props[name] === undefined) {
                    console.warn(`[Andalina] Mandatory attribute '${name}' missing on <${targetNode.tagName.toLowerCase()}>.`);
                }
            });
        }

        // Also clean up any that somehow survived (e.g. dynamically injected later)
        const attributeTags = Array.from(doc.querySelectorAll(tAttribute));
        attributeTags.forEach(attrTag => {
            if (attrTag.parentNode) {
                while (attrTag.firstChild) {
                    attrTag.parentNode.insertBefore(attrTag.firstChild, attrTag);
                }
            }
            attrTag.remove();
        });

        if (Object.keys(props).length === 0) return;

        const walker = document.createTreeWalker(doc, NodeFilter.SHOW_ALL);
        const escapedStart = escapeRegExp(globalConfig.propStart);
        const escapedEnd = escapeRegExp(globalConfig.propEnd);

        let currentNode = walker.nextNode();
        while (currentNode) {
            if (currentNode.nodeType === Node.TEXT_NODE) {
                let text = currentNode.nodeValue;
                for (const [key, value] of Object.entries(props)) {
                    const regex = new RegExp(`${escapedStart}\\s*${key}\\s*${escapedEnd}`, 'g');
                    text = text.replace(regex, value);
                }
                if (text !== currentNode.nodeValue) {
                    currentNode.nodeValue = text;
                }
            } else if (currentNode.nodeType === Node.ELEMENT_NODE) {
                Array.from(currentNode.attributes).forEach(attr => {
                    let text = attr.value;
                    for (const [key, value] of Object.entries(props)) {
                        const regex = new RegExp(`${escapedStart}\\s*${key}\\s*${escapedEnd}`, 'g');
                        text = text.replace(regex, value);
                    }
                    if (text !== attr.value) {
                        attr.value = text;
                    }
                });
            }
            currentNode = walker.nextNode();
        }
        return props;
    }

    // Scopes <an-inject> slot extraction to direct children of containerNode,
    // preventing nested components or layouts from colliding with parent slot names.
    function getDirectInjects(containerNode) {
        if (!containerNode || !containerNode.querySelectorAll) return [];
        const selector = `${tTemplate}, ${tLayout}, ${tComponent}`;
        return Array.from(containerNode.querySelectorAll(tInject)).filter(inj => {
            if (inj.closest) {
                return inj.closest(selector) === containerNode;
            }
            let parent = inj.parentElement;
            while (parent && parent !== containerNode) {
                const tag = parent.tagName ? parent.tagName.toLowerCase() : '';
                if (tag === tTemplate || tag === tLayout || tag === tComponent) {
                    return false;
                }
                parent = parent.parentElement;
            }
            return parent === containerNode;
        });
    }

    async function processNodes(context, parentTrackerNode = null) {
        let iterations = 0;
        const maxIterations = 1000;
        const parser = new DOMParser();

        captureRawSnapshots(context);

        while (true) {
            iterations++;
            if (iterations > maxIterations) {
                console.error('[Andalina] Max iterations reached. Possible circular dependency.');
                break;
            }

            const dataNode = context.querySelector(tData);
            const repeatNode = context.querySelector(tRepeat);
            const includeNode = context.querySelector(tInclude);
            const layoutNode = context.querySelector(tLayout);
            const componentNode = context.querySelector(tComponent);
            const pageNode = context.querySelector(tTemplate);
            const ifNode = context.querySelector('an-if');

            if (!dataNode && !repeatNode && !ifNode && !includeNode && !layoutNode && !componentNode && !pageNode) {
                // If no normal tags are left, cleanup any orphaned <an-else> tags
                const strayElse = context.querySelector('an-else');
                if (strayElse) {
                    strayElse.remove();
                    continue;
                }
                break;
            }

            // 0.1 Process Data tags (Dynamic fetching for components)
            if (dataNode) {
                const src = dataNode.getAttribute('src');
                const name = dataNode.getAttribute('name');
                if (src && name) {
                    try {
                        const t0 = performance.now();
                        const response = await fetch(src);
                        if (response.ok) {
                            const json = await response.json();
                            globalData[name] = json;
                            if (globalConfig.debug) {
                                console.log(`%c[Andalina Debug] ✓ Fetched data '${name}' from ${src} (${Math.round(performance.now() - t0)}ms)`, 'color: #2ecc71;');
                            }
                        } else {
                            console.error(`[Andalina] Failed to fetch data '${name}' from ${src}: ${response.status}`);
                        }
                    } catch (e) {
                        console.error(`[Andalina] Error fetching data '${name}' from ${src}:`, e);
                    }
                }
                dataNode.remove();
                continue;
            }

            // 0.2 Process Repeats (Development-time loops and Data arrays)
            if (repeatNode) {
                const dataName = repeatNode.getAttribute('data');
                const times = parseInt(repeatNode.getAttribute('times'), 10);
                const indexAs = repeatNode.getAttribute('index-as') || '$index';
                const itemAs = repeatNode.getAttribute('item') || 'item';
                const repeatId = repeatNode.getAttribute('id');
                
                let targetDataArray;
                if (dataName) {
                    targetDataArray = resolvePath(globalData, dataName);
                }

                console.log(`[Andalina Debug] an-repeat found. dataName=${dataName}, times=${times}. Array.isArray=${Array.isArray(targetDataArray)}`);
                
                const fragment = document.createDocumentFragment();
                const escapedStart = escapeRegExp(globalConfig.propStart);
                const escapedEnd = escapeRegExp(globalConfig.propEnd);
                const indexRegex = new RegExp(`${escapedStart}\\s*${escapeRegExp(indexAs)}\\s*${escapedEnd}`, 'g');
                
                if (Array.isArray(targetDataArray)) {
                    const dataArray = targetDataArray;
                    const itemRegex = new RegExp(`${escapedStart}\\s*${escapeRegExp(itemAs)}(?:\\.([\\w\\.]+))?\\s*${escapedEnd}`, 'g');

                    for (let i = 0; i < dataArray.length; i++) {
                        const itemObj = dataArray[i];
                        const temp = document.createElement('div');
                        let content = repeatNode.innerHTML;
                        
                        // Replace index
                        content = content.replace(indexRegex, i);
                        
                        // Evaluate all JS expressions in context of the loop iteration
                        const evalRegex = new RegExp(`${escapedStart}\\s*(.+?)\\s*${escapedEnd}`, 'g');
                        content = content.replace(evalRegex, (match, expression) => {
                            try {
                                const mergedData = { ...globalData, [itemAs]: itemObj, [indexAs]: i };
                                const val = new Function('data', `with(data) { return (${expression}); }`)(mergedData);
                                if (val !== undefined) {
                                    return typeof val === 'object' ? JSON.stringify(val) : val;
                                }
                            } catch (e) {
                                // If it fails (e.g. nested repeat variables not yet defined), leave it untouched
                            }
                            return match;
                        });
                        
                        temp.innerHTML = content;
                        Array.from(temp.childNodes).forEach(node => fragment.appendChild(cloneNodeSafe(node)));
                    }
                    if (repeatId) recordRenderedSnapshot(repeatId, fragment);
                    repeatNode.replaceWith(fragment);
                } else if (!isNaN(times) && times > 0) {
                    for (let i = 1; i <= times; i++) {
                        const temp = document.createElement('div');
                        let content = repeatNode.innerHTML;
                        content = content.replace(indexRegex, i);
                        temp.innerHTML = content;
                        Array.from(temp.childNodes).forEach(node => fragment.appendChild(cloneNodeSafe(node)));
                    }
                    if (repeatId) recordRenderedSnapshot(repeatId, fragment);
                    repeatNode.replaceWith(fragment);
                } else {
                    repeatNode.remove();
                }
                continue;
            }

            // 0.3 Process Conditionals
            if (ifNode) {
                const condition = ifNode.getAttribute('condition');
                const ifId = ifNode.getAttribute('id');
                let isTrue = false;
                if (condition) {
                    try {
                        isTrue = new Function('data', `with(data) { return !!(${condition}); }`)(globalData);
                    } catch (e) {
                        if (globalConfig.debug) {
                            console.warn(`[Andalina] Warning: Failed to evaluate condition: '${condition}'`, e);
                        }
                        isTrue = false;
                    }
                }
                
                // Find adjacent <an-else> by skipping text nodes and comments
                let nextEl = ifNode.nextSibling;
                while (nextEl && ((nextEl.nodeType === Node.TEXT_NODE && nextEl.nodeValue.trim() === '') || nextEl.nodeType === Node.COMMENT_NODE)) {
                    nextEl = nextEl.nextSibling;
                }
                let elseNode = null;
                if (nextEl && nextEl.nodeType === Node.ELEMENT_NODE && nextEl.tagName.toLowerCase() === 'an-else') {
                    elseNode = nextEl;
                }

                if (isTrue) {
                    // Unwrap <an-if>
                    const fragment = document.createDocumentFragment();
                    Array.from(ifNode.childNodes).forEach(child => fragment.appendChild(cloneNodeSafe(child)));
                    if (ifId) recordRenderedSnapshot(ifId, fragment);
                    ifNode.replaceWith(fragment);
                    
                    // Remove adjacent <an-else>
                    if (elseNode) {
                        elseNode.remove();
                    }
                } else {
                    // Remove <an-if>
                    ifNode.remove();
                    
                    // Unwrap <an-else>
                    if (elseNode) {
                        const elseId = elseNode.getAttribute('id') || ifId;
                        const fragment = document.createDocumentFragment();
                        Array.from(elseNode.childNodes).forEach(child => fragment.appendChild(cloneNodeSafe(child)));
                        if (elseId) recordRenderedSnapshot(elseId, fragment);
                        elseNode.replaceWith(fragment);
                    }
                }
                continue;
            }

            // 1. Process Page Templates (Full Document Swap)
            if (pageNode) {
                let src = pageNode.getAttribute('src');
                if (!src) {
                    const name = pageNode.getAttribute('name');
                    if (name) {
                        const basePath = globalConfig.templatesPath.replace(/\/$/, '');
                        src = basePath ? `${basePath}/${name}${globalConfig.extension}` : `${name}${globalConfig.extension}`;
                    }
                }

                if (src) {
                    const t0 = performance.now();
                    const pageHtml = expandSelfClosingTags(await fetchFragment(src));
                    const fetchTime = Math.round(performance.now() - t0);

                    let doc = parser.parseFromString(pageHtml, 'text/html');
                    if (!doc.body && !pageHtml.includes('<body')) {
                        doc = parser.parseFromString(`<html><body>${pageHtml}</body></html>`, 'text/html');
                    }

                    captureRawSnapshots(doc);

                    // 1. Merge Configs
                    const configStr = doc.documentElement.getAttribute('data-config');
                    const extracted = extractStructuredMetadata(doc);
                    
                    const props = processProps(pageNode, doc, fetchTime, extracted.defaults, extracted.mandatoryAttrs);
                    
                    const trackerNode = {
                        name: 'Template',
                        src: src,
                        props: props,
                        fetchTime: fetchTime,
                        parseTime: 0,
                        children: []
                    };
                    if (parentTrackerNode) parentTrackerNode.children.push(trackerNode);

                    // Collect <an-inject> blocks from the child template (scoped to direct children)
                    const injects = getDirectInjects(pageNode);
                    const blocks = {};
                    injects.forEach(inj => {
                        const name = inj.getAttribute('name');
                        if (name) blocks[name] = inj.innerHTML;
                    });

                    // Fill <an-place> in the master layout
                    const places = Array.from(doc.querySelectorAll(tPlace));
                    places.forEach(plc => {
                        const name = plc.getAttribute('name');
                        if (name && blocks[name] !== undefined) {
                            plc.outerHTML = blocks[name];
                        } else {
                            plc.outerHTML = plc.innerHTML; 
                        }
                    });

                    const tParse0 = performance.now();
                    await processNodes(doc.documentElement, trackerNode);
                    trackerNode.parseTime = Math.round(performance.now() - tParse0);

                    // Rebuild entire document cleanly via DOM (replaces document.write)
                    if (doc.documentElement) {
                        Array.from(doc.documentElement.attributes).forEach(attr => {
                            document.documentElement.setAttribute(attr.name, attr.value);
                        });
                    }

                    if (doc.head) {
                        Array.from(doc.head.attributes).forEach(attr => {
                            document.head.setAttribute(attr.name, attr.value);
                        });

                        Array.from(doc.head.childNodes).forEach(node => {
                            if (node.nodeType === Node.TEXT_NODE && !node.nodeValue.trim()) return;
                            if (node.tagName === 'SCRIPT' && (node.getAttribute('src') || '').includes('andalina.js')) return; // Don't reload andalina
                            if (node.tagName === 'TITLE') {
                                if (document.head.querySelector('title')) return; // Caller title wins
                            }
                            if (node.tagName === 'LINK' && node.getAttribute('href')) {
                                const href = node.getAttribute('href');
                                if (Array.from(document.head.querySelectorAll('link')).some(l => l.getAttribute('href') === href)) return;
                            }
                            if (node.tagName === 'SCRIPT' && node.getAttribute('src')) {
                                const src = node.getAttribute('src');
                                if (Array.from(document.head.querySelectorAll('script')).some(s => s.getAttribute('src') === src)) return;
                            }
                            document.head.appendChild(cloneNodeSafe(node));
                        });
                    }

                    if (doc.body) {
                        Array.from(doc.body.attributes).forEach(attr => {
                            document.body.setAttribute(attr.name, attr.value);
                        });

                        document.body.innerHTML = '';
                        Array.from(doc.body.childNodes).forEach(node => {
                            document.body.appendChild(cloneNodeSafe(node));
                        });
                    }

                    // Re-start processing from the newly injected body
                    context = document.body;
                    continue; 
                } else {
                    pageNode.remove();
                }
            }
            // 2. Process Layouts and Components (Inner Body Composition)
            else if (layoutNode || componentNode) {
                const targetNode = layoutNode || componentNode;
                const targetId = targetNode.getAttribute('id');
                let src = targetNode.getAttribute('src');
                
                if (!src) {
                    const name = targetNode.getAttribute('name');
                    if (name) {
                        if (targetNode.tagName.toLowerCase() === tComponent) {
                            const basePath = globalConfig.componentsPath.replace(/\/$/, '');
                            src = basePath ? `${basePath}/${name}${globalConfig.extension}` : `${name}${globalConfig.extension}`;
                        } else if (targetNode.tagName.toLowerCase() === tLayout) {
                            const basePath = globalConfig.layoutsPath.replace(/\/$/, '');
                            src = basePath ? `${basePath}/${name}${globalConfig.extension}` : `${name}${globalConfig.extension}`;
                        }
                    }
                }

                if (src) {
                    const t0 = performance.now();
                    const layoutHtml = expandSelfClosingTags(await fetchFragment(src));
                    const fetchTime = Math.round(performance.now() - t0);

                    let doc = parser.parseFromString(layoutHtml, 'text/html');
                    if (!doc.body && !layoutHtml.includes('<body')) {
                        doc = parser.parseFromString(`<html><body>${layoutHtml}</body></html>`, 'text/html');
                    }

                    captureRawSnapshots(doc);

                    // Verify structured syntax for components & layouts
                    const isComponent = targetNode.tagName.toLowerCase() === tComponent;
                    const expectedDef = isComponent ? tComponentDef : tLayoutDef;
                    const defNode = doc.querySelector(expectedDef);
                    if (!defNode) {
                        console.error(`[Andalina] Structured Syntax Error: '${src}' must be wrapped in <${expectedDef}> and <${tBody}>.`);
                    }

                    const extracted = extractStructuredMetadata(doc);
                    const props = processProps(targetNode, doc, fetchTime, extracted.defaults, extracted.mandatoryAttrs);
                    
                    const trackerNode = {
                        name: isComponent ? 'Component' : 'Layout',
                        src: src,
                        props: props,
                        fetchTime: fetchTime,
                        parseTime: 0,
                        children: []
                    };
                    if (parentTrackerNode) parentTrackerNode.children.push(trackerNode);

                    let layoutContainer = doc.body ? doc.body : doc.documentElement;
                    const bodyNode = doc.querySelector(tBody);
                    if (bodyNode) {
                        layoutContainer = bodyNode;
                    }

                    const injects = getDirectInjects(targetNode);
                    const blocks = {};
                    injects.forEach(inj => {
                        const name = inj.getAttribute('name');
                        if (name) blocks[name] = inj.innerHTML;
                    });

                    const places = Array.from(layoutContainer.querySelectorAll(tPlace));
                    places.forEach(plc => {
                        const name = plc.getAttribute('name');
                        if (name && blocks[name] !== undefined) {
                            plc.outerHTML = blocks[name];
                        } else {
                            plc.outerHTML = plc.innerHTML; 
                        }
                    });

                    const tParse0 = performance.now();
                    await processNodes(layoutContainer, trackerNode);
                    trackerNode.parseTime = Math.round(performance.now() - tParse0);

                    const fragment = document.createDocumentFragment();
                    Array.from(layoutContainer.childNodes).forEach(node => {
                        fragment.appendChild(cloneNodeSafe(node));
                    });
                    if (targetId) recordRenderedSnapshot(targetId, fragment);
                    targetNode.replaceWith(fragment);
                } else {
                    targetNode.remove();
                }
            }
            // 3. Process plain includes
            else if (includeNode) {
                const includeId = includeNode.getAttribute('id');
                let src = includeNode.getAttribute('src');
                if (!src) {
                    const name = includeNode.getAttribute('name');
                    if (name) {
                        const basePath = globalConfig.includesPath.replace(/\/$/, '');
                        src = basePath ? `${basePath}/${name}${globalConfig.extension}` : `${name}${globalConfig.extension}`;
                    }
                }
                
                if (src) {
                    const t0 = performance.now();
                    const html = expandSelfClosingTags(await fetchFragment(src));
                    const fetchTime = Math.round(performance.now() - t0);
                    const doc = parser.parseFromString(html, 'text/html');

                    captureRawSnapshots(doc);

                    const props = processProps(includeNode, doc, fetchTime);
                    
                    const trackerNode = {
                        name: 'Include',
                        src: src,
                        props: props,
                        fetchTime: fetchTime,
                        parseTime: 0,
                        children: []
                    };
                    if (parentTrackerNode) parentTrackerNode.children.push(trackerNode);

                    const tParse0 = performance.now();
                    await processNodes(doc, trackerNode);
                    trackerNode.parseTime = Math.round(performance.now() - tParse0);
                    
                    // If included fragment was a full HTML document, optionally merge its head
                    const parsedHead = doc.querySelector('head');
                    const parsedBody = doc.querySelector('body');
                    const fragment = document.createDocumentFragment();

                    const isInHead = includeNode.closest('head') !== null;

                    if (isInHead) {
                        if (parsedHead && parsedHead.childNodes.length > 0) {
                            Array.from(parsedHead.childNodes).forEach(node => {
                                if (node.tagName === 'SCRIPT' && node.src.includes('andalina.js')) return;
                                if (node.tagName === 'TITLE') return; 
                                fragment.appendChild(cloneNodeSafe(node));
                            });
                        }
                        if (parsedBody && parsedBody.childNodes.length > 0) {
                            Array.from(parsedBody.childNodes).forEach(node => {
                                fragment.appendChild(cloneNodeSafe(node));
                            });
                        }
                        if ((!parsedHead || parsedHead.childNodes.length === 0) && (!parsedBody || parsedBody.childNodes.length === 0)) {
                            Array.from(doc.childNodes).forEach(node => {
                                fragment.appendChild(cloneNodeSafe(node));
                            });
                        }
                    } else {
                        if (html.toLowerCase().includes('<head>') && parsedHead && document.head) {
                            Array.from(parsedHead.childNodes).forEach(node => {
                                if (node.tagName === 'SCRIPT' && node.src.includes('andalina.js')) return;
                                if (node.tagName === 'TITLE') return; 
                                document.head.appendChild(cloneNodeSafe(node));
                            });
                        }

                        if (parsedBody && parsedBody.childNodes.length > 0) {
                            Array.from(parsedBody.childNodes).forEach(node => {
                                fragment.appendChild(cloneNodeSafe(node));
                            });
                        } else if (!parsedHead || parsedHead.childNodes.length === 0) {
                            Array.from(doc.childNodes).forEach(node => {
                                fragment.appendChild(cloneNodeSafe(node));
                            });
                        }
                    }
                    
                    if (includeId) recordRenderedSnapshot(includeId, fragment);
                    includeNode.replaceWith(fragment);
                } else {
                    includeNode.remove();
                }
            }
        }
    }

    async function processCodeNodes(root) {
        if (!root || !root.querySelectorAll) return;
        const codeNodes = Array.from(root.querySelectorAll(tCode));
        for (const codeNode of codeNodes) {
            const src = (codeNode.getAttribute('src') || '').trim();
            if (!src) {
                codeNode.remove();
                continue;
            }

            const formatAttr = codeNode.getAttribute('format');
            const keepId = isEnabled(codeNode.getAttribute('keep-id'));
            const unwrap = isEnabled(codeNode.getAttribute('unwrap'));
            const stage = (codeNode.getAttribute('stage') || codeNode.getAttribute('mode') || 'after').toLowerCase();

            let finalCode = '';

            if (src.startsWith('#')) {
                const targetId = src.slice(1);
                let sourceNode = null;
                let forceUnwrap = false;

                if (stage === 'before' || stage === 'raw' || stage === 'pre') {
                    if (rawSnapshots.has(targetId)) {
                        sourceNode = rawSnapshots.get(targetId).cloneNode(true);
                    } else {
                        const liveEl = findElementById(root, targetId);
                        if (liveEl) sourceNode = liveEl.cloneNode(true);
                    }
                } else {
                    const liveEl = findElementById(root, targetId);
                    if (liveEl) {
                        sourceNode = liveEl.cloneNode(true);
                    } else if (renderedSnapshots.has(targetId)) {
                        sourceNode = renderedSnapshots.get(targetId).cloneNode(true);
                        processDataBindings(sourceNode);
                        forceUnwrap = true;
                    } else if (rawSnapshots.has(targetId)) {
                        sourceNode = rawSnapshots.get(targetId).cloneNode(true);
                    }
                }

                if (sourceNode) {
                    if (!keepId && sourceNode.removeAttribute) {
                        sourceNode.removeAttribute('id');
                    }
                    const rawHtml = (unwrap || forceUnwrap) ? sourceNode.innerHTML : sourceNode.outerHTML;
                    const shouldFormat = formatAttr === null ? true : (formatAttr !== 'false' && formatAttr !== 'disabled');
                    finalCode = shouldFormat ? formatHTML(rawHtml) : rawHtml.trim();

                    if (globalConfig.debug) {
                        console.log(`%c[Andalina Debug] 📄 In-Page Code: ${src} (stage: ${stage}, format: ${shouldFormat})`, 'color: #3498db;');
                    }
                } else {
                    console.warn(`[Andalina] <${tCode}> target element '${src}' not found.`);
                    finalCode = `<!-- [Andalina] Target '${src}' not found -->`;
                }
            } else {
                const t0 = performance.now();
                const basePath = globalConfig.codesPath.replace(/\/$/, '');
                const fullPath = basePath ? `${basePath}/${src}` : src;

                const codeText = await fetchFragment(fullPath);
                const fetchTime = Math.round(performance.now() - t0);

                if (globalConfig.debug) {
                    console.log(`%c[Andalina Debug] 📄 Code: ${fullPath} (fetch: ${fetchTime}ms)`, 'color: #3498db;');
                }

                const shouldFormat = isEnabled(formatAttr);
                finalCode = shouldFormat ? formatHTML(codeText) : codeText.trim();
            }

            // Clean up surrounding empty text nodes (prevents HTML template indentation from leaking into the code block)
            const prev = codeNode.previousSibling;
            if (prev && prev.nodeType === Node.TEXT_NODE && prev.nodeValue.trim() === '') {
                prev.remove();
            }
            const next = codeNode.nextSibling;
            if (next && next.nodeType === Node.TEXT_NODE && next.nodeValue.trim() === '') {
                next.remove();
            }

            codeNode.replaceWith(document.createTextNode(finalCode));
        }
    }

    function processDataBindings(doc) {
        const walker = document.createTreeWalker(doc, NodeFilter.SHOW_ALL);
        const escapedStart = escapeRegExp(globalConfig.propStart);
        const escapedEnd = escapeRegExp(globalConfig.propEnd);
        
        const regex = new RegExp(`${escapedStart}\\s*(.+?)\\s*${escapedEnd}`, 'g');
        
        const evaluateExpression = (match, expression) => {
            try {
                const val = new Function('data', `with(data) { return (${expression}); }`)(globalData);
                if (val !== undefined) {
                    return typeof val === 'object' ? JSON.stringify(val) : val;
                }
            } catch (e) {
                // If the expression fails (e.g. undefined variable), we leave it or return match
                // We could also return an empty string, but match is safer to see unparsed templates
            }
            return match;
        };

        let currentNode = walker.nextNode();
        while (currentNode) {
            if (currentNode.nodeType === Node.TEXT_NODE) {
                let text = currentNode.nodeValue;
                if (text && text.includes(globalConfig.propStart)) {
                    text = text.replace(regex, evaluateExpression);
                    if (text !== currentNode.nodeValue) {
                        currentNode.nodeValue = text;
                    }
                }
            } else if (currentNode.nodeType === Node.ELEMENT_NODE) {
                Array.from(currentNode.attributes).forEach(attr => {
                    let text = attr.value;
                    if (text && text.includes(globalConfig.propStart)) {
                        text = text.replace(regex, evaluateExpression);
                        if (text !== attr.value) {
                            attr.value = text;
                        }
                    }
                });
            }
            currentNode = walker.nextNode();
        }
    }

    async function init() {
        const startTime = performance.now();
        
        let basePath = '';
        if (scriptTag && scriptTag.src) {
            try {
                const url = new URL(scriptTag.src, window.location.href);
                const pathParts = url.pathname.split('/');
                pathParts.pop();
                basePath = pathParts.join('/') + '/';
            } catch (e) {}
        }
        
        try {
            let configUrl = 'andalina.config.json';
            const scriptTagVersion = scriptTag ? scriptTag.getAttribute('data-version') : null;
            if (scriptTagVersion) {
                configUrl += `?v=${encodeURIComponent(scriptTagVersion)}`;
            }
            let configRes = await fetch(configUrl);
            if (!configRes.ok && basePath) {
                configRes = await fetch(basePath + configUrl);
            }
            if (configRes.ok) {
                const json = await configRes.json();
                if (json.version !== undefined) globalConfig.version = json.version;
                if (json.showRenderedHtml !== undefined) globalConfig.showRenderedHtml = isEnabled(json.showRenderedHtml);
                if (json.debug !== undefined) globalConfig.debug = isEnabled(json.debug);
                if (json.preventFOUC !== undefined) globalConfig.preventFOUC = isEnabled(json.preventFOUC);
                if (json.propStart !== undefined) globalConfig.propStart = json.propStart;
                if (json.propEnd !== undefined) globalConfig.propEnd = json.propEnd;
                if (json.prefix !== undefined) globalConfig.prefix = json.prefix;
                if (json.componentsPath !== undefined) globalConfig.componentsPath = json.componentsPath;
                if (json.codesPath !== undefined) globalConfig.codesPath = json.codesPath;
                if (json.layoutsPath !== undefined) globalConfig.layoutsPath = json.layoutsPath;
                if (json.templatesPath !== undefined) globalConfig.templatesPath = json.templatesPath;
                if (json.includesPath !== undefined) globalConfig.includesPath = json.includesPath;
                if (json.extension !== undefined) globalConfig.extension = json.extension;
            }
        } catch (e) {}
        
        if (scriptTag) {
            if (scriptTag.hasAttribute('show-rendered-html') || scriptTag.hasAttribute('data-show-rendered-html')) {
                globalConfig.showRenderedHtml = isEnabled(scriptTag.getAttribute('show-rendered-html')) || isEnabled(scriptTag.getAttribute('data-show-rendered-html'));
            }
            if (scriptTag.hasAttribute('debug') || scriptTag.hasAttribute('data-debug')) {
                globalConfig.debug = isEnabled(scriptTag.getAttribute('debug')) || isEnabled(scriptTag.getAttribute('data-debug'));
            }
            if (scriptTag.hasAttribute('prevent-fouc') || scriptTag.hasAttribute('data-prevent-fouc')) {
                globalConfig.preventFOUC = isEnabled(scriptTag.getAttribute('prevent-fouc')) || isEnabled(scriptTag.getAttribute('data-prevent-fouc'));
            }
            if (scriptTag.hasAttribute('prop-start') || scriptTag.hasAttribute('data-prop-start')) {
                globalConfig.propStart = scriptTag.getAttribute('prop-start') || scriptTag.getAttribute('data-prop-start');
            }
            if (scriptTag.hasAttribute('prop-end') || scriptTag.hasAttribute('data-prop-end')) {
                globalConfig.propEnd = scriptTag.getAttribute('prop-end') || scriptTag.getAttribute('data-prop-end');
            }
            if (scriptTag.hasAttribute('prefix') || scriptTag.hasAttribute('data-prefix')) {
                globalConfig.prefix = scriptTag.getAttribute('prefix') || scriptTag.getAttribute('data-prefix');
            }
            if (scriptTag.hasAttribute('components-path') || scriptTag.hasAttribute('data-components-path')) {
                globalConfig.componentsPath = scriptTag.getAttribute('components-path') || scriptTag.getAttribute('data-components-path');
            }
            if (scriptTag.hasAttribute('codes-path') || scriptTag.hasAttribute('data-codes-path')) {
                globalConfig.codesPath = scriptTag.getAttribute('codes-path') || scriptTag.getAttribute('data-codes-path');
            }
            if (scriptTag.hasAttribute('layouts-path') || scriptTag.hasAttribute('data-layouts-path')) {
                globalConfig.layoutsPath = scriptTag.getAttribute('layouts-path') || scriptTag.getAttribute('data-layouts-path');
            }
            if (scriptTag.hasAttribute('templates-path') || scriptTag.hasAttribute('data-templates-path')) {
                globalConfig.templatesPath = scriptTag.getAttribute('templates-path') || scriptTag.getAttribute('data-templates-path');
            }
            if (scriptTag.hasAttribute('includes-path') || scriptTag.hasAttribute('data-includes-path')) {
                globalConfig.includesPath = scriptTag.getAttribute('includes-path') || scriptTag.getAttribute('data-includes-path');
            }
            if (scriptTag.hasAttribute('extension') || scriptTag.hasAttribute('data-extension')) {
                globalConfig.extension = scriptTag.getAttribute('extension') || scriptTag.getAttribute('data-extension');
            }
        }

        buildTagNames();

        // Apply FOUC prevention if it was enabled via config (and wasn't already added aggressively)
        if (globalConfig.preventFOUC && !document.getElementById('andalina-fouc')) {
            document.head.insertAdjacentHTML('beforeend', '<style id="andalina-fouc">body { opacity: 0 !important; }</style>');
            if (typeof window !== 'undefined') {
                setTimeout(() => {
                    if (document.getElementById('andalina-fouc')) {
                        console.warn('[Andalina] FOUC safety timeout reached (4s). Revealing page body.');
                        clearFOUC();
                    }
                }, 4000);
            }
        } else if (!globalConfig.preventFOUC && document.getElementById('andalina-fouc')) {
            // Remove if config or override disabled it
            clearFOUC();
        }

        if (!globalConfig.propStart || !globalConfig.propEnd) {
            clearFOUC();
            console.error("[Andalina] FATAL ERROR: 'propStart' and 'propEnd' delimiters MUST be explicitly defined in andalina.config.json or as script tag attributes.");
            document.body.innerHTML = `<div style="color:red; padding: 20px; font-family: sans-serif;">
                <h2>[Andalina] Fatal Configuration Error</h2>
                <p>'propStart' and 'propEnd' delimiters are missing. You must define them in <strong>andalina.config.json</strong> to avoid conflicts with other frameworks.</p>
                <pre>{ "propStart": "{{", "propEnd": "}}" }</pre>
            </div>`;
            return;
        }

        try {
            if (globalConfig.debug) {
                console.log('%c[Andalina Debug] 🚀 Starting Parser...', 'color: #9b59b6; font-weight: bold;');
            }

            rawSnapshots.clear();
            renderedSnapshots.clear();
            captureRawSnapshots(document.documentElement);

            async function prefetchData() {
                const dataNodes = Array.from(document.querySelectorAll(tData));
                if (dataNodes.length === 0) return;

                if (globalConfig.debug) {
                    console.log(`%c[Andalina Debug] 📥 Pre-fetching ${dataNodes.length} data sources...`, 'color: #e67e22; font-weight: bold;');
                }

                const fetchPromises = dataNodes.map(async (node) => {
                    const src = node.getAttribute('src');
                    const name = node.getAttribute('name');
                    if (src && name) {
                        try {
                            const t0 = performance.now();
                            const response = await fetch(src);
                            if (response.ok) {
                                const json = await response.json();
                                globalData[name] = json;
                                if (globalConfig.debug) {
                                    console.log(`%c[Andalina Debug] ✓ Fetched data '${name}' from ${src} (${Math.round(performance.now() - t0)}ms)`, 'color: #2ecc71;');
                                }
                            } else {
                                console.error(`[Andalina] Failed to fetch data '${name}' from ${src}: ${response.status}`);
                            }
                        } catch (e) {
                            console.error(`[Andalina] Error fetching data '${name}' from ${src}:`, e);
                        }
                    }
                    node.remove();
                });

                await Promise.all(fetchPromises);
            }

            await prefetchData();

            window.__andalinaDebugTree = {
                name: 'Root Document',
                src: window.location ? window.location.pathname : 'index.html',
                props: {},
                fetchTime: 0,
                parseTime: 0,
                children: []
            };
            const tParseRoot = performance.now();
            await processNodes(document.documentElement, window.__andalinaDebugTree);
            window.__andalinaDebugTree.parseTime = Math.round(performance.now() - tParseRoot);

            processDataBindings(document.documentElement);
            await processCodeNodes(document.documentElement);
            
            // Remove developer comments (<!-- an-comment: ... -->) before finalizing DOM
            const commentWalker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_COMMENT, null, false);
            const commentsToRemove = [];
            let commentNode;
            while ((commentNode = commentWalker.nextNode())) {
                if (commentNode.nodeValue && commentNode.nodeValue.trim().startsWith('an-comment:')) {
                    commentsToRemove.push(commentNode);
                }
            }
            commentsToRemove.forEach(c => c.remove());

            const totalTime = Math.round(performance.now() - startTime);

            if (globalConfig.debug) {
                console.log(`%c[Andalina Debug] ✅ Parsing complete in ${totalTime}ms.`, 'color: #9b59b6; font-weight: bold;');
            } else {
                console.log(`[Andalina] Parsing complete in ${totalTime}ms.`);
            }
            
            if (globalConfig.showRenderedHtml) {
                console.groupCollapsed('%c[Andalina] ✨ Final Rendered HTML (Click to expand)', 'color: #2ecc71; font-size: 13px; font-weight: bold;');
                console.log(document.documentElement.outerHTML);
                console.groupEnd();
            }

            renderDevTools();

            // Dispatch completion event for 3rd party integrations (React/Angular/etc.)
            try {
                document.dispatchEvent(new CustomEvent('andalina:ready', { detail: { totalTime } }));
            } catch(e) {
                // Ignore in Node.js / Linkedom builder environments
            }
        } catch (fatalError) {
            console.error('[Andalina] Fatal error during initialization:', fatalError);
        } finally {
            clearFOUC();
        }
    }

    // Expose Andalina for programmatic usage (e.g., Node.js Builder)
    window.Andalina = {
        init: init,
        formatHTML: formatHTML
    };

    // Auto-run only if we are in a real browser (not Node.js)
    if (typeof process === 'undefined' || !process.versions || !process.versions.node) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    }





    function renderDevTools() {
        if (!globalConfig.debug || !window.__andalinaDebugTree) return;
        
        console.groupCollapsed('%c[Andalina] 🌳 Component Tree (Click to expand)', 'color: #3498db; font-size: 13px; font-weight: bold;');
        
        function logNode(node, depth, isLast) {
            const prefix = depth === 0 ? '' : ' '.repeat((depth - 1) * 4) + (isLast ? '└── ' : '├── ');
            const icon = node.name === 'Template' ? '📄' : (node.name === 'Layout' ? '📦' : '🧩');
            console.groupCollapsed('%c' + prefix + icon + ' ' + node.src, 'font-weight: bold;');
            console.log('Name:', node.name);
            console.log('Props:', node.props);
            console.log('Fetch Time:', node.fetchTime + 'ms');
            console.log('Parse Time:', node.parseTime + 'ms');
            console.log('Children:', node.children.length);
            console.groupEnd();

            node.children.forEach((child, index) => {
                logNode(child, depth + 1, index === node.children.length - 1);
            });
        }

        logNode(window.__andalinaDebugTree, 0, true);
        console.groupEnd();

        // Option A: UI Overlay
        if (!globalConfig.debugUI) return;
        
        if (typeof process !== 'undefined' && process.versions && process.versions.node) {
            return; // Do not render UI overlay in Node.js builder
        }

        const ui = document.createElement('div');
        ui.id = 'andalina-devtools';
        ui.innerHTML = `<style>
            #andalina-devtools { position: fixed; bottom: 20px; right: 20px; width: 350px; background: #1e1e1e; color: #fff; font-family: monospace; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); z-index: 999999; display: flex; flex-direction: column; overflow: hidden; }
            #andalina-dt-header { background: #2d2d2d; padding: 10px 15px; font-weight: bold; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #444; }
            #andalina-dt-body { max-height: 400px; overflow-y: auto; padding: 10px; display: none; }
            #andalina-dt-body.open { display: block; }
            .dt-node { margin-left: 15px; border-left: 1px solid #444; padding-left: 10px; margin-top: 5px; }
            .dt-node-title { cursor: pointer; padding: 3px; border-radius: 4px; display: flex; align-items: center; gap: 5px; }
            .dt-node-title:hover { background: #333; }
            .dt-props { font-size: 11px; color: #aaa; margin: 5px 0 5px 15px; display: none; background: #2a2a2a; padding: 5px; border-radius: 4px; overflow-wrap: break-word; }
            .dt-props.open { display: block; }
        </style>
        <div id="andalina-dt-header">
            <span>🌳 Andalina DevTools</span>
            <span style="font-size: 11px; color: #aaa;">v1.8.1</span>
        </div>
        <div id="andalina-dt-body"></div>`;
        
        function buildUI(node) {
            const div = document.createElement('div');
            div.className = 'dt-node';
            const title = document.createElement('div');
            title.className = 'dt-node-title';
            const icon = node.name === 'Template' ? '📄' : (node.name === 'Layout' ? '📦' : '🧩');
            title.innerHTML = `<span>${icon}</span><span>${node.src}</span> <span style="color:#888;font-size:10px;margin-left:auto;">${node.fetchTime+node.parseTime}ms</span>`;
            
            const props = document.createElement('div');
            props.className = 'dt-props';
            props.innerHTML = `<strong>Props:</strong><br>${Object.keys(node.props).length ? JSON.stringify(node.props, null, 2).replace(/\n/g, '<br>').replace(/ /g, '&nbsp;') : 'None'}`;
            
            title.onclick = (e) => {
                e.stopPropagation();
                props.classList.toggle('open');
            };
            
            div.appendChild(title);
            div.appendChild(props);
            
            node.children.forEach(child => {
                div.appendChild(buildUI(child));
            });
            return div;
        }

        ui.querySelector('#andalina-dt-body').appendChild(buildUI(window.__andalinaDebugTree));
        ui.querySelector('#andalina-dt-header').onclick = () => {
            ui.querySelector('#andalina-dt-body').classList.toggle('open');
        };
        
        document.body.appendChild(ui);
    }

})();
