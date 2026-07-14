const vscode = require('vscode');
const i18n = require('./i18n');
const proxyPanel = require('./proxyPanel');

/**
 * @type {vscode.StatusBarItem}
 */
let statusBarItem;

/**
 * @type {vscode.Disposable}
 */
let configChangeListener;

/**
 * @type {vscode.ExtensionContext}
 */
let extensionContext;

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

/**
 * اعمال یا پاک کردن تنظیمات پروکسی روی VSCode.
 * @param {boolean} enabled
 */
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

/**
 * به‌روزرسانی نمایش دکمه در نوار وضعیت.
 */
function updateStatusBar() {
  const enabled = vscode.workspace.getConfiguration('proxyToggle').get('enabled');
  if (!statusBarItem) {
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'proxyToggle.openPanel';
  }
  if (enabled) {
    const url = vscode.workspace.getConfiguration('proxyToggle').get('proxyUrl') || '';
    statusBarItem.text = `$(shield) ${i18n.t('runtime.proxyOn')}`;
    statusBarItem.tooltip = i18n.t('runtime.tooltipOn', url);
  } else {
    statusBarItem.text = `$(circle-slash) ${i18n.t('runtime.proxyOff')}`;
    statusBarItem.tooltip = i18n.t('runtime.tooltipOff');
  }
  statusBarItem.show();
}

/**
 * باز کردن پنل تنظیمات پروکسی (Webview).
 */
function openPanel() {
  proxyPanel.showProxyPanel(extensionContext);
}

/**
 * باز کردن صفحه تنظیمات اکستنشن (Settings JSON UI).
 */
function openSettings() {
  vscode.commands.executeCommand('workbench.action.openSettings', 'proxyToggle');
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  extensionContext = context;

  updateStatusBar();

  context.subscriptions.push(
    vscode.commands.registerCommand('proxyToggle.openPanel', openPanel),
    vscode.commands.registerCommand('proxyToggle.openSettings', openSettings)
  );

  // گوش دادن به تغییرات تنظیمات برای به‌روزرسانی دکمه
  configChangeListener = vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration('proxyToggle')) {
      updateStatusBar();
    }
  });
  context.subscriptions.push(configChangeListener);
  context.subscriptions.push(statusBarItem);

  // اعمال تنظیمات هنگام فعال‌سازی اگر پروکسی روشن است
  const initiallyEnabled = vscode.workspace.getConfiguration('proxyToggle').get('enabled');
  if (initiallyEnabled) {
    applyProxySettings(true);
  }
}

function deactivate() {
  if (statusBarItem) {
    statusBarItem.dispose();
  }
}

module.exports = {
  activate,
  deactivate,
};
