const BaseAdapter = require('./base.js');
const path = require('path');

class JsfAdapter extends BaseAdapter {
    get extension() {
        return '.xhtml';
    }

    shouldProcess(filePath) {
        return filePath.endsWith('.html');
    }

    getOutputPath(relativePath, type) {
        let posixPath = relativePath.replace(/\\/g, '/');
        
        if (type === 'asset') {
            return `src/main/webapp/resources/${posixPath}`;
        }
        
        // It's a page
        const ext = path.extname(posixPath);
        posixPath = posixPath.slice(0, -ext.length) + this.extension;
        
        const compPrefix = this.config.componentsPath ? this.config.componentsPath + '/' : 'components/';
        const layPrefix = this.config.layoutsPath ? this.config.layoutsPath + '/' : 'layouts/';
        
        if (posixPath.startsWith(compPrefix)) {
            // e.g. components/stat-card.xhtml -> src/main/webapp/resources/components/stat-card.xhtml
            return `src/main/webapp/resources/${posixPath}`;
        } else if (posixPath.startsWith(layPrefix)) {
            // e.g. layouts/dashboard.xhtml -> src/main/webapp/WEB-INF/layouts/dashboard.xhtml
            return `src/main/webapp/WEB-INF/${posixPath}`;
        } else {
            return `src/main/webapp/${posixPath}`;
        }
    }

