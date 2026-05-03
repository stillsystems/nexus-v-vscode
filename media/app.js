document.addEventListener('DOMContentLoaded', () => {
    const templateSelect = document.getElementById('template');
    const generateBtn = document.getElementById('generate-btn');
    const browseBtn = document.getElementById('browse-btn');
    const targetInput = document.getElementById('target-dir');
    const statusPanel = document.getElementById('status-panel');
    const statusText = document.getElementById('status-text');

    // VS Code API
    const vscode = window.vscode;

    // Handle Browse
    browseBtn.addEventListener('click', () => {
        vscode.postMessage({ command: 'browse' });
    });

    // Handle Generation
    generateBtn.addEventListener('click', () => {
        const payload = {
            name: document.getElementById('name').value,
            identifier: document.getElementById('identifier').value,
            publisher: document.getElementById('publisher').value,
            description: document.getElementById('description').value,
            template: templateSelect.value,
            targetDir: targetInput.value
        };

        if (!payload.name || !payload.identifier || !payload.targetDir) {
            statusPanel.classList.remove('hidden');
            statusPanel.style.background = 'rgba(239, 68, 68, 0.1)';
            statusPanel.style.borderColor = 'rgba(239, 68, 68, 0.2)';
            statusPanel.style.color = '#ef4444';
            statusText.textContent = 'Please fill in Project Name, Identifier, and Target Location.';
            return;
        }

        generateBtn.disabled = true;
        generateBtn.textContent = 'Scaffolding...';
        
        vscode.postMessage({ command: 'generate', data: payload });
    });

    // Handle messages from the extension
    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.command) {
            case 'setTargetDir':
                targetInput.value = message.path;
                break;
            case 'generationStarted':
                statusPanel.classList.add('hidden');
                break;
            case 'generationComplete':
                generateBtn.disabled = false;
                generateBtn.textContent = 'Generate Project';
                statusPanel.classList.remove('hidden');
                statusPanel.style.background = 'rgba(16, 185, 129, 0.1)';
                statusPanel.style.borderColor = 'rgba(16, 185, 129, 0.2)';
                statusPanel.style.color = '#10b981';
                statusText.textContent = '🧱 Success! Project generated at ' + message.path;
                break;
            case 'generationFailed':
                generateBtn.disabled = false;
                generateBtn.textContent = 'Generate Project';
                statusPanel.classList.remove('hidden');
                statusPanel.style.background = 'rgba(239, 68, 68, 0.1)';
                statusPanel.style.borderColor = 'rgba(239, 68, 68, 0.2)';
                statusPanel.style.color = '#ef4444';
                statusText.textContent = '❌ Error: ' + message.error;
                break;
        }
    });
});
