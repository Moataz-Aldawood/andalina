/**
 * Andalina - Zero-dependency HTML template parser
 * A development-time tool for client-side HTML composition.
 * Version: 1.1.0
 */
(function() {
    // 1. Configuration (Prefix detection)
    const scriptTag = document.currentScript || document.querySelector('script[src*="andalina.js"]');

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

    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function isEnabled(val) {
        return val === 'enabled' || val === true;
    }

    // Aggressively prevent FOUC if script tag dictates it (before async config load)
    if (scriptTag && (isEnabled(scriptTag.getAttribute('prevent-fouc')) || isEnabled(scriptTag.getAttribute('data-prevent-fouc')))) {
        globalConfig.preventFOUC = true;
        document.head.insertAdjacentHTML('beforeend', '<style id="andalina-fouc">body { opacity: 0 !important; }</style>');
    }

    // Tag definitions
    let tInclude, tLayout, tComponent, tTemplate, tInject, tPlace, tAttribute, tRepeat, tCode;

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
    }

    // Cache for fetched fragments
    const cache = new Map();

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
            const text = await response.text();
            cache.set(url, text);
            return text;
        } catch (error) {
            console.error(`[Andalina] Error fetching template:`, error);
            return `<div style="color:red; padding: 10px; border: 1px solid red;">[Andalina] Error loading ${url}</div>`;
        }
    }

    // Safely clones a node. If it's a script, it creates a NEW script tag 
    // so the browser executes it when appended to the DOM.
    function cloneNodeSafe(node) {
        if (node.tagName === 'SCRIPT') {
            const newScript = document.createElement('script');
            Array.from(node.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
            newScript.innerHTML = node.innerHTML;
            return newScript;
        }
        
        const clone = node.cloneNode(true);
        // Recursively fix nested scripts
        const scripts = clone.querySelectorAll ? clone.querySelectorAll('script') : [];
        scripts.forEach(script => {
            const newScript = document.createElement('script');
            Array.from(script.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
            newScript.innerHTML = script.innerHTML;
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

    // Strips <an-attribute> tags before HTML parsing to prevent them from breaking the <head>
    function stripAndExtractAttributes(html) {
        const defaults = {};
        const cleanHtml = html.replace(/<an-attribute[^>]*>/gi, (match) => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = match;
            const tag = tempDiv.firstChild;
            if (tag) {
                const name = tag.getAttribute('name');
                const defaultVal = tag.getAttribute('default-value');
                if (name && defaultVal !== null) defaults[name] = defaultVal;
            }
            return '';
        });
        return { cleanHtml, defaults };
    }

    function processProps(targetNode, doc, fetchTime, templateDefaults = {}) {        // 1. Gather props from the caller tag
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

        // Also clean up any that somehow survived (e.g. dynamically injected later)
        const attributeTags = Array.from(doc.querySelectorAll(tAttribute));
        attributeTags.forEach(attrTag => attrTag.remove());

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
    }

    async function processNodes(context) {
        let iterations = 0;
        const maxIterations = 1000;
        const parser = new DOMParser();

        while (true) {
            iterations++;
            if (iterations > maxIterations) {
                console.error('[Andalina] Max iterations reached. Possible circular dependency.');
                break;
            }

            const repeatNode = context.querySelector(tRepeat);
            const includeNode = context.querySelector(tInclude);
            const layoutNode = context.querySelector(tLayout);
            const componentNode = context.querySelector(tComponent);
            const pageNode = context.querySelector(tTemplate);
            const codeNode = context.querySelector(tCode);

            if (!repeatNode && !includeNode && !layoutNode && !componentNode && !pageNode && !codeNode) {
                break;
            }

            // 0. Process Repeats (Development-time loops)
            if (repeatNode) {
                const times = parseInt(repeatNode.getAttribute('times'), 10);
                const indexAs = repeatNode.getAttribute('index-as') || '$index';
                
                if (!isNaN(times) && times > 0) {
                    const fragment = document.createDocumentFragment();
                    const escapedStart = escapeRegExp(globalConfig.propStart);
                    const escapedEnd = escapeRegExp(globalConfig.propEnd);
                    const regex = new RegExp(`${escapedStart}\\s*${escapeRegExp(indexAs)}\\s*${escapedEnd}`, 'g');
                    
                    for (let i = 1; i <= times; i++) {
                        const temp = document.createElement('div');
                        let content = repeatNode.innerHTML;
                        content = content.replace(regex, i);
                        temp.innerHTML = content;
                        
                        Array.from(temp.childNodes).forEach(node => {
                            fragment.appendChild(cloneNodeSafe(node));
                        });
                    }
                    repeatNode.replaceWith(fragment);
                } else {
                    repeatNode.remove();
                }
                continue;
            }

            // 0.5 Process Code inclusions (Raw text fetching)
            if (codeNode) {
                const src = codeNode.getAttribute('src');
                if (src) {
                    const t0 = performance.now();
                    const basePath = globalConfig.codesPath.replace(/\/$/, '');
                    const fullPath = basePath ? `${basePath}/${src}` : src;
                    
                    const codeText = await fetchFragment(fullPath);
                    const fetchTime = Math.round(performance.now() - t0);
                    
                    if (globalConfig.debug) {
                        console.log(`%c[Andalina Debug] 📄 Code: ${fullPath} (fetch: ${fetchTime}ms)`, 'color: #3498db;');
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

                    codeNode.replaceWith(document.createTextNode(codeText.trim()));
                } else {
                    codeNode.remove();
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
                    let layoutHtml = await fetchFragment(src);
                    const fetchTime = Math.round(performance.now() - t0);

                    const extracted = stripAndExtractAttributes(layoutHtml);
                    layoutHtml = extracted.cleanHtml;

                    const doc = parser.parseFromString(layoutHtml, 'text/html');
                    
                    processProps(pageNode, doc, fetchTime, extracted.defaults);

                    // Collect <an-inject> blocks from the child template
                    const injects = Array.from(pageNode.querySelectorAll(tInject));
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

                    // Completely replace the current document's head and body
                    copyAttributes(doc.documentElement, document.documentElement);
                    if (doc.head) copyAttributes(doc.head, document.head);
                    if (doc.body) copyAttributes(doc.body, document.body);

                    // We do NOT clear document.head.innerHTML anymore!
                    // This perfectly preserves the caller page's <title>, <meta>, and <script> tags.
                    if (doc.head) {
                        Array.from(doc.head.childNodes).forEach(node => {
                            if (node.tagName === 'SCRIPT' && node.src.includes('andalina.js')) return; // Don't reload andalina
                            if (node.tagName === 'TITLE' && document.querySelector('head > title')) return; // Caller title wins
                            document.head.appendChild(cloneNodeSafe(node));
                        });
                    }

                    document.body.innerHTML = '';
                    if (doc.body) {
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
                    let layoutHtml = await fetchFragment(src);
                    const fetchTime = Math.round(performance.now() - t0);
                    
                    const extracted = stripAndExtractAttributes(layoutHtml);
                    layoutHtml = extracted.cleanHtml;

                    const doc = parser.parseFromString(layoutHtml, 'text/html');
                    processProps(targetNode, doc, fetchTime, extracted.defaults);
                    const layoutContainer = doc.body ? doc.body : doc.documentElement;

                    const injects = Array.from(targetNode.querySelectorAll(tInject));
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

                    const fragment = document.createDocumentFragment();
                    Array.from(layoutContainer.childNodes).forEach(node => {
                        fragment.appendChild(cloneNodeSafe(node));
                    });
                    targetNode.replaceWith(fragment);
                } else {
                    targetNode.remove();
                }
            }
            // 3. Process plain includes
            else if (includeNode) {
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
                    const html = await fetchFragment(src);
                    const fetchTime = Math.round(performance.now() - t0);
                    const doc = parser.parseFromString(html, 'text/html');
                    processProps(includeNode, doc, fetchTime);

                    // If included fragment was a full HTML document, optionally merge its head
                    if (html.toLowerCase().includes('<head>') && doc.head) {
                        Array.from(doc.head.childNodes).forEach(node => {
                            if (node.tagName === 'SCRIPT' && node.src.includes('andalina.js')) return;
                            if (node.tagName === 'TITLE') return; 
                            document.head.appendChild(cloneNodeSafe(node));
                        });
                    }

                    const contentContainer = doc.body ? doc.body : doc.documentElement;
                    
                    const fragment = document.createDocumentFragment();
                    Array.from(contentContainer.childNodes).forEach(node => {
                        fragment.appendChild(cloneNodeSafe(node));
                    });
                    includeNode.replaceWith(fragment);
                } else {
                    includeNode.remove();
                }
            }
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
            let configUrl = basePath + 'andalina.config.json';
            const scriptTagVersion = scriptTag ? scriptTag.getAttribute('data-version') : null;
            if (scriptTagVersion) {
                configUrl += `?v=${encodeURIComponent(scriptTagVersion)}`;
            }
            const configRes = await fetch(configUrl);
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
        } else if (!globalConfig.preventFOUC && document.getElementById('andalina-fouc')) {
            // Remove if config or override disabled it
            document.getElementById('andalina-fouc').remove();
        }

        if (!globalConfig.propStart || !globalConfig.propEnd) {
            console.error("[Andalina] FATAL ERROR: 'propStart' and 'propEnd' delimiters MUST be explicitly defined in andalina.config.json or as script tag attributes.");
            document.body.innerHTML = `<div style="color:red; padding: 20px; font-family: sans-serif;">
                <h2>[Andalina] Fatal Configuration Error</h2>
                <p>'propStart' and 'propEnd' delimiters are missing. You must define them in <strong>andalina.config.json</strong> to avoid conflicts with other frameworks.</p>
                <pre>{ "propStart": "{{", "propEnd": "}}" }</pre>
            </div>`;
            return;
        }

        if (globalConfig.debug) {
            console.log('%c[Andalina Debug] 🚀 Starting Parser...', 'color: #9b59b6; font-weight: bold;');
        }

        await processNodes(document.body);
        
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

        if (globalConfig.preventFOUC) {
            const foucStyle = document.getElementById('andalina-fouc');
            if (foucStyle) foucStyle.remove();
            // Smooth fade in
            document.body.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: 'ease-in' });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();


