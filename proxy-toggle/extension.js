const vscode = require('vscode');
const i18n = require('./i18n');
const { ProxyViewProvider, revealPanel, applyProxySettings } = require('./proxyView');

/**
 * @type {vscode.StatusBarItem}
 */
let statusBarItem;

/**
 * @type {vscode.Disposable}
 */
let configChangeListener;

/**
 * @type {ProxyViewProvider}
 */
let provider;

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
    statusBarItem.color = '#000000';
    statusBarItem.backgroundColor = '#4ec9b0';
  } else {
    statusBarItem.text = `$(circle-slash) ${i18n.t('runtime.proxyOff')}`;
    statusBarItem.tooltip = i18n.t('runtime.tooltipOff');
    statusBarItem.color = undefined;
    statusBarItem.backgroundColor = undefined;
  }
  statusBarItem.show();
}

/**
 * باز کردن پنل پایین (reveal + focus).
 */
function openPanel() {
  revealPanel();
  // به‌روزرسانی محتوای view با مقادیر فعلی
  if (provider) {
    provider.refresh();
  }
}

/**
 * باز کردن صفحه تنظیمات اکستنشن.
 */
function openSettings() {
  vscode.commands.executeCommand('workbench.action.openSettings', 'proxyToggle');
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  updateStatusBar();

  // ثبت WebviewViewProvider
  provider = new ProxyViewProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('proxyToggle.view', provider, {
      webviewOptions: { retainContextWhenHidden: true },
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('proxyToggle.openPanel', openPanel),
    vscode.commands.registerCommand('proxyToggle.openSettings', openSettings)
  );

  // گوش دادن به تغییرات تنظیمات برای به‌روزرسانی دکمه و view
  configChangeListener = vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration('proxyToggle')) {
      updateStatusBar();
      if (provider) {
        provider.refresh();
      }
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
