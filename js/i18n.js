// ===== ipv8.com — i18n Module =====

const I18n = (() => {
  let currentLang = 'en';
  let translations = {};
  let translationsLoaded = false;
  const STORAGE_KEY = 'ipv8-lang';

  // Detect user's preferred language
  function detectLanguage() {
    // 1. Check URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get('lang');
    if (urlLang && ['zh', 'en'].includes(urlLang)) {
      return urlLang;
    }

    // 2. Check localStorage
    const savedLang = localStorage.getItem(STORAGE_KEY);
    if (savedLang && ['zh', 'en'].includes(savedLang)) {
      return savedLang;
    }

    // 3. Check browser language
    const browserLang = navigator.language || navigator.userLanguage || '';
    if (browserLang.startsWith('zh')) {
      return 'zh';
    }

    // 4. Default to English
    return 'en';
  }

  // Load language file
  async function loadTranslations(lang) {
    try {
      const response = await fetch(`lang/${lang}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load ${lang}.json`);
      }
      translations = await response.json();
      translationsLoaded = true;
      return true;
    } catch (error) {
      console.error('i18n: Failed to load translations:', error);
      if (lang !== 'en') {
        return loadTranslations('en');
      }
      return false;
    }
  }

  // Get nested translation value by key path
  function getTranslation(keyPath, fallback = '') {
    const keys = keyPath.split('.');
    let value = translations;
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return fallback;
      }
    }
    return typeof value === 'string' ? value : fallback;
  }

  // Apply translations to DOM
  function applyTranslations() {
    // Update html lang attribute
    document.documentElement.lang = currentLang === 'zh' ? 'zh-CN' : 'en';

    // Update page title
    const title = getTranslation('meta.title');
    if (title) document.title = title;

    // Update meta description
    const desc = getTranslation('meta.description');
    if (desc) {
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute('content', desc);
    }

    // Update all elements with data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const text = getTranslation(key);
      if (text) {
        el.textContent = text;
      }
    });

    // Update all elements with data-i18n-placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      const text = getTranslation(key);
      if (text) {
        el.placeholder = text;
      }
    });

    // Update all elements with data-i18n-title
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      const text = getTranslation(key);
      if (text) {
        el.title = text;
      }
    });

    // Update all elements with data-i18n-html (for HTML content)
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      const text = getTranslation(key);
      if (text) {
        el.innerHTML = text;
      }
    });
  }

  // Switch language
  async function switchLanguage(lang) {
    if (lang === currentLang && translationsLoaded) {
      return;
    }

    currentLang = lang;
    localStorage.setItem(STORAGE_KEY, lang);

    await loadTranslations(lang);
    applyTranslations();

    // Dispatch event for other scripts to react
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
  }

  // Initialize i18n
  async function init() {
    currentLang = detectLanguage();
    await loadTranslations(currentLang);
    applyTranslations();

    // Setup language switch button
    const langBtn = document.getElementById('langSwitch');
    if (langBtn) {
      langBtn.addEventListener('click', () => {
        const newLang = currentLang === 'zh' ? 'en' : 'zh';
        switchLanguage(newLang);
      });
    }
  }

  // Public API
  return {
    init,
    t: getTranslation,
    switchLanguage,
    getCurrentLang: () => currentLang,
    applyTranslations
  };
})();

// Export for use in other scripts
window.I18n = I18n;
