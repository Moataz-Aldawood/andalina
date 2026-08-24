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
                let name = node.getAttribute('name');
                const srcAttr = node.getAttribute('src');
                if (!name && srcAttr) name = srcAttr.split('/').pop().replace('.html', '');
                if (!name) name = 'unknown';
                
                const props = [];
                for (const attr of node.attributes) {
                    if (attr.name !== 'name' && attr.name !== 'src') {
                        props.push(`${attr.name}='${attr.value}'`);
                    }
                }
                const propsStr = props.length > 0 ? `(${props.join(', ')})` : '';
                replaceWithTag(node, 'th:block', { 'th:replace': `~{${this.config.componentsPath || 'components'}/${name} :: ${name}${propsStr}}` });
            }
            
            else if (tagName === `${this.config.prefix}-if`) {
                const condition = node.getAttribute('condition') || '';
                const thCond = condition.replace(/===/g, '==').replace(/!==/g, '!=');
                replaceWithTag(node, 'th:block', { 'th:if': `\${${thCond}}` });
            }
            
            else if (tagName === `${this.config.prefix}-else`) {
                replaceWithTag(node, 'th:block', { 'th:unless': `\${true}` }); // naive fallback
            }
            
            else if (tagName === `${this.config.prefix}-repeat`) {
                const dataName = node.getAttribute('data') || '';
                const itemAs = node.getAttribute('item') || 'item';
                replaceWithTag(node, 'th:block', { 'th:each': `${itemAs} : \${${dataName}}` });
            }
            
            else if (tagName === `${this.config.prefix}-layout`) {
                let src = node.getAttribute('src');
                src = src.replace(/^\.\//, '');
                if (src.endsWith('.html')) src = src.replace(/\.html$/, '');
                
                const layoutsPath = this.config.layoutsPath || 'layouts';
                if (!src.startsWith(layoutsPath)) src = `${layoutsPath}/${src}`;
                
                replaceWithTag(node, 'th:block', { 'th:replace': `~{${src} :: layout}` });
            }
            
            else if (tagName === `${this.config.prefix}-template`) {
                const name = node.getAttribute('name');
                replaceWithTag(node, 'th:block', { 'th:fragment': name });
            }
            
            else if (tagName === `${this.config.prefix}-inject`) {
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
