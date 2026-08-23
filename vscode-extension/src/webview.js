const vscode = require('vscode');
const path = require('path');

function resolvePath(p) {
    if (path.isAbsolute(p)) {
        return p;
    }
    const folders = vscode.workspace.workspaceFolders;
    if (folders && folders.length > 0) {
        return path.join(folders[0].uri.fsPath, p);
    }
    return p;
}

function showFormPanel(context, targetData = null) {
    const isEdit = !!targetData;
    const panel = vscode.window.createWebviewPanel(
        'andalinaForm',
        isEdit ? 'Edit Action' : 'Add New Action',
        vscode.ViewColumn.One,
        {
            enableScripts: true,
            retainContextWhenHidden: true
        }
    );

    panel.webview.html = getWebviewContent(targetData);

    panel.webview.onDidReceiveMessage(
        async message => {
            if (message.command === 'save') {
                const config = vscode.workspace.getConfiguration('andalinaBuilder');
                const targets = config.get('targets', []);
                
                // Server-side validation
                const srcDir = resolvePath(message.data.src);
                const destDir = resolvePath(message.data.dest);
                const relativeDest = path.relative(srcDir, destDir);
                
                if (!relativeDest || (!relativeDest.startsWith('..') && !path.isAbsolute(relativeDest))) {
                    panel.webview.postMessage({
                        command: 'showError',
                        message: 'Target folder cannot be inside (or identical to) the Source folder. Please choose a different target directory.'
                    });
                    return;
                }

                const newData = {
                    name: message.data.name,
                    src: message.data.src,
                    dest: message.data.dest,
                    clearBeforeBuild: message.data.clearBeforeBuild,
                    autoBuild: message.data.autoBuild,
                    targets: message.data.targets
                };

                if (isEdit && targetData.index !== undefined) {
                    targets[targetData.index] = newData;
                } else {
                    targets.push(newData);
                }

                await config.update('targets', targets, vscode.ConfigurationTarget.Global);
                vscode.window.showInformationMessage(isEdit ? 'Action updated successfully.' : 'Action added successfully.');
                panel.dispose();
            } else if (message.command === 'cancel') {
                panel.dispose();
            } else if (message.command === 'browseSrc') {
                const uri = await vscode.window.showOpenDialog({
                    canSelectMany: false,
                    canSelectFiles: false,
                    canSelectFolders: true,
                    openLabel: 'Select Source Folder'
                });
                if (uri && uri[0]) {
                    panel.webview.postMessage({ command: 'updateSrc', path: uri[0].fsPath });
                }
            } else if (message.command === 'browseDest') {
                const uri = await vscode.window.showOpenDialog({
                    canSelectMany: false,
                    canSelectFiles: false,
                    canSelectFolders: true,
                    openLabel: 'Select Target Folder'
                });
                if (uri && uri[0]) {
                    panel.webview.postMessage({ command: 'updateDest', path: uri[0].fsPath });
                }
            }
        },
        undefined,
        context.subscriptions
    );
}

