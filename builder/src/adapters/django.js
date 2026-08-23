const BaseAdapter = require('./base.js');

class DjangoAdapter extends BaseAdapter {
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

        const replaceWithDjango = (oldNode, beforeText, afterText) => {
            const frag = document.createDocumentFragment();
            if (beforeText) frag.appendChild(document.createTextNode(beforeText));
            while (oldNode.firstChild) {
                frag.appendChild(oldNode.firstChild);
            }
            if (afterText) frag.appendChild(document.createTextNode(afterText));
            oldNode.replaceWith(frag);
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
                const propsStr = props.length > 0 ? ` with ${props.join(' ')}` : '';
                
                const str = `{% include "${this.config.componentsPath}/${name}.html"${propsStr} %}`;
                node.replaceWith(document.createTextNode(str));
            }
            
            else if (tagName === `${this.config.prefix}-if`) {
                const condition = node.getAttribute('condition');
                const pyCond = condition.replace(/===/g, '==').replace(/!==/g, '!=');
                replaceWithDjango(node, `{% if ${pyCond} %}\n`, `\n{% endif %}`);
            }
            
            else if (tagName === `${this.config.prefix}-else`) {
                replaceWithDjango(node, `{% else %}\n`, ``);
            }
            
            else if (tagName === `${this.config.prefix}-repeat`) {
                const dataName = node.getAttribute('data');
                const itemAs = node.getAttribute('item') || 'item';
                replaceWithDjango(node, `{% for ${itemAs} in ${dataName} %}\n`, `\n{% endfor %}`);
            }
            
            else if (tagName === `${this.config.prefix}-layout`) {
                const src = node.getAttribute('src');
                replaceWithDjango(node, `{% extends "${this.config.layoutsPath}/${src}.html" %}\n`, ``);
            }
            
            else if (tagName === `${this.config.prefix}-template`) {
                const name = node.getAttribute('name');
                if (node.innerHTML.trim() === '') {
                    node.replaceWith(document.createTextNode(`{% block ${name} %}{% endblock %}`));
                } else {
                    replaceWithDjango(node, `{% block ${name} %}\n`, `\n{% endblock %}`);
                }
            }
        }

        let html = document.toString();

        const escapedStart = this.config.propStart ? this.config.propStart.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&') : '\\\\{\\\\{';
        const escapedEnd = this.config.propEnd ? this.config.propEnd.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&') : '\\\\}\\\\}';
        
        const regex = new RegExp(`${escapedStart}\\s*(.+?)\\s*${escapedEnd}`, 'g');
        html = html.replace(regex, (match, expression) => {
            return `{{ ${expression} }}`;
        });

        html = html.replace(/&lt;({%.*?%})&gt;/g, '$1').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        html = html.replace(/^<html><head><\/head><body>([\s\S]*)<\/body><\/html>$/i, '$1');

        return html;
    }
}

module.exports = DjangoAdapter;
