"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const memory_box_client_1 = require("./memory-box-client");
let memoryBoxClient;
let autoCapture = true;
function activate(context) {
    console.log('Memory Box extension is activating...');
    // Load config
    const config = vscode.workspace.getConfiguration('memoryBox');
    // Initialize Memory Box client
    memoryBoxClient = new memory_box_client_1.MemoryBoxClient();
    // Get DB config from settings
    const neo4jUri = config.get('neo4jUri');
    const neo4jUser = config.get('neo4jUser');
    const neo4jPassword = config.get('neo4jPassword');
    const dbConfig = {
        neo4jUri: neo4jUri || undefined,
        neo4jUser: neo4jUser || undefined,
        neo4jPassword: neo4jPassword || undefined
    };
    // Start the bridge process with config
    memoryBoxClient.start(dbConfig).then(() => {
        console.log('Memory Box bridge started successfully');
    }).catch((err) => {
        console.error('Failed to start Memory Box bridge:', err);
        vscode.window.showErrorMessage('Memory Box: Failed to start. Make sure memory-box is installed (pip install memory-box)');
    });
    // Load auto-capture setting
    autoCapture = config.get('autoCapture', true);
    // Register terminal execution listener for auto-capture
    const executionListener = vscode.window.onDidEndTerminalShellExecution(async (event) => {
        if (!autoCapture || !memoryBoxClient) {
            return;
        }
        const commandLine = event.execution.commandLine.value;
        const exitCode = event.exitCode;
        // Skip if command is empty
        if (!commandLine || commandLine.trim().length === 0) {
            return;
        }
        // Check if we should only capture successful commands
        const captureSuccessOnly = config.get('captureExitCodeZeroOnly', true);
        if (captureSuccessOnly && exitCode !== 0) {
            console.log(`Skipping failed command (exit ${exitCode}): ${commandLine}`);
            return;
        }
        // Get workspace context
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        const context = workspaceFolder?.uri.fsPath;
        try {
            const commandId = await memoryBoxClient.addCommand(commandLine, '', {
                context,
                category: exitCode === 0 ? 'success' : 'failed'
            });
            console.log(`Captured command (${commandId}): ${commandLine}`);
        }
        catch (err) {
            console.error('Failed to capture command:', err);
        }
    });
    // Register search command
    const searchCommand = vscode.commands.registerCommand('memoryBox.searchCommands', async () => {
        if (!memoryBoxClient) {
            vscode.window.showErrorMessage('Memory Box is not initialized');
            return;
        }
        const query = await vscode.window.showInputBox({
            prompt: 'Search for commands',
            placeHolder: 'e.g., docker, git commit, npm install'
        });
        if (!query) {
            return;
        }
        try {
            const results = await memoryBoxClient.searchCommands(query, {
                fuzzy: true,
                limit: 20
            });
            if (results.length === 0) {
                vscode.window.showInformationMessage('No commands found');
                return;
            }
            // Show results in Quick Pick
            const items = results.map(cmd => ({
                label: cmd.command,
                description: cmd.description || '',
                detail: `Used ${cmd.use_count} times | ${cmd.created_at}`,
                command: cmd
            }));
            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select a command to copy or insert',
                matchOnDescription: true,
                matchOnDetail: true
            });
            if (selected) {
                // Ask what to do with the selected command
                const action = await vscode.window.showQuickPick([
                    { label: 'Copy to Clipboard', value: 'copy' },
                    { label: 'Insert into Active Terminal', value: 'insert' },
                    { label: 'Create New Terminal and Run', value: 'run' }
                ], {
                    placeHolder: 'What would you like to do?'
                });
                if (action) {
                    switch (action.value) {
                        case 'copy':
                            await vscode.env.clipboard.writeText(selected.label);
                            vscode.window.showInformationMessage('Command copied to clipboard');
                            break;
                        case 'insert':
                            const activeTerminal = vscode.window.activeTerminal;
                            if (activeTerminal) {
                                activeTerminal.sendText(selected.label, false);
                            }
                            else {
                                vscode.window.showWarningMessage('No active terminal');
                            }
                            break;
                        case 'run':
                            const newTerminal = vscode.window.createTerminal('Memory Box');
                            newTerminal.show();
                            newTerminal.sendText(selected.label);
                            break;
                    }
                }
            }
        }
        catch (err) {
            vscode.window.showErrorMessage(`Search failed: ${err}`);
        }
    });
    // Register manual add command
    const addCommand = vscode.commands.registerCommand('memoryBox.addCommand', async () => {
        if (!memoryBoxClient) {
            vscode.window.showErrorMessage('Memory Box is not initialized');
            return;
        }
        const command = await vscode.window.showInputBox({
            prompt: 'Enter the command',
            placeHolder: 'e.g., docker ps -a'
        });
        if (!command) {
            return;
        }
        const description = await vscode.window.showInputBox({
            prompt: 'Enter a description (optional)',
            placeHolder: 'e.g., List all containers including stopped ones'
        });
        const tagsInput = await vscode.window.showInputBox({
            prompt: 'Enter tags, comma-separated (optional)',
            placeHolder: 'e.g., docker, containers'
        });
        const tags = tagsInput
            ? tagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0)
            : undefined;
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            const commandId = await memoryBoxClient.addCommand(command, description || '', {
                tags,
                context: workspaceFolder?.uri.fsPath
            });
            vscode.window.showInformationMessage(`Command added: ${commandId}`);
        }
        catch (err) {
            vscode.window.showErrorMessage(`Failed to add command: ${err}`);
        }
    });
    // Register toggle auto-capture command
    const toggleCommand = vscode.commands.registerCommand('memoryBox.toggleAutoCapture', async () => {
        autoCapture = !autoCapture;
        // Update configuration
        await config.update('autoCapture', autoCapture, vscode.ConfigurationTarget.Global);
        const status = autoCapture ? 'enabled' : 'disabled';
        vscode.window.showInformationMessage(`Memory Box auto-capture ${status}`);
    });
    // Register all disposables
    context.subscriptions.push(executionListener, searchCommand, addCommand, toggleCommand, {
        dispose: () => {
            if (memoryBoxClient) {
                memoryBoxClient.stop();
            }
        }
    });
    console.log('Memory Box extension activated');
}
function deactivate() {
    if (memoryBoxClient) {
        memoryBoxClient.stop();
    }
}
//# sourceMappingURL=extension.js.map