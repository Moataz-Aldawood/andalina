const BaseAdapter = require('./base.js');

class ThymeleafAdapter extends BaseAdapter {
    get extension() {
        return '.html';
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

        for (const node of nodesToProcess) {
            if (!node.parentNode) continue;

            const tagName = node.tagName ? node.tagName.toLowerCase() : '';

            if (tagName === `${this.config.prefix}-component`) {
                const name = node.getAttribute('name');
                const props = [];
                for (const attr of node.attributes) {
                    if (attr.name !== 'name') {
                        props.push(`${attr.name}='${attr.value}'`);
                    }
                }
                const propsStr = props.length > 0 ? `(${props.join(', ')})` : '';
                
                const newNode = document.createElement('th:block');
                newNode.setAttribute('th:replace', `~{${this.config.componentsPath}/${name} :: component${propsStr}}`);
                node.replaceWith(newNode);
            }
            
            else if (tagName === `${this.config.prefix}-if`) {
                const condition = node.getAttribute('condition') || '';
                replaceWithTag(node, 'th:block', { 'th:if': `\${${condition}}` });
            }
            
            else if (tagName === `${this.config.prefix}-else`) {
                // Thymeleaf usually uses th:unless on a duplicated element, or th:switch. 
                // We'll wrap in a comment for POC.
                const comment = document.createComment(' THYMELEAF WARNING: an-else requires manual conversion to th:unless ');
                node.insertBefore(comment, node.firstChild);
                replaceWithTag(node, 'th:block');
            }
            
            else if (tagName === `${this.config.prefix}-repeat`) {
                const dataName = node.getAttribute('data') || '';
                const itemAs = node.getAttribute('item') || 'item';
                replaceWithTag(node, 'th:block', { 'th:each': `${itemAs} : \${${dataName}}` });
            }
            
            else if (tagName === `${this.config.prefix}-layout`) {
                const src = node.getAttribute('src');
                replaceWithTag(node, 'th:block', { 'th:replace': `~{${this.config.layoutsPath}/${src} :: layout}` });
            }
            
            else if (tagName === `${this.config.prefix}-template`) {
                const name = node.getAttribute('name');
                replaceWithTag(node, 'th:block', { 'th:fragment': name });
            }
        }

        this.cleanup(document);
        let html = document.toString();

        const escapedStart = this.config.propStart ? this.config.propStart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '\\{\\{';
        const escapedEnd = this.config.propEnd ? this.config.propEnd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '\\}\\}';
        
        const regex = new RegExp(`${escapedStart}\\s*(.+?)\\s*${escapedEnd}`, 'g');
        html = html.replace(regex, (match, expression) => {
            return `\${${expression}}`;
        });

        html = html.replace(/^<html><head><\/head><body>([\s\S]*)<\/body><\/html>$/i, '$1');

        if (html.includes('<html')) {
            html = html.replace('<html', '<html xmlns:th="http://www.thymeleaf.org"');
        }

        return html;
    }
}

module.exports = ThymeleafAdapter;
