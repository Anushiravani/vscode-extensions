const vscode = require('vscode');
const i18n = require('./i18n');

/**
 * کلیدهای تنظیمات VSCode که این اکستنشن مدیریت می‌کند.
 * [کلید http.*, کلید اکستنشن, مقدار پیش‌فرض هنگام خاموش]
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
 * تعریف فیلدهای قابل ویرایش در پاپ‌آپ.
 * type: 'text' | 'number' | 'boolean' | 'select'
 */
const FIELD_DEFS = [
  { extKey: 'proxyUrl', type: 'text', icon: '$(globe)', hint: 'e.g. http://127.0.0.1:1080' },
  { extKey: 'proxyAuthorization', type: 'text', icon: '$(key)', hint: 'Authorization header' },
  { extKey: 'proxyStrictSSL', type: 'boolean', icon: '$(lock)' },
  { extKey: 'proxySupport', type: 'select', icon: '$(settings)', options: ['off', 'on', 'fallback', 'override'] },
  { extKey: 'noProxy', type: 'text', icon: '$(exclude)', hint: 'localhost,127.0.0.1' },
  { extKey: 'useLocalProxyConfiguration', type: 'boolean', icon: '$(remote)' },
  { extKey: 'networkInterfaceCheckInterval', type: 'number', icon: '$(watch)', hint: '-1 to disable' },
  { extKey: 'systemCertificatesV2', type: 'boolean', icon: '$(certificate)' },
  { extKey: 'fetchAdditionalSupport', type: 'boolean', icon: '$(cloud-download)' },
  { extKey: 'systemCertificates', type: 'boolean', icon: '$(shield)', reloadHint: true },
  { extKey: 'systemCertificatesNode', type: 'boolean', icon: '$(server)', reloadHint: true },
];

/**
 * اعمال تنظیمات پروکسی روی http.* بر اساس وضعیت روشن/خاموش.
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
 * ذخیره یک تنظیم خاص.
 * @param {string} key
 * @param {any} value
 */
async function saveSetting(key, value) {
  const config = vscode.workspace.getConfiguration('proxyToggle');
  await config.update(key, value, vscode.ConfigurationTarget.Global);
}

/**
 * نمایش مقدار فیلد به‌صورت خلاصه برای QuickPick.
 * @param {any} value
 * @returns {string}
 */
function formatValue(value) {
  if (typeof value === 'boolean') {
    return value ? '✓ On' : '✗ Off';
  }
  if (value === '' || value === undefined || value === null) {
    return '(empty)';
  }
  return String(value);
}

/**
 * بررسی نیاز به reload.
 * @param {string} key
 * @param {any} oldValue
 * @param {any} newValue
 * @returns {boolean}
 */
function checkReloadNeeded(key, oldValue, newValue) {
  const platform = process.platform;
  if (key === 'systemCertificatesNode' && oldValue !== newValue) {
    return true;
  }
  if (key === 'systemCertificates') {
    if (platform === 'win32' || platform === 'darwin') {
      if (oldValue === true && newValue === false) {
        return true;
      }
    }
  }
  return false;
}

/**
 * نمایش پاپ‌آپ Reload Window.
 */
async function promptReload() {
  const isFa = i18n.getCurrentLocale().startsWith('fa');
  const msg = isFa
    ? 'برای اعمال کامل تغییرات، نیاز به بارگذاری مجدد پنجره است.'
    : 'A window reload is required to fully apply changes.';
  const reloadBtn = isFa ? 'بارگذاری مجدد' : 'Reload Window';
  const dismissBtn = isFa ? 'الان نه' : 'Not now';
  const action = await vscode.window.showInformationMessage(msg, reloadBtn, dismissBtn);
  if (action === reloadBtn) {
    vscode.commands.executeCommand('workbench.action.reloadWindow');
  }
}

/**
 * ویرایش یک فیلد متنی با InputBox.
 * @param {object} field
 * @param {any} currentValue
 * @returns {Promise<string|undefined>}
 */
async function editTextField(field, currentValue) {
  const isFa = i18n.getCurrentLocale().startsWith('fa');
  return vscode.window.showInputBox({
    value: currentValue || '',
    prompt: isFa ? `مقدار جدید برای ${field.extKey}` : `New value for ${field.extKey}`,
    placeHolder: field.hint || '',
  });
}

/**
 * ویرایش یک فیلد عددی با InputBox.
 * @param {object} field
 * @param {any} currentValue
 * @returns {Promise<number|undefined>}
 */
async function editNumberField(field, currentValue) {
  const isFa = i18n.getCurrentLocale().startsWith('fa');
  const input = await vscode.window.showInputBox({
    value: String(currentValue ?? ''),
    prompt: isFa ? `مقدار جدید برای ${field.extKey}` : `New value for ${field.extKey}`,
    placeHolder: field.hint || '',
    validateInput: (v) => {
      if (v === '' || isNaN(parseInt(v, 10))) {
        return isFa ? 'لطفاً یک عدد وارد کنید' : 'Please enter a valid number';
      }
      return null;
    },
  });
  if (input !== undefined) {
    return parseInt(input, 10);
  }
  return undefined;
}

/**
 * ویرایش یک فیلد انتخابی با QuickPick.
 * @param {object} field
 * @param {any} currentValue
 * @returns {Promise<string|undefined>}
 */
