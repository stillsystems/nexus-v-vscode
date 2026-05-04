import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { NexusBridge } from './bridge';

export function activate(context: vscode.ExtensionContext) {
    const bridge = new NexusBridge();
    const controlProvider = new NexusControlProvider(bridge);
    
    vscode.window.registerTreeDataProvider('nexusv.dashboard', controlProvider);

    context.subscriptions.push(
        vscode.commands.registerCommand('nexusv.refresh', () => controlProvider.refresh())
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('nexus-v.runDoctor', () => {
            const terminal = vscode.window.createTerminal("Nexus-V Doctor");
            terminal.show();
            terminal.sendText("nexus-v doctor");
        })
    );

    const disposable = vscode.commands.registerCommand('nexus-v.createProject', () => {
        const panel = vscode.window.createWebviewPanel(
            'nexusVScaffolder',
            'Nexus-V: New Project',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'media'))]
            }
        );

        panel.webview.html = getWebviewContent(context, panel.webview);

        // Fetch and send templates
        bridge.listTemplates().then(templates => {
            panel.webview.postMessage({ command: 'setTemplates', data: templates });
        }).catch(err => {
            console.error('Failed to load templates:', err);
        });

        panel.webview.onDidReceiveMessage(
            async (message: any) => {
                switch (message.command) {
                    case 'browse':
                        const folders = await vscode.window.showOpenDialog({
                            canSelectFolders: true,
                            canSelectFiles: false,
                            canSelectMany: false,
                            openLabel: 'Select Project Location'
                        });
                        if (folders && folders.length > 0) {
                            panel.webview.postMessage({ command: 'setTargetDir', path: folders[0].fsPath });
                        }
                        return;
                    case 'generate':
                        try {
                            panel.webview.postMessage({ command: 'generationStarted' });
                            await bridge.scaffold({
                                name: message.data.name,
                                identifier: message.data.identifier,
                                publisher: message.data.publisher,
                                description: message.data.description,
                                variant: message.data.template,
                                targetDir: message.data.targetDir
                            });
                            panel.webview.postMessage({ command: 'generationComplete', path: message.data.targetDir });
                            
                            const action = await vscode.window.showInformationMessage('Project generated successfully!', 'Open Folder');
                            if (action === 'Open Folder') {
                                vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(message.data.targetDir));
                            }
                        } catch (err: any) {
                            panel.webview.postMessage({ command: 'generationFailed', error: err.message });
                            vscode.window.showErrorMessage(`Generation failed: ${err.message}`);
                        }
                        return;
                }
            },
            undefined,
            context.subscriptions
        );
    });

    context.subscriptions.push(disposable);
}

function getWebviewContent(context: vscode.ExtensionContext, webview: vscode.Webview): string {
    const htmlPath = path.join(context.extensionPath, 'media', 'index.html');
    let html = fs.readFileSync(htmlPath, 'utf8');

    const styleUri = webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'media', 'style.css')));
    const scriptUri = webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'media', 'app.js')));

    html = html.replace('href="style.css"', `href="${styleUri}"`);
    html = html.replace('src="app.js"', `src="${scriptUri}"`);

    html = html.replace('</head>', `
        <script>
            const vscode = acquireVsCodeApi();
            window.vscode = vscode;
        </script>
    </head>`);

    return html;
}

export function deactivate() {}

class NexusControlProvider implements vscode.TreeDataProvider<NexusItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<NexusItem | undefined | void> = new vscode.EventEmitter<NexusItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<NexusItem | undefined | void> = this._onDidChangeTreeData.event;
    private engineVersion: string = 'v0.2.2';

    constructor(private bridge: NexusBridge) {
        this.updateVersion();
    }

    private async updateVersion() {
        const fullVersion = await this.bridge.getVersion();
        const match = fullVersion.match(/(\d+\.\d+\.\d+)/);
        if (match) {
            this.engineVersion = 'v' + match[1];
            this.refresh();
        }
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: NexusItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: NexusItem): Thenable<NexusItem[]> {
        if (element) {
            return Promise.resolve(element.children || []);
        } else {
            return Promise.resolve([
                new NexusItem('Project Status', vscode.TreeItemCollapsibleState.Expanded, 'dashboard', [
                    new NexusItem(`Engine: ${this.engineVersion}`, vscode.TreeItemCollapsibleState.None, 'check'),
                    new NexusItem('Health: Perfect', vscode.TreeItemCollapsibleState.None, 'shield')
                ]),
                new NexusItem('Quick Actions', vscode.TreeItemCollapsibleState.Expanded, 'zap', [
                    new NexusItem('Create New Project', vscode.TreeItemCollapsibleState.None, 'add', undefined, {
                        command: 'nexus-v.createProject',
                        title: 'New Project'
                    }),
                    new NexusItem('Run Doctor', vscode.TreeItemCollapsibleState.None, 'pulse', undefined, {
                        command: 'nexus-v.runDoctor',
                        title: 'Run Doctor'
                    })
                ])
            ]);
        }
    }
}

class NexusItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly iconName?: string,
        public readonly children?: NexusItem[],
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState);
        if (iconName) {
            this.iconPath = new vscode.ThemeIcon(iconName);
        }
    }
    contextValue = 'nexusItem';
}
