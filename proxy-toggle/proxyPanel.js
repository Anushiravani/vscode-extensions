const vscode = require('vscode');
const i18n = require('./i18n');

/**
 * @type {vscode.WebviewPanel}
 */
let panel = null;

/**
 * کلیدهای تنظیمات اکستنشن که در فرم نمایش داده می‌شوند.
 * شامل نوع ورودی و گزینه‌ها برای dropdown ها.
 */
const FORM_FIELDS = [
  { key: 'proxyUrl', type: 'text', placeholder: 'http://127.0.0.1:1080' },
  { key: 'proxyAuthorization', type: 'text', placeholder: '' },
  { key: 'proxyStrictSSL', type: 'checkbox' },
  { key: 'proxySupport', type: 'select', options: ['off', 'on', 'fallback', 'override'] },
  { key: 'noProxy', type: 'text', placeholder: 'localhost,127.0.0.1' },
  { key: 'useLocalProxyConfiguration', type: 'checkbox' },
  { key: 'networkInterfaceCheckInterval', type: 'number' },
  { key: 'systemCertificatesV2', type: 'checkbox' },
  { key: 'fetchAdditionalSupport', type: 'checkbox' },
  { key: 'systemCertificates', type: 'checkbox' },
  { key: 'systemCertificatesNode', type: 'checkbox' },
];

/**
 * دریافت همه مقادیر فعلی تنظیمات.
 * @returns {Record<string, any>}
 */
function getCurrentSettings() {
  const config = vscode.workspace.getConfiguration('proxyToggle');
  const settings = { enabled: config.get('enabled') };
  for (const field of FORM_FIELDS) {
    settings[field.key] = config.get(field.key);
  }
  return settings;
}

/**
 * اعمال تنظیمات روی http.* بر اساس وضعیت روشن/خاموش.
 * @param {boolean} enabled
 */
function applyProxySettings(enabled) {
  const config = vscode.workspace.getConfiguration('proxyToggle');
  const httpConfig = vscode.workspace.getConfiguration('http');
  const map = [
    ['http.proxy', 'proxyToggle.proxyUrl', ''],
    ['http.proxyAuthorization', 'proxyToggle.proxyAuthorization', ''],
    ['http.proxyStrictSSL', 'proxyToggle.proxyStrictSSL', false],
    ['http.proxySupport', 'proxyToggle.proxySupport', 'on'],
    ['http.noProxy', 'proxyToggle.noProxy', ''],
    ['http.useLocalProxyConfiguration', 'proxyToggle.useLocalProxyConfiguration', true],
    ['http.experimental.networkInterfaceCheckInterval', 'proxyToggle.networkInterfaceCheckInterval', 300],
    ['http.experimental.systemCertificatesV2', 'proxyToggle.systemCertificatesV2', false],
    ['http.fetchAdditionalSupport', 'proxyToggle.fetchAdditionalSupport', true],
    ['http.systemCertificates', 'proxyToggle.systemCertificates', true],
    ['http.systemCertificatesNode', 'proxyToggle.systemCertificatesNode', false],
  ];
  for (const [httpKey, extKey, offDefault] of map) {
    const value = enabled ? config.get(extKey) : offDefault;
    httpConfig.update(httpKey, value, vscode.ConfigurationTarget.Global).then(
      () => {},
      (err) => console.error(`[proxyToggle] Error updating ${httpKey}:`, err)
    );
  }
}

/**
 * ذخیره تنظیمات از فرم.
 * @param {Record<string, any>} settings
 */
async function saveSettings(settings) {
  const config = vscode.workspace.getConfiguration('proxyToggle');
  const beforeCerts = config.get('systemCertificates');
  const beforeCertsNode = config.get('systemCertificatesNode');

  // به‌روزرسانی enabled
  await config.update('enabled', settings.enabled, vscode.ConfigurationTarget.Global);
  // به‌روزرسانی بقیه فیلدها
  for (const field of FORM_FIELDS) {
    if (settings[field.key] !== undefined) {
      await config.update(field.key, settings[field.key], vscode.ConfigurationTarget.Global);
    }
  }

  // اعمال روی http.*
  applyProxySettings(settings.enabled);

  // بررسی نیاز به reload
  const afterCerts = settings.systemCertificates;
  const afterCertsNode = settings.systemCertificatesNode;
  const platform = process.platform;
  const certsChangedToOff =
    (platform === 'win32' || platform === 'darwin') && beforeCerts === true && afterCerts === false;
  const certsNodeChanged = beforeCertsNode !== afterCertsNode;

  return certsChangedToOff || certsNodeChanged;
}

/**
 * ساخت HTML پنل.
 * @param {Record<string, any>} settings
 * @returns {string}
 */