    async transform(document, context) {
        let posixRelPath = context.relativePath.replace(/\\/g, '/');
        const compPrefix = this.config.componentsPath ? this.config.componentsPath + '/' : 'components/';
        const layPrefix = this.config.layoutsPath ? this.config.layoutsPath + '/' : 'layouts/';

        const isComponent = posixRelPath.startsWith(compPrefix);
        const isLayout = posixRelPath.startsWith(layPrefix);

        const walker = document.createTreeWalker(document, global.NodeFilter.SHOW_ELEMENT);
        let currentNode;
        
        const nodesToProcess = [];
        while ((currentNode = walker.nextNode())) {
            nodesToProcess.push(currentNode);
        }

        // Helper to replace node with a new tag while preserving children
        const replaceWithTag = (oldNode, newTagName, attrs = {}) => {
            const newNode = document.createElement(newTagName);
            for (const [key, val] of Object.entries(attrs)) {
                newNode.setAttribute(key, val);
            }
            while (oldNode.firstChild) {
                newNode.appendChild(oldNode.firstChild);
            }
            oldNode.replaceWith(newNode);
            return newNode;
        };
        
        let hasCompositeComponent = false;

        // Process elements
        for (const node of nodesToProcess) {
            if (!node.parentNode) continue;

            const tagName = node.tagName ? node.tagName.toLowerCase() : '';

            // 1. <an-component name="card" title="Hello">
            if (tagName === `${this.config.prefix}-component`) {
                let name = node.getAttribute('name');
                const srcAttr = node.getAttribute('src');
                
                if (!name && srcAttr) {
                    // Extract name from src (e.g. ./components/stat-card.html -> stat-card)
                    const srcBase = srcAttr.split('/').pop();
                    name = srcBase.replace('.html', '');
                }

                if (!name) name = 'unknown-component';

                const newNode = document.createElement(`components:${name}`);
                hasCompositeComponent = true;
                
                for (const attr of node.attributes) {
                    if (attr.name !== 'name' && attr.name !== 'src') {
                        newNode.setAttribute(attr.name, attr.value);
                    }
                }
                while (node.firstChild) {
                    newNode.appendChild(node.firstChild);
                }
                node.replaceWith(newNode);
            }
            
            // 2. <an-if condition="user.active === true">
            else if (tagName === `${this.config.prefix}-if`) {
                let condition = node.getAttribute('condition') || '';
                condition = condition.replace(/===/g, 'eq').replace(/==/g, 'eq').replace(/!==/g, 'ne').replace(/!=/g, 'ne');
                
                replaceWithTag(node, 'ui:fragment', { rendered: `#{${condition}}` });
            }
            
            // 3. <an-else>
            else if (tagName === `${this.config.prefix}-else`) {
                const comment = document.createComment(' JSF WARNING: an-else requires manual conversion to a negated ui:fragment or c:choose ');
                node.insertBefore(comment, node.firstChild);
                replaceWithTag(node, 'ui:fragment');
            }
            
            // 4. <an-repeat data="store.products" item="product">
            else if (tagName === `${this.config.prefix}-repeat`) {
                const dataName = node.getAttribute('data') || '';
                const itemAs = node.getAttribute('item') || 'item';
                
                replaceWithTag(node, 'ui:repeat', { value: `#{${dataName}}`, var: itemAs });
            }
            
            // 5. Layout Definitions
            else if (tagName === `${this.config.prefix}-layout`) {
                let src = node.getAttribute('src');
                src = src.replace(/^\.\//, ''); // remove leading ./
                if (src.endsWith('.html')) src = src.replace(/\.html$/, '');
                
                const layoutsPath = this.config.layoutsPath || 'layouts';
                if (!src.startsWith(layoutsPath)) {
                    src = `${layoutsPath}/${src}`;
                }
                
                replaceWithTag(node, 'ui:composition', { template: `/WEB-INF/${src}.xhtml` });
            }
            
            // 6. Template Definitions
            else if (tagName === `${this.config.prefix}-template`) {
                const name = node.getAttribute('name');
                if (isComponent) {
                    replaceWithTag(node, 'cc:insertFacet', { name });
                } else {
                    replaceWithTag(node, 'ui:insert', { name });
                }
            }
            
            // 7. Inject Definitions
            else if (tagName === `${this.config.prefix}-inject`) {
                const name = node.getAttribute('name');
                const parentTag = node.parentNode ? node.parentNode.tagName.toLowerCase() : '';
                
                if (parentTag.startsWith('components:')) {
                    replaceWithTag(node, 'f:facet', { name });
                } else {
                    replaceWithTag(node, 'ui:define', { name });
                }
            }
        }

        this.cleanup(document);

        let innerHtml = document.toString();
        innerHtml = innerHtml.replace(/^<html><head><\/head><body>([\s\S]*)<\/body><\/html>$/i, '$1');
        innerHtml = innerHtml.replace(/^<html><body>([\s\S]*)<\/body><\/html>$/i, '$1');

        if (isComponent) {
            let html = `<ui:component\n    xmlns="http://www.w3.org/1999/xhtml"\n    xmlns:f="http://xmlns.jcp.org/jsf/core"\n    xmlns:h="http://xmlns.jcp.org/jsf/html"\n    xmlns:ui="http://xmlns.jcp.org/jsf/facelets"\n    xmlns:cc="http://xmlns.jcp.org/jsf/composite">\n    <cc:interface>\n        <!-- Define your cc:attribute here -->\n    </cc:interface>\n    <cc:implementation>\n${innerHtml}\n    </cc:implementation>\n</ui:component>`;
            return this.applyRegex(html, true);
        } else if (isLayout) {
            let html = `<ui:composition\n    xmlns="http://www.w3.org/1999/xhtml"\n    xmlns:f="http://xmlns.jcp.org/jsf/core"\n    xmlns:h="http://xmlns.jcp.org/jsf/html"\n    xmlns:ui="http://xmlns.jcp.org/jsf/facelets"\n    xmlns:c="http://xmlns.jcp.org/jsp/jstl/core">\n${innerHtml}\n</ui:composition>`;
            return this.applyRegex(html, false);
        }

        // Standard Page
        let html = document.toString();
        html = this.applyRegex(html);

        html = html.replace(/^<html><head><\/head><body>([\s\S]*)<\/body><\/html>$/i, '$1');

        if (html.includes('<html')) {
            let xmlns = '<html xmlns="http://www.w3.org/1999/xhtml"\n      xmlns:h="http://xmlns.jcp.org/jsf/html"\n      xmlns:ui="http://xmlns.jcp.org/jsf/facelets"\n      xmlns:c="http://xmlns.jcp.org/jsp/jstl/core"';
            
            if (hasCompositeComponent) {
                xmlns += '\n      xmlns:components="http://xmlns.jcp.org/jsf/composite/components"';
            }
            
            html = html.replace('<html', xmlns);
            html = html.replace(/<head\b/g, '<h:head');
            html = html.replace(/<\/head>/g, '</h:head>');
            html = html.replace(/<body\b/g, '<h:body');
            html = html.replace(/<\/body>/g, '</h:body>');
        }

        return html;
    }
    
    applyRegex(html, isComponent = false) {
        const escapedStartStr = this.config.propStart ? this.config.propStart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '\\{\\{';
        const escapedEndStr = this.config.propEnd ? this.config.propEnd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '\\}\\}';

        const regex = new RegExp(`${escapedStartStr}\\s*(.+?)\\s*${escapedEndStr}`, 'g');
        return html.replace(regex, (match, expression) => {
            const isSimpleProp = /^[a-zA-Z_]\w*$/.test(expression);
            if (isComponent && isSimpleProp) {
                return `#{cc.attrs.${expression}}`;
            }
            return `#{${expression}}`;
        });
    }
}

module.exports = JsfAdapter;
