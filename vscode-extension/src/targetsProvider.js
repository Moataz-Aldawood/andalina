const vscode = require('vscode');
const path = require('path');

class TargetsProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }

    refresh() {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element) {
        return element;
    }

    getChildren(element) {
        if (element) {
            return Promise.resolve([]);
        }

        const config = vscode.workspace.getConfiguration('andalinaBuilder');
        const targets = config.get('targets', []);

        if (targets.length === 0) {
            const emptyItem = new vscode.TreeItem('No build targets defined', vscode.TreeItemCollapsibleState.None);
            emptyItem.description = 'Click + to add one';
            return Promise.resolve([emptyItem]);
        }

        return Promise.resolve(targets.map((target, index) => {
            const label = target.name || 'Unnamed Project';
            const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
            item.tooltip = `Source: ${target.src}\nDestination: ${target.dest}\nClear Before Build: ${!!target.clearBeforeBuild}\nAuto Build on Save: ${!!target.autoBuild}`;
            
            // This contextValue must match the 'when' clause in package.json's view/item/context
            item.contextValue = 'buildTarget';
            
            // Attach the target data and its index so the command can read/update it
            item.targetData = { ...target, index };
            
            item.iconPath = new vscode.ThemeIcon('layout');
            
            // Allow double click to edit
            item.command = {
                command: 'andalina.editTarget',
                title: 'Edit Action',
                arguments: [item]
            };
            
            return item;
        }));
    }
}

module.exports = { TargetsProvider };
