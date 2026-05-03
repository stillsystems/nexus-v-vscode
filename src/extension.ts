import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
    const controlProvider = new NexusControlProvider();
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
        // ... (existing code remains)
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

        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(
            (message: any) => {
                switch (message.command) {
                    case 'generate':
                        vscode.window.showInformationMessage(`Generating project: ${message.data.name}...`);
                        // In a production version, we would spawn the nexus-v binary here
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

    // Get URIs for local resources
    const styleUri = webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'media', 'style.css')));
    const scriptUri = webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'media', 'app.js')));

    // Replace relative paths with Webview URIs
    html = html.replace('href="style.css"', `href="${styleUri}"`);
    html = html.replace('src="app.js"', `src="${scriptUri}"`);

    // Add VS Code API acquire snippet
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
                    new NexusItem('Engine: v0.2.8', vscode.TreeItemCollapsibleState.None, 'check'),
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
