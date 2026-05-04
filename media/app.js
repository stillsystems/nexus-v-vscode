document.addEventListener('DOMContentLoaded', async () => {
  const templateList = document.getElementById('template-list');
  const featuresSection = document.getElementById('features-section');
  const featuresGrid = document.getElementById('features-grid');
  const genForm = document.getElementById('gen-form');
  const status = document.getElementById('status');

  let templates = [];
  let selectedTemplate = null;
  let enabledFeatures = {};

  // 1. Fetch templates
  if (window.vscode) {
    // In VS Code, we wait for the message
    window.addEventListener('message', event => {
      const message = event.data;
      if (message.command === 'setTemplates') {
        templates = message.data;
        renderTemplates();
      }
      if (message.command === 'setTargetDir') {
        document.getElementById('identifier').value = message.path;
      }
    });

    const browseBtn = document.getElementById('browse-btn');
    browseBtn.style.display = 'block';
    browseBtn.onclick = () => {
      window.vscode.postMessage({ command: 'browse' });
    };
  } else {
    // In browser, we fetch
    try {
      const res = await fetch('/api/templates');
      const data = await res.json();
      templates = data.templates;
      renderTemplates();
    } catch (err) {
      showStatus('Failed to load templates. Is the server running?', 'error');
    }
  }

  function renderTemplates() {
    templateList.innerHTML = '';
    templates.forEach(tpl => {
      const item = document.createElement('div');
      item.className = 'template-item';
      if (selectedTemplate && selectedTemplate.id === tpl.id) item.classList.add('active');
      
      item.innerHTML = `
        <div class="template-info">
          <h4>${tpl.name}</h4>
          <p>${tpl.language || 'Multi-purpose'}</p>
        </div>
        <div style="font-size: 1.2rem;">🧱</div>
      `;

      item.onclick = () => selectTemplate(tpl);
      templateList.appendChild(item);
    });
  }

  function selectTemplate(tpl) {
    selectedTemplate = tpl;
    enabledFeatures = {};
    renderTemplates();
    renderFeatures();
  }

  function renderFeatures() {
    if (!selectedTemplate || !selectedTemplate.features || selectedTemplate.features.length === 0) {
      featuresSection.style.display = 'none';
      return;
    }

    featuresSection.style.display = 'block';
    featuresGrid.innerHTML = '';
    
    selectedTemplate.features.forEach(feat => {
      const label = document.createElement('label');
      label.className = 'feature-toggle';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = !!enabledFeatures[feat.id];
      checkbox.onchange = (e) => {
        enabledFeatures[feat.id] = e.target.checked;
      };

      label.appendChild(checkbox);
      label.append(feat.name);
      featuresGrid.appendChild(label);
    });
  }

  // 2. Handle Generation
  genForm.onsubmit = async (e) => {
    e.preventDefault();
    if (!selectedTemplate) {
      showStatus('Please select a template first.', 'error');
      return;
    }

    const payload = {
      name: document.getElementById('name').value,
      identifier: document.getElementById('identifier').value,
      publisher: document.getElementById('publisher').value || 'stillsystems',
      description: document.getElementById('description').value,
      template: selectedTemplate.id,
      enabled_features: enabledFeatures
    };

    showStatus('🚀 Generating project...', '');
    
    if (window.vscode) {
      window.vscode.postMessage({
        command: 'generate',
        data: payload
      });
      return;
    }

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        showStatus(`✨ ${data.message}`, 'success');
      } else {
        showStatus(`Error: ${data.error || 'Unknown error'}`, 'error');
      }
    } catch (err) {
      showStatus(`Network Error: ${err.message}`, 'error');
    }
  };

  function showStatus(msg, type) {
    status.textContent = msg;
    status.className = type;
    status.style.display = 'block';
  }
});