async function editSelectField(field, currentValue) {
  const isFa = i18n.getCurrentLocale().startsWith('fa');
  const pick = await vscode.window.showQuickPick(
    field.options.map((o) => ({
      label: o,
      picked: o === currentValue,
      description: o === currentValue ? (isFa ? '(فعلی)' : '(current)') : '',
    })),
    { placeHolder: isFa ? `مقدار جدید برای ${field.extKey}` : `Select value for ${field.extKey}` }
  );
  return pick ? pick.label : undefined;
}

/**
 * باز کردن پاپ‌آپ اصلی تنظیمات پروکسی (QuickPick).
 */
async function showProxyPopup() {
  const isFa = i18n.getCurrentLocale().startsWith('fa');
  const config = vscode.workspace.getConfiguration('proxyToggle');
  const enabled = config.get('enabled');

  // ساخت آیتم‌های QuickPick
  // آیتم اول: toggle روشن/خاموش
  const toggleItem = {
    label: enabled
      ? (isFa ? '$(circle-filled) پروکسی: روشن' : '$(circle-filled) Proxy: ON')
      : (isFa ? '$(circle-outline) پروکسی: خاموش' : '$(circle-outline) Proxy: OFF'),
    description: isFa ? 'کلیک برای تغییر وضعیت' : 'Click to toggle',
    isToggle: true,
  };

  // جداکننده
  const separator = {
    label: isFa ? '── تنظیمات ──' : '── Settings ──',
    kind: vscode.QuickPickItemKind.Separator,
  };

  // آیتم‌های تنظیمات
  const settingItems = FIELD_DEFS.map((field) => {
    const value = config.get(field.extKey);
    const reloadTag = field.reloadHint ? (isFa ? ' ⚠ نیاز به Reload' : ' ⚠ Reload required') : '';
    return {
      label: `${field.icon} ${field.extKey}`,
      description: formatValue(value) + reloadTag,
      field,
      currentValue: value,
    };
  });

  const allItems = [toggleItem, separator, ...settingItems];

  const pick = await vscode.window.showQuickPick(allItems, {
    placeHolder: isFa
      ? 'تنظیمات پروکسی — یک مورد را برای ویرایش انتخاب کنید'
      : 'Proxy settings — select an item to edit',
    canPickMany: false,
  });

  if (!pick) {
    return;
  }

  // اگه toggle بود
  if (pick.isToggle) {
    const next = !enabled;
    await saveSetting('enabled', next);
    applyProxySettings(next);
    vscode.window.showInformationMessage(
      next
        ? (isFa ? 'پروکسی روشن شد ✓' : 'Proxy turned ON ✓')
        : (isFa ? 'پروکسی خاموش شد ✓' : 'Proxy turned OFF ✓')
    );
    // دوباره پاپ‌آپ رو نشون بده
    showProxyPopup();
    return;
  }

  // اگه یه تنظیم بود
  if (pick.field) {
    const field = pick.field;
    const oldValue = pick.currentValue;
    let newValue;

    if (field.type === 'boolean') {
      // برای boolean مستقیم toggle کن
      newValue = !oldValue;
      await saveSetting(field.extKey, newValue);
      // اگه پروکسی روشنه، روی http.* اعمال کن
      const stillEnabled = vscode.workspace.getConfiguration('proxyToggle').get('enabled');
      if (stillEnabled) {
        applyProxySettings(true);
      }
      vscode.window.showInformationMessage(
        isFa ? `${field.extKey} = ${newValue ? 'روشن' : 'خاموش'}` : `${field.extKey} = ${newValue ? 'On' : 'Off'}`
      );
      // بررسی reload
      if (checkReloadNeeded(field.extKey, oldValue, newValue)) {
        promptReload();
      }
    } else if (field.type === 'text') {
      const input = await editTextField(field, oldValue);
      if (input !== undefined) {
        await saveSetting(field.extKey, input);
        const stillEnabled = vscode.workspace.getConfiguration('proxyToggle').get('enabled');
        if (stillEnabled) {
          applyProxySettings(true);
        }
        vscode.window.showInformationMessage(
          isFa ? `${field.extKey} ذخیره شد ✓` : `${field.extKey} saved ✓`
        );
      }
    } else if (field.type === 'number') {
      const input = await editNumberField(field, oldValue);
      if (input !== undefined && !isNaN(input)) {
        await saveSetting(field.extKey, input);
        const stillEnabled = vscode.workspace.getConfiguration('proxyToggle').get('enabled');
        if (stillEnabled) {
          applyProxySettings(true);
        }
        vscode.window.showInformationMessage(
          isFa ? `${field.extKey} = ${input}` : `${field.extKey} = ${input}`
        );
      }
    } else if (field.type === 'select') {
      const input = await editSelectField(field, oldValue);
      if (input !== undefined) {
        await saveSetting(field.extKey, input);
        const stillEnabled = vscode.workspace.getConfiguration('proxyToggle').get('enabled');
        if (stillEnabled) {
          applyProxySettings(true);
        }
        vscode.window.showInformationMessage(
          isFa ? `${field.extKey} = ${input}` : `${field.extKey} = ${input}`
        );
      }
    }

    // دوباره پاپ‌آپ رو نشون بده
    showProxyPopup();
  }
}

module.exports = {
  showProxyPopup,
  applyProxySettings,
};
