const BaseAdapter = require('./base.js');

class JsfAdapter extends BaseAdapter {
    get extension() {
        return '.xhtml';
    }

    shouldProcess(filePath) {
        return filePath.endsWith('.html');
    }

    async transform(document, context) {
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

        // Process elements
        for (const node of nodesToProcess) {
            // Because we replaced nodes, we need to check if the node is still in the document
            if (!node.parentNode) continue;

            const tagName = node.tagName ? node.tagName.toLowerCase() : '';

            // 1. <an-component name="card" title="Hello">
            if (tagName === `${this.config.prefix}-component`) {
                const name = node.getAttribute('name');
                const newNode = document.createElement('ui:include');
                newNode.setAttribute('src', `/${this.config.componentsPath}/${name}.xhtml`);
                
                for (const attr of node.attributes) {
                    if (attr.name !== 'name') {
                        const paramNode = document.createElement('ui:param');
                        paramNode.setAttribute('name', attr.name);
                        paramNode.setAttribute('value', attr.value);
                        newNode.appendChild(paramNode);
                    }
                }
                node.replaceWith(newNode);
            }
            
            // 2. <an-if condition="user.active === true">
            else if (tagName === `${this.config.prefix}-if`) {
                let condition = node.getAttribute('condition');
                condition = condition.replace(/===/g, 'eq').replace(/==/g, 'eq').replace(/!==/g, 'ne').replace(/!=/g, 'ne');
                
                replaceWithTag(node, 'ui:fragment', { rendered: `#{${condition}}` });
            }
            
            // 3. <an-else>
            else if (tagName === `${this.config.prefix}-else`) {
                // Convert to a comment for POC
                const comment = document.createComment(' JSF WARNING: an-else requires manual conversion to a negated ui:fragment or c:choose ');
                node.insertBefore(comment, node.firstChild);
                
                replaceWithTag(node, 'ui:fragment'); // Just make it a fragment so children remain visible
            }
            
            // 4. <an-repeat data="store.products" item="product">
            else if (tagName === `${this.config.prefix}-repeat`) {
                const dataName = node.getAttribute('data');
                const itemAs = node.getAttribute('item') || 'item';
                
                replaceWithTag(node, 'ui:repeat', { value: `#{${dataName}}`, var: itemAs });
            }
            
            // 5. Layout Definitions
            // <an-layout src="dashboard">
            else if (tagName === `${this.config.prefix}-layout`) {
                const src = node.getAttribute('src');
                replaceWithTag(node, 'ui:composition', { template: `/${this.config.layoutsPath}/${src}.xhtml` });
            }
            
            // 6. Template Definitions
            // <an-template name="content">
            else if (tagName === `${this.config.prefix}-template`) {
                const name = node.getAttribute('name');
                
                if (node.innerHTML.trim() === '') {
                    replaceWithTag(node, 'ui:insert', { name });
                } else {
                    replaceWithTag(node, 'ui:define', { name });
                }
            }
        }

        this.cleanup(document);
        let html = document.toString();

        const escapedStart = this.config.propStart ? this.config.propStart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '\\{\\{';
        const escapedEnd = this.config.propEnd ? this.config.propEnd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '\\}\\}';
        
        const regex = new RegExp(`${escapedStart}\\s*(.+?)\\s*${escapedEnd}`, 'g');
        html = html.replace(regex, (match, expression) => {
            return `#{${expression}}`;
        });

        html = html.replace(/^<html><head><\/head><body>([\s\S]*)<\/body><\/html>$/i, '$1');

        if (html.includes('<html')) {
            html = html.replace('<html', '<html xmlns="http://www.w3.org/1999/xhtml"\n      xmlns:h="http://xmlns.jcp.org/jsf/html"\n      xmlns:ui="http://xmlns.jcp.org/jsf/facelets"\n      xmlns:c="http://xmlns.jcp.org/jsp/jstl/core"');
        }

        return html;
    }
}

module.exports = JsfAdapter;
