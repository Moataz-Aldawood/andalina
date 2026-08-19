const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const { buildProject } = require('../../builder/src/builder.js');
const { TargetsProvider } = require('./targetsProvider.js');
const { showFormPanel } = require('./webview.js');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    console.log('Andalina Builder extension is now active!');

    const targetsProvider = new TargetsProvider();
    vscode.window.registerTreeDataProvider('andalinaTargets', targetsProvider);

    // Refresh tree on config change
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('andalinaBuilder.targets')) {
            targetsProvider.refresh();
        }
    }));

    // Register Build Target Command
    let buildCmd = vscode.commands.registerCommand('andalina.buildTarget', async (item) => {
        if (!item || !item.targetData) return;
        await executeTargetBuild(item.targetData, false);
    });

    // Register Edit Target Command
    let editCmd = vscode.commands.registerCommand('andalina.editTarget', async (item) => {
        if (!item || !item.targetData) return;
        showFormPanel(context, item.targetData);
    });

    // Register Delete Target Command
    let deleteCmd = vscode.commands.registerCommand('andalina.deleteTarget', async (item) => {
        if (!item || !item.targetData || item.targetData.index === undefined) return;
        
        const confirm = await vscode.window.showWarningMessage(
            `Are you sure you want to delete the action "${item.targetData.name}"?`,
            { modal: true },
            'Delete'
        );
        
        if (confirm === 'Delete') {
            const config = vscode.workspace.getConfiguration('andalinaBuilder');
            const targets = config.get('targets', []);
            targets.splice(item.targetData.index, 1);
            await config.update('targets', targets, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage('Action deleted successfully.');
        }
    });

    // Register Add Target Command
    let addCmd = vscode.commands.registerCommand('andalina.addTarget', async () => {
        showFormPanel(context, null);
    });

    context.subscriptions.push(buildCmd, editCmd, deleteCmd, addCmd);

    // Auto-Build on Save (per project logic)
    let saveListener = vscode.workspace.onDidSaveTextDocument(async (document) => {
        // Only care about HTML files
        if (document.languageId !== 'html' && !document.fileName.endsWith('.html')) {
            return;
        }

        const config = vscode.workspace.getConfiguration('andalinaBuilder');
        const targets = config.get('targets', []);

        // Find targets that have autoBuild enabled
        const autoBuildTargets = targets.filter(t => t.autoBuild);
        
        for (const target of autoBuildTargets) {
            // Check if the saved file is inside the target's src directory
            const srcDir = resolvePath(target.src);
            const savedFileDir = path.dirname(document.uri.fsPath);
            
            // Only trigger if the saved file is somewhere within the source directory
            // (a simple string startswith is usually sufficient for paths, but better to normalize)
            if (document.uri.fsPath.startsWith(srcDir) || savedFileDir.startsWith(srcDir)) {
                vscode.window.setStatusBarMessage('$(sync~spin) Andalina Auto-Building...', 2000);
                await executeTargetBuild(target, false, true);
            }
        }
    });

    context.subscriptions.push(saveListener);
}

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

async function executeTargetBuild(targetData, forceClear, isSilent = false) {
    const srcDir = resolvePath(targetData.src);
    const destDir = resolvePath(targetData.dest);
    
    // Use the forceClear flag from the command, or the config setting if forceClear is false
    const clearBeforeBuild = forceClear || targetData.clearBeforeBuild;

    if (!fs.existsSync(srcDir)) {
        if (!isSilent) {
            vscode.window.showErrorMessage(`Andalina Build Failed: Source directory "${srcDir}" does not exist.`);
        }
        return;
    }

    // Validate that dest is not inside src (or identical to it)
    const relativeDest = path.relative(srcDir, destDir);
    if (!relativeDest || (!relativeDest.startsWith('..') && !path.isAbsolute(relativeDest))) {
        if (!isSilent) {
            vscode.window.showErrorMessage(`Andalina Build Failed: Target folder cannot be inside (or identical to) the Source folder. Please choose a different target directory.`);
        }
        return;
    }

    try {
        if (!isSilent) {
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Andalina Builder: ${targetData.name}`,
                cancellable: false
            }, async (progress) => {
                progress.report({ message: `Compiling to ${targetData.dest}...` });
                await buildProject(srcDir, destDir, { clearBeforeBuild });
            }).then(() => {
                vscode.window.showInformationMessage(`Andalina: Action successfully built!`);
            });
        } else {
            await buildProject(srcDir, destDir, { clearBeforeBuild });
            vscode.window.setStatusBarMessage('$(check) Andalina Build Complete', 3000);
        }
    } catch (err) {
        console.error(err);
        if (!isSilent) {
            vscode.window.showErrorMessage(`Andalina Build Failed: ${err.message}`);
        }
    }
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
