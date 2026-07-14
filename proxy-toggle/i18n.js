const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

// کش پیام‌ها برای جلوگیری از خواندن مکرر فایل
let cachedMessages = null;
let cachedLocale = null;

/**
 * تشخیص locale فعلی VSCode.
 * برمی‌گرداند: 'fa' ، 'en' یا کد زبان کامل مثل 'fa-ir'.
 * @returns {string}
 */
function getCurrentLocale() {
  // vscode.env.language در نسخه‌های جدید کد زبان را برمی‌گرداند (مثل 'fa' یا 'fa-ir')
  return vscode.env.language || 'en';
}

/**
 * بارگذاری پیام‌های زبان فعلی از فایل package.nls.<locale>.json.
 * اگر فایل زبان مورد نظر وجود نداشت، از package.nls.json (انگلیسی) استفاده می‌شود.
 * @returns {Record<string, string>}
 */
function loadMessages() {
  const locale = getCurrentLocale();
  if (cachedMessages && cachedLocale === locale) {
    return cachedMessages;
  }

  // مسیر پوشه اکستنشن
  const extensionPath = vscode.extensions.getExtension('Anushiravani.proxy-toggle')?.extensionPath;
  const basePath = extensionPath || __dirname;

  // ابتدا فایل پیش‌فرض (انگلیسی) را بارگذاری کن
  const defaultPath = path.join(basePath, 'package.nls.json');
  let messages = {};
  try {
    messages = JSON.parse(fs.readFileSync(defaultPath, 'utf8'));
  } catch (err) {
    console.error('[proxyToggle] خطا در بارگذاری package.nls.json:', err);
  }

  // اگر زبان فعلی فارسی است، فایل فارسی را روی انگلیسی overlay کن
  if (locale.startsWith('fa')) {
    const faPath = path.join(basePath, 'package.nls.fa.json');
    try {
      const faMessages = JSON.parse(fs.readFileSync(faPath, 'utf8'));
      messages = { ...messages, ...faMessages };
    } catch (err) {
      // اگر فایل فارسی نبود، انگلیسی استفاده می‌شود (بدون خطا)
    }
  }

  cachedMessages = messages;
  cachedLocale = locale;
  return messages;
}

/**
 * دریافت پیام ترجمه‌شده بر اساس کلید.
 * از قالب {0}, {1}, ... برای جایگزینی پارامترها پشتیبانی می‌کند.
 * @param {string} key
 * @param  {...string} args
 * @returns {string}
 */
function t(key, ...args) {
  const messages = loadMessages();
  let msg = messages[key];
  if (msg === undefined) {
    // اگر کلید پیدا نشد، خود کلید را برگردان
    msg = key;
  }
  // جایگزینی پارامترها {0}, {1}, ...
  if (args && args.length > 0) {
    for (let i = 0; i < args.length; i++) {
      msg = msg.replace(`{${i}}`, String(args[i]));
    }
  }
  return msg;
}

/**
 * پاک کردن کش (برای تست یا تغییر زبان در حین اجرا).
 */
function clearCache() {
  cachedMessages = null;
  cachedLocale = null;
}

module.exports = {
  t,
  getCurrentLocale,
  loadMessages,
  clearCache,
};
