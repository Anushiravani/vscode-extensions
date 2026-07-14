const vscode = require('vscode');
const i18n = require('./i18n');

/**
 * @type {vscode.WebviewView}
 */
let view = null;

/**
 * کلیدهای تنظیمات VSCode که این اکستنشن مدیریت می‌کند.
 */
const PROXY_SETTINGS_MAP = [
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

const FIELD_DEFS = [
  { key: 'proxyUrl', type: 'text', placeholder: 'http://127.0.0.1:1080' },
  { key: 'proxyAuthorization', type: 'text', placeholder: '' },
  { key: 'proxyStrictSSL', type: 'checkbox' },
  { key: 'proxySupport', type: 'select', options: ['off', 'on', 'fallback', 'override'] },
  { key: 'noProxy', type: 'text', placeholder: 'localhost,127.0.0.1' },
  { key: 'useLocalProxyConfiguration', type: 'checkbox' },
  { key: 'networkInterfaceCheckInterval', type: 'number' },
  { key: 'systemCertificatesV2', type: 'checkbox' },
  { key: 'fetchAdditionalSupport', type: 'checkbox' },
  { key: 'systemCertificates', type: 'checkbox', reloadHint: true },
  { key: 'systemCertificatesNode', type: 'checkbox', reloadHint: true },
];

function getCurrentSettings() {
  const config = vscode.workspace.getConfiguration('proxyToggle');
  const settings = { enabled: config.get('enabled') };
  for (const f of FIELD_DEFS) {
    settings[f.key] = config.get(f.key);
  }
  return settings;
}

function applyProxySettings(enabled) {
  const config = vscode.workspace.getConfiguration('proxyToggle');
  const httpConfig = vscode.workspace.getConfiguration('http');
  for (const [httpKey, extKey, offDefault] of PROXY_SETTINGS_MAP) {
    const value = enabled ? config.get(extKey) : offDefault;
    httpConfig.update(httpKey, value, vscode.ConfigurationTarget.Global).then(
      () => {},
      (err) => console.error(`[proxyToggle] Error updating ${httpKey}:`, err)
    );
  }
}

async function saveSettings(settings) {
  const config = vscode.workspace.getConfiguration('proxyToggle');
  const beforeCerts = config.get('systemCertificates');
  const beforeCertsNode = config.get('systemCertificatesNode');

  await config.update('enabled', settings.enabled, vscode.ConfigurationTarget.Global);
  for (const f of FIELD_DEFS) {
    if (settings[f.key] !== undefined) {
      await config.update(f.key, settings[f.key], vscode.ConfigurationTarget.Global);
    }
  }
  applyProxySettings(settings.enabled);

  const platform = process.platform;
  const certsChangedToOff =
    (platform === 'win32' || platform === 'darwin') && beforeCerts === true && settings.systemCertificates === false;
  const certsNodeChanged = beforeCertsNode !== settings.systemCertificatesNode;
  return certsChangedToOff || certsNodeChanged;
}

function getHtml(settings) {
  const isFa = i18n.getCurrentLocale().startsWith('fa');
  const dir = isFa ? 'rtl' : 'ltr';

  const L = {
    title: isFa ? 'تنظیمات پروکسی' : 'Proxy Settings',
    on: isFa ? 'روشن' : 'ON',
    off: isFa ? 'خاموش' : 'OFF',
    save: isFa ? 'ذخیره و اعمال' : 'Save & Apply',
    saved: isFa ? 'ذخیره شد ✓' : 'Saved ✓',
    proxyUrl: isFa ? 'آدرس پروکسی' : 'Proxy URL',
    proxyAuth: isFa ? 'Authorization' : 'Authorization',
    strictSSL: isFa ? 'Strict SSL' : 'Strict SSL',
    support: isFa ? 'حالت پشتیبانی' : 'Proxy Support',
    noProxy: isFa ? 'مستثنی (No Proxy)' : 'No Proxy',
    localProxy: isFa ? 'تنظیمات محلی' : 'Local Config',
    netInterval: isFa ? 'بازه بررسی شبکه' : 'Net Check Interval',
    certV2: isFa ? 'گواهی V2' : 'Cert V2',
    fetchSupport: isFa ? 'پشتیبانی Fetch' : 'Fetch Support',
    sysCert: isFa ? 'گواهی سیستم' : 'System Certs',
    sysCertNode: isFa ? 'گواهی Node.js' : 'Node.js Certs',
    basic: isFa ? 'پایه' : 'Basic',
    advanced: isFa ? 'پیشرفته' : 'Advanced',
    hintInterval: isFa ? '-1 = غیرفعال' : '-1 = disable',
    hintReload: isFa ? '⚠ نیاز به Reload' : '⚠ Reload needed',
  };

  const fields = [
    { key: 'proxyUrl', label: L.proxyUrl, type: 'text', placeholder: 'http://127.0.0.1:1080' },
    { key: 'proxyAuthorization', label: L.proxyAuth, type: 'text', placeholder: '' },
    { key: 'proxyStrictSSL', label: L.strictSSL, type: 'checkbox' },
    { key: 'proxySupport', label: L.support, type: 'select', options: ['off', 'on', 'fallback', 'override'] },
    { key: 'noProxy', label: L.noProxy, type: 'text', placeholder: 'localhost,127.0.0.1' },
    { key: 'useLocalProxyConfiguration', label: L.localProxy, type: 'checkbox' },
    { key: 'networkInterfaceCheckInterval', label: L.netInterval, type: 'number', hint: L.hintInterval },
    { key: 'systemCertificatesV2', label: L.certV2, type: 'checkbox' },
    { key: 'fetchAdditionalSupport', label: L.fetchSupport, type: 'checkbox' },
    { key: 'systemCertificates', label: L.sysCert, type: 'checkbox', hint: L.hintReload },
    { key: 'systemCertificatesNode', label: L.sysCertNode, type: 'checkbox', hint: L.hintReload },
  ];

  function renderField(f) {
    const val = settings[f.key];
    if (f.type === 'checkbox') {
      const hint = f.hint ? `<span class="hint">${f.hint}</span>` : '';
      return `<label class="cb"><input type="checkbox" id="${f.key}" ${val ? 'checked' : ''}/><span>${f.label}</span></label>${hint}`;
    }
    if (f.type === 'select') {
      const opts = f.options.map(o => `<option value="${o}" ${o === val ? 'selected' : ''}>${o}</option>`).join('');
      return `<div class="row"><label for="${f.key}">${f.label}</label><select id="${f.key}">${opts}</select></div>`;
    }
    if (f.type === 'number') {
      const hint = f.hint ? `<span class="hint">${f.hint}</span>` : '';
      return `<div class="row"><label for="${f.key}">${f.label}</label><input type="number" id="${f.key}" value="${val ?? ''}"/>${hint}</div>`;
    }
    return `<div class="row"><label for="${f.key}">${f.label}</label><input type="text" id="${f.key}" value="${val ?? ''}" placeholder="${f.placeholder || ''}"/></div>`;
  }

  const basicHtml = fields.slice(0, 5).map(renderField).join('');
  const advHtml = fields.slice(5).map(renderField).join('');

  // CSP: allow inline scripts and styles
  const csp = `default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';`;

  // Dropdown وضعیت پروکسی
  const statusLabel = isFa ? 'وضعیت پروکسی' : 'Proxy Status';
  const onLabel = isFa ? 'روشن (ON)' : 'On';
  const offLabel = isFa ? 'خاموش (OFF)' : 'Off';
  const statusDropdown = `
    <div class="row status-row">
      <label for="proxyStatus">${statusLabel}</label>
      <select id="proxyStatus">
        <option value="true" ${settings.enabled ? 'selected' : ''}>${onLabel}</option>
        <option value="false" ${!settings.enabled ? 'selected' : ''}>${offLabel}</option>
      </select>
    </div>`;

  return `<!DOCTYPE html>
<html lang="${isFa ? 'fa' : 'en'}" dir="${dir}">
<head>
<meta charset="UTF-8"/>
<meta http-equiv="Content-Security-Policy" content="${csp}"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: var(--vscode-font-family, 'Segoe UI', sans-serif);
    font-size: 12px;
    color: var(--vscode-foreground);
    background: var(--vscode-editor-background);
    padding: 10px 12px;
  }
  .section { margin-bottom: 10px; }
  .section-title {
    font-size: 10px; font-weight: 700; text-transform: uppercase;
    color: var(--vscode-textLink-foreground, #4daafc);
    margin-bottom: 6px; letter-spacing: 0.5px;
  }
  .row { display: flex; flex-direction: column; margin-bottom: 8px; }
  .row label { margin-bottom: 3px; font-weight: 500; font-size: 11px; }
  .status-row select { font-weight: 600; }
  .cb {
    display: flex; align-items: center; gap: 6px;
    cursor: pointer; margin-bottom: 6px; font-size: 11px;
  }
  .cb input[type="checkbox"] { width: 14px; height: 14px; cursor: pointer; }
  .hint {
    display: block; font-size: 10px;
    color: var(--vscode-descriptionForeground, #888);
    margin-top: 2px; margin-inline-start: 20px;
  }
  input[type="text"], input[type="number"], select {
    width: 100%; padding: 4px 8px;
    background: var(--vscode-input-background, #3c3c3c);
    color: var(--vscode-input-foreground, #fff);
    border: 1px solid var(--vscode-input-border, #555);
    border-radius: 2px; font-size: 12px; font-family: inherit;
  }
  input:focus, select:focus {
    outline: 1px solid var(--vscode-focusBorder, #007fd4);
    border-color: var(--vscode-focusBorder, #007fd4);
  }
  .btns {
    display: flex; gap: 8px; margin-top: 12px;
    padding-top: 8px; border-top: 1px solid var(--vscode-panel-border, #333);
  }
  .btn {
    padding: 6px 16px; border: none; border-radius: 2px;
    cursor: pointer; font-size: 12px; font-family: inherit; font-weight: 500;
  }
  .btn-primary {
    background: var(--vscode-button-background, #0e639c);
    color: var(--vscode-button-foreground, #fff);
  }
  .btn-primary:hover { background: var(--vscode-button-hoverBackground, #1177bb); }
  .toast {
    position: fixed; top: 8px; right: 8px;
    padding: 6px 12px; background: #4ec9b0; color: #000;
    border-radius: 3px; font-weight: 600; font-size: 11px;
    opacity: 0; transition: opacity 0.3s; z-index: 1000;
  }
  .toast.show { opacity: 1; }
</style>
</head>
<body>
  <div class="section">
    <div class="section-title">${L.basic}</div>
    ${statusDropdown}
    ${basicHtml}
  </div>
  <div class="section">
    <div class="section-title">${L.advanced}</div>
    ${advHtml}
  </div>
  <div class="btns">
    <button class="btn btn-primary" id="saveBtn">${L.save}</button>
  </div>
  <div class="toast" id="toast">${L.saved}</div>
  <script>
    const vscode = acquireVsCodeApi();
    const L = ${JSON.stringify({ on: L.on, off: L.off, saved: L.saved })};
    const statusSelect = document.getElementById('proxyStatus');

    // تغییر وضعیت پروکسی از dropdown
    statusSelect.addEventListener('change', () => {
      const on = statusSelect.value === 'true';
      vscode.postMessage({ command: 'toggle', enabled: on });
    });

    // Save & Apply
    document.getElementById('saveBtn').addEventListener('click', () => {
      const d = { enabled: statusSelect.value === 'true' };
      ${FIELD_DEFS.map(f => {
        if (f.type === 'checkbox') return `d.${f.key} = document.getElementById('${f.key}').checked;`;
        if (f.type === 'number') return `d.${f.key} = parseInt(document.getElementById('${f.key}').value, 10);`;
        if (f.type === 'select') return `d.${f.key} = document.getElementById('${f.key}').value;`;
        return `d.${f.key} = document.getElementById('${f.key}').value;`;
      }).join('\n      ')}
      vscode.postMessage({ command: 'save', settings: d });
    });

    // دریافت پیام از extension
    window.addEventListener('message', (e) => {
      const m = e.data;
      if (m.command === 'saved') {
        const t = document.getElementById('toast');
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 1500);
      }
      if (m.command === 'toggled') {
        const t = document.getElementById('toast');
        t.textContent = m.enabled ? L.on : L.off;
        t.classList.add('show');
        setTimeout(() => { t.classList.remove('show'); t.textContent = L.saved; }, 1000);
      }
    });
  </script>
</body>
</html>`;
}

class ProxyViewProvider {
  constructor(context) {
    this.context = context;
  }

  resolveWebviewView(webviewView) {
    view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
    };
    webviewView.webview.html = getHtml(getCurrentSettings());

    webviewView.webview.onDidReceiveMessage(
      async (message) => {
        if (message.command === 'toggle') {
          // Toggle مستقیم: فقط enabled رو تغییر بده و اعمال کن
          // refresh رو غیرفعال کن تا HTML دوباره set نشه و listenerها از بین نرن
          this._suppressRefresh = true;
          const config = vscode.workspace.getConfiguration('proxyToggle');
          await config.update('enabled', message.enabled, vscode.ConfigurationTarget.Global);
          applyProxySettings(message.enabled);
          this._suppressRefresh = false;
          webviewView.webview.postMessage({ command: 'toggled', enabled: message.enabled });
        }
        if (message.command === 'save') {
          this._suppressRefresh = true;
          const needsReload = await saveSettings(message.settings);
          this._suppressRefresh = false;
          webviewView.webview.html = getHtml(message.settings);
          webviewView.webview.postMessage({ command: 'saved' });

          if (needsReload) {
            const isFa = i18n.getCurrentLocale().startsWith('fa');
            const msg = isFa
              ? 'برای اعمال کامل، بارگذاری مجدد پنجره لازم است.'
              : 'A window reload is needed to fully apply changes.';
            const reloadBtn = isFa ? 'بارگذاری مجدد' : 'Reload';
            const dismissBtn = isFa ? 'الان نه' : 'Not now';
            const action = await vscode.window.showInformationMessage(msg, reloadBtn, dismissBtn);
            if (action === reloadBtn) {
              vscode.commands.executeCommand('workbench.action.reloadWindow');
            }
          }
        }
      },
      undefined,
      this.context.subscriptions
    );
  }

  refresh() {
    if (view && !this._suppressRefresh) {
      view.webview.html = getHtml(getCurrentSettings());
    }
  }
}

function revealPanel() {
  vscode.commands.executeCommand('proxyToggle.view.focus');
}

module.exports = {
  ProxyViewProvider,
  revealPanel,
  applyProxySettings,
};
