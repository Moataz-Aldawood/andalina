const BaseAdapter = require('./base.js');

class BladeAdapter extends BaseAdapter {
    get extension() {
        return '.blade.php';
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

        const replaceWithBlade = (oldNode, beforeText, afterText) => {
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
                        props.push(`'${attr.name}' => '${attr.value}'`);
                    }
                }
                const propsStr = props.length > 0 ? `, [${props.join(', ')}]` : '';
                
                const phpStr = `@include('${this.config.componentsPath}.${name}'${propsStr})`;
                node.replaceWith(document.createTextNode(phpStr));
            }
            
            else if (tagName === `${this.config.prefix}-if`) {
                const condition = node.getAttribute('condition');
                const phpCond = condition.replace(/([a-zA-Z_]\w*)/g, '$$$1').replace(/\$\$/g, '$').replace(/\$true/g, 'true').replace(/\$false/g, 'false');
                replaceWithBlade(node, `@if(${phpCond})\n`, `\n@endif`);
            }
            
            else if (tagName === `${this.config.prefix}-else`) {
                replaceWithBlade(node, `@else\n`, ``);
            }
            
            else if (tagName === `${this.config.prefix}-repeat`) {
                const dataName = node.getAttribute('data');
                const itemAs = node.getAttribute('item') || 'item';
                replaceWithBlade(node, `@foreach($${dataName.replace(/\./g, '->')} as $${itemAs})\n`, `\n@endforeach`);
            }
            
            else if (tagName === `${this.config.prefix}-layout`) {
                const src = node.getAttribute('src');
                replaceWithBlade(node, `@extends('${this.config.layoutsPath}.${src}')\n`, ``);
            }
            
            else if (tagName === `${this.config.prefix}-template`) {
                const name = node.getAttribute('name');
                if (node.innerHTML.trim() === '') {
                    node.replaceWith(document.createTextNode(`@yield('${name}')`));
                } else {
                    replaceWithBlade(node, `@section('${name}')\n`, `\n@endsection`);
                }
            }
        }

        let html = document.toString();

        const escapedStart = this.config.propStart ? this.config.propStart.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&') : '\\\\{\\\\{';
        const escapedEnd = this.config.propEnd ? this.config.propEnd.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&') : '\\\\}\\\\}';
        
        const regex = new RegExp(`${escapedStart}\\s*(.+?)\\s*${escapedEnd}`, 'g');
        html = html.replace(regex, (match, expression) => {
            let phpExpr = expression.replace(/([a-zA-Z_]\w*)\.([a-zA-Z_]\w*)/g, '$$$1->$2');
            return `{{ ${phpExpr} }}`;
        });

        // Unescape HTML entities that were created by text nodes
        html = html.replace(/&lt;(@[a-zA-Z]+.*?)&gt;/g, '<$1>').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

        html = html.replace(/^<html><head><\/head><body>([\s\S]*)<\/body><\/html>$/i, '$1');

        return html;
    }
}

module.exports = BladeAdapter;
