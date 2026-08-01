import { useEffect } from 'react';
import { Platform } from 'react-native';

const GTM_ID = 'GTM-55CDF4RM';

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export function GoogleTagManager() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    if (document.getElementById('gtm-script')) return;

    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push({
      'gtm.start': new Date().getTime(),
      event: 'gtm.js',
    });

    const script = document.createElement('script');
    script.id = 'gtm-script';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
    document.head.appendChild(script);

    const noscript = document.createElement('noscript');
    noscript.id = 'gtm-noscript';
    noscript.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${GTM_ID}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
    document.body.insertBefore(noscript, document.body.firstChild);
  }, []);

  return null;
}
