# Proxy Toggle / پراکسی تاگل

**A simple VSCode extension to toggle and configure proxy settings with a single button.**

**یک اکستنشن ساده برای روشن/خاموش کردن و تنظیم پروکسی داخل VSCode.**

---

## Features / امکانات

| English | فارسی |
|---|---|
| On/Off toggle button in the status bar | دکمه روشن/خاموش در نوار وضعیت |
| One-click apply of proxy settings to VSCode | اعمال سریع تنظیمات پروکسی روی VSCode با یک کلیک |
| Full settings panel for all HTTP proxy-related options | پنل تنظیمات کامل برای همه‌ی تنظیمات HTTP مربوط به پروکسی |
| Bilingual UI (English / Persian) — auto-detected from VSCode language | رابط کاربری دوزبانه (انگلیسی/فارسی) — تشخیص خودکار از زبان VSCode |
| Reload Window popup for settings that require it | پاپ‌آپ Reload Window برای تنظیماتی که نیاز دارند |

### Managed Settings / تنظیمات مدیریت‌شده

| Setting | Description |
|---|---|
| `http.proxy` | Proxy address / آدرس پروکسی |
| `http.proxyAuthorization` | Authorization header / هدر Authorization |
| `http.proxyStrictSSL` | Strict SSL verification / بررسی دقیق SSL |
| `http.proxySupport` | Support mode (`off`/`on`/`fallback`/`override`) / حالت پشتیبانی |
| `http.noProxy` | Excluded hosts / هاست‌های مستثنی |
| `http.useLocalProxyConfiguration` | Local proxy config during remote dev / تنظیمات محلی هنگام ریموت |
| `http.experimental.networkInterfaceCheckInterval` | Network check interval (default 300) / بازه بررسی شبکه (پیش‌فرض ۳۰۰) |
| `http.experimental.systemCertificatesV2` | Experimental CA certs V2 / گواهی آزمایشی V2 |
| `http.fetchAdditionalSupport` | Extended fetch support / پشتیبانی اضافی fetch |
| `http.systemCertificates` | OS CA certificates / گواهی‌های سیستم |
| `http.systemCertificatesNode` | Node.js system certificates / گواهی سیستم با Node.js |

---

## Usage / نحوه استفاده

1. Click the `Proxy: ON` / `Proxy: OFF` button in the status bar (bottom-right) to toggle the proxy.
   - روی دکمه‌ی `Proxy: ON` / `Proxy: OFF` در نوار وضعیت (پایین-راست) کلیک کنید تا پروکسی روشن/خاموش شود.

2. Run `Proxy Toggle: Open Proxy Settings` from the Command Palette (`Ctrl+Shift+P`) to open the settings panel.
   - از Command Palette دستور `Proxy Toggle: باز کردن تنظیمات پروکسی` را اجرا کنید تا پنل تنظیمات باز شود.

3. Set your desired values (proxy URL, Strict SSL, etc.). When the proxy is ON, changes are applied immediately.
   - مقادیر دلخواه (آدرس پروکسی، Strict SSL و ...) را تنظیم کنید. هنگام روشن بودن پروکسی، تغییرات بلافاصله اعمال می‌شوند.

4. If a setting requires a reload (e.g. `systemCertificates` on Windows/macOS, or `systemCertificatesNode`), a popup will appear asking you to reload the window.
   - اگر تنظیمی نیاز به reload داشته باشد (مثل `systemCertificates` در ویندوز/مک یا `systemCertificatesNode`)، پاپ‌آپی نمایش داده می‌شود که بارگذاری مجدد پنجره را پیشنهاد می‌دهد.

---

## Language / زبان

The extension automatically detects your VSCode display language:
- If set to Persian (`fa`), the UI and settings descriptions appear in Persian.
- Otherwise, English is used by default.

اکستنشن به‌طور خودکار زبان نمایش VSCode شما را تشخیص می‌دهد:
- اگر فارسی (`fa`) باشد، رابط کاربری و توضیحات تنظیمات به فارسی نمایش داده می‌شوند.
- در غیر این صورت، انگلیسی استفاده می‌شود.

To change VSCode language: `Ctrl+Shift+P` → `Configure Display Language`.
برای تغییر زبان VSCode: `Ctrl+Shift+P` → `Configure Display Language`.

---

## Installation / نصب

```bash
cd proxy-toggle
npm install
# Package into a .vsix file:
npx @vscode/vsce package
# Install in VSCode:
code --install-extension proxy-toggle-0.0.1.vsix
```

Or for testing: open the folder in VSCode and press `F5` (requires `@types/vscode` and `vsce`).

یا برای تست: پوشه را در VSCode باز کنید و `F5` را بزنید.

---

## License / مجوز

MIT
