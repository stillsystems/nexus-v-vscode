document.addEventListener('DOMContentLoaded', async () => {
    const templateSelect = document.getElementById('template');
    const generateBtn = document.getElementById('generate-btn');
    const statusPanel = document.getElementById('status-panel');
    const statusText = document.getElementById('status-text');

    // Fetch templates on load
    try {
        const response = await fetch('/api/templates');
        const data = await response.json();
        
        templateSelect.innerHTML = '';
        data.templates.forEach(t => {
            const option = document.createElement('option');
            option.value = t;
            option.textContent = t.charAt(0).toUpperCase() + t.slice(1);
            templateSelect.appendChild(option);
        });
    } catch (err) {
        console.error('Failed to load templates:', err);
    }

    // Handle Generation
    generateBtn.addEventListener('click', async () => {
        const payload = {
            name: document.getElementById('name').value,
            identifier: document.getElementById('identifier').value,
            publisher: document.getElementById('publisher').value,
            description: document.getElementById('description').value,
            template: templateSelect.value
        };

        if (typeof vscode !== 'undefined') {
            vscode.postMessage({ command: 'generate', data: payload });
            return;
        }

        if (!payload.name || !payload.identifier) {
            alert('Please fill in at least the Project Name and Identifier.');
            return;
        }

        generateBtn.disabled = true;
        generateBtn.textContent = 'Scaffolding...';

        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            
            if (response.ok) {
                statusPanel.classList.remove('hidden');
                statusText.textContent = `🧱 Success! ${data.message}`;
            } else {
                throw new Error(data.message || 'Generation failed');
            }
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            generateBtn.disabled = false;
            generateBtn.textContent = 'Generate Project';
        }
    });
});
