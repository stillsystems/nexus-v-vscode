import * as cp from 'child_process';
import * as vscode from 'vscode';

export interface ScaffoldOptions {
    name: string;
    identifier: string;
    publisher: string;
    description: string;
    variant: string;
    targetDir: string;
}

export class NexusBridge {
    private outputChannel: vscode.OutputChannel;

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel("Nexus-V Engine");
    }

    public async scaffold(options: ScaffoldOptions): Promise<void> {
        this.outputChannel.show();
        this.outputChannel.appendLine(`🧱 Starting scaffold for: ${options.name}`);
        this.outputChannel.appendLine(`📂 Target: ${options.targetDir}`);

        const args = [
            "init",
            "--name", options.name,
            "--id", options.identifier,
            "--publisher", options.publisher,
            "--description", options.description,
            "--variant", options.variant,
            "--out", options.targetDir,
            "--no-git" // We handle git or let user handle it
        ];

        return new Promise((resolve, reject) => {
            const proc = cp.spawn("nexus-v", args);

            proc.stdout.on('data', (data) => {
                this.outputChannel.append(data.toString());
            });

            proc.stderr.on('data', (data) => {
                this.outputChannel.append(`[ERROR] ${data.toString()}`);
            });

            proc.on('close', (code) => {
                if (code === 0) {
                    this.outputChannel.appendLine("\n✅ Project generated successfully!");
                    resolve();
                } else {
                    this.outputChannel.appendLine(`\n❌ Generation failed with exit code ${code}`);
                    reject(new Error(`Exit code ${code}`));
                }
            });
        });
    }

    public async getVersion(): Promise<string> {
        return new Promise((resolve) => {
            cp.exec("nexus-v version", (err, stdout) => {
                if (err) {
                    resolve("unknown");
                } else {
                    resolve(stdout.trim());
                }
            });
        });
    }
}