function getWebviewContent(targetData) {
    const data = targetData || {
        name: '',
        src: './src',
        dest: './dist',
        clearBeforeBuild: false,
        autoBuild: false
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Andalina Project Form</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            max-width: 600px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .header h1 {
            color: var(--vscode-editor-foreground);
            font-size: 24px;
            margin-bottom: 4px;
        }
        .header h2 {
            color: var(--vscode-descriptionForeground);
            font-size: 16px;
            font-weight: normal;
            margin-top: 0;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 6px;
            font-weight: bold;
            font-size: 13px;
        }
        input[type="text"] {
            width: 100%;
            padding: 8px;
            box-sizing: border-box;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 2px;
            font-family: var(--vscode-font-family);
            font-size: 13px;
        }
        input[type="text"]:focus {
            outline: 1px solid var(--vscode-focusBorder);
            border-color: transparent;
        }
        .input-with-button {
            display: flex;
            gap: 8px;
        }
        .input-with-button input {
            flex: 1;
        }
        .input-with-button button {
            white-space: nowrap;
        }
        .checkbox-group {
            display: flex;
            align-items: center;
            margin-bottom: 12px;
        }
        .checkbox-group input {
            margin-right: 8px;
            margin-left: 0;
            accent-color: var(--vscode-button-background);
        }
        .checkbox-group label {
            margin-bottom: 0;
            font-weight: normal;
        }
        .actions {
            margin-top: 30px;
            display: flex;
            gap: 10px;
        }
        button {
            padding: 8px 16px;
            border: none;
            border-radius: 2px;
            cursor: pointer;
            font-family: var(--vscode-font-family);
            font-size: 13px;
        }
        button.primary {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        button.primary:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        button.secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        button.secondary:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
        .alert-warning {
            background-color: var(--vscode-inputValidation-warningBackground);
            border: 1px solid var(--vscode-inputValidation-warningBorder);
            padding: 10px;
            margin-bottom: 20px;
            font-size: 13px;
        }
        .error-message {
            color: var(--vscode-errorForeground);
            font-size: 13px;
            margin-bottom: 20px;
            display: none;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Andalina Builder</h1>
        <h2>${targetData ? 'Edit Action' : 'Add New Action'}</h2>
    </div>

    <div class="alert-warning">
        <strong>Warning:</strong> The builder will overwrite files in the target folder with the same name. If <em>Clear all target folder content before build</em> is checked, ALL existing contents in the target folder will be permanently deleted before building!
    </div>
    
    <div class="error-message" id="errorMsg"></div>

    <div class="form-group">
        <label for="name">Action Name</label>
        <input type="text" id="name" value="${escapeHtml(data.name)}" placeholder="e.g. Build My Website">
    </div>

    <div class="form-group">
        <label for="src">Source Andalina Project Folder</label>
        <div class="input-with-button">
            <input type="text" id="src" value="${escapeHtml(data.src)}" placeholder="e.g. ./src">
            <button class="secondary" id="browseSrcBtn">Browse...</button>
        </div>
    </div>

    <div class="form-group">
        <label for="dest">Target Andalina Builder Folder</label>
        <div class="input-with-button">
            <input type="text" id="dest" value="${escapeHtml(data.dest)}" placeholder="e.g. ./dist">
            <button class="secondary" id="browseDestBtn">Browse...</button>
        </div>
    </div>

    <div class="checkbox-group">
        <input type="checkbox" id="clearBeforeBuild" ${data.clearBeforeBuild ? 'checked' : ''}>
        <label for="clearBeforeBuild">Clear all target folder content before build</label>
    </div>

    <div class="checkbox-group">
        <input type="checkbox" id="autoBuild" ${data.autoBuild ? 'checked' : ''}>
        <label for="autoBuild">Auto Build on Save</label>
    </div>

    <div class="form-group" style="margin-top: 25px; border-top: 1px solid var(--vscode-widget-border); padding-top: 15px;">
        <label style="margin-bottom: 12px; font-size: 14px;">Build Targets (Adapters)</label>
        
        <div class="checkbox-group">
            <input type="checkbox" class="target-cb" value="ssg" ${(!data.targets || data.targets.length === 0 || data.targets.includes('ssg')) ? 'checked' : ''}>
            <label>Flat HTML (SSG)</label>
        </div>
        
        <div class="checkbox-group">
            <input type="checkbox" class="target-cb" value="blade" ${data.targets && data.targets.includes('blade') ? 'checked' : ''}>
            <label>Laravel Blade</label>
        </div>
        
        <div class="checkbox-group">
            <input type="checkbox" class="target-cb" value="jsf" ${data.targets && data.targets.includes('jsf') ? 'checked' : ''}>
            <label>JavaServer Faces (JSF)</label>
        </div>
        
        <div class="checkbox-group">
            <input type="checkbox" class="target-cb" value="django" ${data.targets && data.targets.includes('django') ? 'checked' : ''}>
            <label>Django Templates</label>
        </div>
        
        <div class="checkbox-group">
            <input type="checkbox" class="target-cb" value="thymeleaf" ${data.targets && data.targets.includes('thymeleaf') ? 'checked' : ''}>
            <label>Thymeleaf</label>
        </div>
    </div>

    <div class="actions">
        <button class="primary" id="saveBtn">Save Action</button>
        <button class="secondary" id="cancelBtn">Cancel</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        document.getElementById('saveBtn').addEventListener('click', () => {
            const src = document.getElementById('src').value.trim();
            const dest = document.getElementById('dest').value.trim();
            
            // Client side validation
            if (!src || !dest) {
                showError("Source and Target folders are required.");
                return;
            }
            
            // Collect selected targets
            const targetCbs = document.querySelectorAll('.target-cb:checked');
            const targets = Array.from(targetCbs).map(cb => cb.value);

            // A naive check here, but we also send it to the extension for a robust path resolution check
            vscode.postMessage({
                command: 'save',
                data: {
                    name: document.getElementById('name').value,
                    src: src,
                    dest: dest,
                    clearBeforeBuild: document.getElementById('clearBeforeBuild').checked,
                    autoBuild: document.getElementById('autoBuild').checked,
                    targets: targets
                }
            });
        });

        document.getElementById('cancelBtn').addEventListener('click', () => {
            vscode.postMessage({ command: 'cancel' });
        });

        document.getElementById('browseSrcBtn').addEventListener('click', () => {
            vscode.postMessage({ command: 'browseSrc' });
        });

        document.getElementById('browseDestBtn').addEventListener('click', () => {
            vscode.postMessage({ command: 'browseDest' });
        });

        function showError(msg) {
            const errEl = document.getElementById('errorMsg');
            errEl.textContent = msg;
            errEl.style.display = 'block';
        }

        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'updateSrc') {
                document.getElementById('src').value = message.path;
            } else if (message.command === 'updateDest') {
                document.getElementById('dest').value = message.path;
            } else if (message.command === 'showError') {
                showError(message.message);
            }
        });
    </script>
</body>
</html>`;
}

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

module.exports = { showFormPanel };