function getHtml(settings) {
  const isFa = i18n.getCurrentLocale().startsWith('fa');
  const dir = isFa ? 'rtl' : 'ltr';
  const lang = isFa ? 'fa' : 'en';

  const labels = {
    title: isFa ? 'تنظیمات پروکسی' : 'Proxy Settings',
    toggle: isFa ? 'پروکسی روشن است' : 'Proxy is ON',
    toggleOff: isFa ? 'پروکسی خاموش است' : 'Proxy is OFF',
    proxyUrl: isFa ? 'آدرس پروکسی' : 'Proxy URL',
    proxyAuthorization: isFa ? 'هدر Authorization' : 'Proxy Authorization',
    proxyStrictSSL: isFa ? 'بررسی دقیق SSL (Strict SSL)' : 'Strict SSL',
    proxySupport: isFa ? 'حالت پشتیبانی' : 'Proxy Support',
    noProxy: isFa ? 'هاست‌های مستثنی (No Proxy)' : 'No Proxy (excluded hosts)',
    useLocalProxyConfiguration: isFa ? 'استفاده از تنظیمات محلی (ریموت)' : 'Use Local Proxy Configuration',
    networkInterfaceCheckInterval: isFa ? 'بازه بررسی شبکه (ثانیه)' : 'Network Interface Check Interval (sec)',
    systemCertificatesV2: isFa ? 'گواهی آزمایشی V2' : 'System Certificates V2 (experimental)',
    fetchAdditionalSupport: isFa ? 'پشتیبانی اضافی fetch' : 'Fetch Additional Support',
    systemCertificates: isFa ? 'گواهی‌های سیستم‌عامل' : 'System Certificates',
    systemCertificatesNode: isFa ? 'گواهی سیستم با Node.js' : 'System Certificates (Node.js)',
    save: isFa ? 'ذخیره و اعمال' : 'Save & Apply',
    cancel: isFa ? 'انصراف' : 'Cancel',
    saved: isFa ? 'تنظیمات ذخیره شد ✓' : 'Settings saved ✓',
    reloadMsg: isFa ? 'برای اعمال کامل، نیاز به بارگذاری مجدد پنجره است.' : 'A window reload is required to fully apply changes.',
    reload: isFa ? 'بارگذاری مجدد' : 'Reload Window',
    reloadDismiss: isFa ? 'الان نه' : 'Not now',
    on: isFa ? 'روشن' : 'ON',
    off: isFa ? 'خاموش' : 'OFF',
    sectionBasic: isFa ? 'تنظیمات اصلی' : 'Basic Settings',
    sectionAdvanced: isFa ? 'تنظیمات پیشرفته' : 'Advanced Settings',
    hintInterval: isFa ? '-1 برای غیرفعال کردن' : '-1 to disable',
    hintCert: isFa ? 'بعد از تغییر نیاز به Reload دارد' : 'Requires reload after change',
  };

  const fieldDefs = [
    { key: 'proxyUrl', label: labels.proxyUrl, type: 'text', placeholder: 'http://127.0.0.1:1080' },
    { key: 'proxyAuthorization', label: labels.proxyAuthorization, type: 'text', placeholder: '' },
    { key: 'proxyStrictSSL', label: labels.proxyStrictSSL, type: 'checkbox' },
    { key: 'proxySupport', label: labels.proxySupport, type: 'select', options: ['off', 'on', 'fallback', 'override'] },
    { key: 'noProxy', label: labels.noProxy, type: 'text', placeholder: 'localhost,127.0.0.1' },
    { key: 'useLocalProxyConfiguration', label: labels.useLocalProxyConfiguration, type: 'checkbox' },
    { key: 'networkInterfaceCheckInterval', label: labels.networkInterfaceCheckInterval, type: 'number', hint: labels.hintInterval },
    { key: 'systemCertificatesV2', label: labels.systemCertificatesV2, type: 'checkbox' },
    { key: 'fetchAdditionalSupport', label: labels.fetchAdditionalSupport, type: 'checkbox' },
    { key: 'systemCertificates', label: labels.systemCertificates, type: 'checkbox', hint: labels.hintCert },
    { key: 'systemCertificatesNode', label: labels.systemCertificatesNode, type: 'checkbox', hint: labels.hintCert },
  ];

  function renderField(field) {
    const val = settings[field.key];
    if (field.type === 'checkbox') {
      const checked = val ? 'checked' : '';
      const hint = field.hint ? `<span class="hint">${field.hint}</span>` : '';
      return `
        <div class="field-row">
          <label class="checkbox-label">
            <input type="checkbox" id="${field.key}" ${checked} />
            <span>${field.label}</span>
          </label>
          ${hint}
        </div>`;
    }
    if (field.type === 'select') {
      const options = field.options
        .map((o) => `<option value="${o}" ${o === val ? 'selected' : ''}>${o}</option>`)
        .join('');
      return `
        <div class="field-row">
          <label for="${field.key}">${field.label}</label>
          <select id="${field.key}">${options}</select>
        </div>`;
    }
    if (field.type === 'number') {
      const hint = field.hint ? `<span class="hint">${field.hint}</span>` : '';
      return `
        <div class="field-row">
          <label for="${field.key}">${field.label}</label>
          <input type="number" id="${field.key}" value="${val ?? ''}" />
          ${hint}
        </div>`;
    }
    return `
      <div class="field-row">
        <label for="${field.key}">${field.label}</label>
        <input type="text" id="${field.key}" value="${val ?? ''}" placeholder="${field.placeholder || ''}" />
      </div>`;
  }

  const basicFields = fieldDefs.slice(0, 5).map(renderField).join('');
  const advancedFields = fieldDefs.slice(5).map(renderField).join('');

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${labels.title}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: var(--vscode-font-family, 'Segoe UI', sans-serif);
    font-size: 13px;
    color: var(--vscode-foreground);
    background: var(--vscode-editor-background);
    padding: 20px 24px;
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--vscode-panel-border, #333);
  }
  .header h1 {
    font-size: 18px;
    font-weight: 600;
  }
  .toggle-switch {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .switch {
    position: relative;
    display: inline-block;
    width: 50px;
    height: 26px;
  }
  .switch input { opacity: 0; width: 0; height: 0; }
  .slider {
    position: absolute;
    cursor: pointer;
    top: 0; left: 0; right: 0; bottom: 0;
    background: var(--vscode-input-background, #3c3c3c);
    border: 1px solid var(--vscode-input-border, #555);
    border-radius: 26px;
    transition: 0.3s;
  }
  .slider:before {
    content: "";
    position: absolute;
    height: 18px; width: 18px;
    left: 3px; bottom: 3px;
    background: var(--vscode-button-foreground, #fff);
    border-radius: 50%;
    transition: 0.3s;
  }
  input:checked + .slider {
    background: var(--vscode-button-background, #0e639c);
  }
  input:checked + .slider:before {
    transform: translateX(22px);
  }
  .toggle-label {
    font-weight: 600;
    font-size: 14px;
  }
  .toggle-label.on { color: #4ec9b0; }
  .toggle-label.off { color: #f48771; }
  .section {
    margin-bottom: 20px;
  }
  .section-title {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 12px;
    color: var(--vscode-textLink-foreground, #4daafc);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .field-row {
    display: flex;
    flex-direction: column;
    margin-bottom: 14px;
  }
  .field-row label {
    margin-bottom: 5px;
    font-weight: 500;
  }
  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    flex-direction: row !important;
    margin-bottom: 0 !important;
  }
  .checkbox-label input[type="checkbox"] {
    width: 16px; height: 16px;
    cursor: pointer;
  }
  .hint {
    font-size: 11px;
    color: var(--vscode-descriptionForeground, #888);
    margin-top: 4px;
    margin-inline-start: 24px;
  }
  input[type="text"], input[type="number"], select {
    width: 100%;
    padding: 6px 10px;
    background: var(--vscode-input-background, #3c3c3c);
    color: var(--vscode-input-foreground, #fff);
    border: 1px solid var(--vscode-input-border, #555);
    border-radius: 3px;
    font-size: 13px;
    font-family: inherit;
  }
  input:focus, select:focus {
    outline: 1px solid var(--vscode-focusBorder, #007fd4);
    border-color: var(--vscode-focusBorder, #007fd4);
  }
  .buttons {
    display: flex;
    gap: 10px;
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px solid var(--vscode-panel-border, #333);
  }
  .btn {
    padding: 8px 20px;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    font-size: 13px;
    font-family: inherit;
    font-weight: 500;
  }
  .btn-primary {
    background: var(--vscode-button-background, #0e639c);
    color: var(--vscode-button-foreground, #fff);
  }
  .btn-primary:hover {
    background: var(--vscode-button-hoverBackground, #1177bb);
  }
  .btn-secondary {
    background: transparent;
    color: var(--vscode-foreground);
    border: 1px solid var(--vscode-input-border, #555);
  }
  .btn-secondary:hover {
    background: var(--vscode-list-hoverBackground, #2a2d2e);
  }
  .toast {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    background: #4ec9b0;
    color: #000;
    border-radius: 4px;
    font-weight: 600;
    opacity: 0;
    transition: opacity 0.3s;
    z-index: 1000;
  }
  .toast.show { opacity: 1; }
</style>
</head>
<body>
  <div class="header">
    <h1>${labels.title}</h1>
    <div class="toggle-switch">
      <span class="toggle-label ${settings.enabled ? 'on' : 'off'}" id="toggleLabel">
        ${settings.enabled ? labels.on : labels.off}
      </span>
      <label class="switch">
        <input type="checkbox" id="enabledToggle" ${settings.enabled ? 'checked' : ''} />
        <span class="slider"></span>
      </label>
    </div>
  </div>

  <div class="section">
    <div class="section-title">${labels.sectionBasic}</div>
    ${basicFields}
  </div>

  <div class="section">
    <div class="section-title">${labels.sectionAdvanced}</div>
    ${advancedFields}
  </div>

  <div class="buttons">
    <button class="btn btn-primary" id="saveBtn">${labels.save}</button>
    <button class="btn btn-secondary" id="cancelBtn">${labels.cancel}</button>
  </div>

  <div class="toast" id="toast">${labels.saved}</div>

  <script>
    const vscode = acquireVsCodeApi();
    const labels = ${JSON.stringify({ on: labels.on, off: labels.off, saved: labels.saved })};

    // toggle label update
    const toggleInput = document.getElementById('enabledToggle');
    const toggleLabel = document.getElementById('toggleLabel');
    toggleInput.addEventListener('change', (e) => {
      const on = e.target.checked;
      toggleLabel.textContent = on ? labels.on : labels.off;
      toggleLabel.className = 'toggle-label ' + (on ? 'on' : 'off');
    });

    // save
    document.getElementById('saveBtn').addEventListener('click', () => {
      const data = {
        enabled: document.getElementById('enabledToggle').checked,
        proxyUrl: document.getElementById('proxyUrl').value,
        proxyAuthorization: document.getElementById('proxyAuthorization').value,
        proxyStrictSSL: document.getElementById('proxyStrictSSL').checked,
        proxySupport: document.getElementById('proxySupport').value,
        noProxy: document.getElementById('noProxy').value,
        useLocalProxyConfiguration: document.getElementById('useLocalProxyConfiguration').checked,
        networkInterfaceCheckInterval: parseInt(document.getElementById('networkInterfaceCheckInterval').value, 10),
        systemCertificatesV2: document.getElementById('systemCertificatesV2').checked,
        fetchAdditionalSupport: document.getElementById('fetchAdditionalSupport').checked,
        systemCertificates: document.getElementById('systemCertificates').checked,
        systemCertificatesNode: document.getElementById('systemCertificatesNode').checked,
      };
      vscode.postMessage({ command: 'save', settings: data });
    });

    // cancel
    document.getElementById('cancelBtn').addEventListener('click', () => {
      vscode.postMessage({ command: 'cancel' });
    });

    // message from extension
    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (msg.command === 'saved') {
        const toast = document.getElementById('toast');
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
      }
      if (msg.command === 'reloadPrompt') {
        vscode.postMessage({ command: 'reload' });
      }
    });
  </script>
</body>
</html>`;
}

/**
 * باز کردن پنل تنظیمات پروکسی.
 * @param {vscode.ExtensionContext} context
 */
function showProxyPanel(context) {
  const settings = getCurrentSettings();
  const isFa = i18n.getCurrentLocale().startsWith('fa');
  const title = isFa ? 'تنظیمات پروکسی' : 'Proxy Settings';

  if (panel) {
    panel.reveal(vscode.ViewColumn.Active);
    panel.webview.html = getHtml(settings);
    return;
  }

  panel = vscode.window.createWebviewPanel(
    'proxyTogglePanel',
    title,
    vscode.ViewColumn.Active,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    }
  );

  panel.webview.html = getHtml(settings);

  panel.webview.onDidReceiveMessage(
    async (message) => {
      if (message.command === 'save') {
        const needsReload = await saveSettings(message.settings);
        // به‌روزرسانی HTML با مقادیر جدید
        panel.webview.html = getHtml(message.settings);
        panel.webview.postMessage({ command: 'saved' });

        if (needsReload) {
          const isFa = i18n.getCurrentLocale().startsWith('fa');
          const reloadMsg = isFa
            ? 'برای اعمال کامل، نیاز به بارگذاری مجدد پنجره است.'
            : 'A window reload is required to fully apply changes.';
          const reloadBtn = isFa ? 'بارگذاری مجدد' : 'Reload Window';
          const dismissBtn = isFa ? 'الان نه' : 'Not now';
          const action = await vscode.window.showInformationMessage(reloadMsg, reloadBtn, dismissBtn);
          if (action === reloadBtn) {
            vscode.commands.executeCommand('workbench.action.reloadWindow');
          }
        }
      }
      if (message.command === 'cancel') {
        panel.dispose();
      }
    },
    undefined,
    context.subscriptions
  );

  panel.onDidDispose(() => {
    panel = null;
  }, null, context.subscriptions);
}

module.exports = {
  showProxyPanel,
  applyProxySettings,
};
