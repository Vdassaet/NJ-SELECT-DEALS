/**
 * Client-safe security utilities.
 * Can be safely imported in both client ('use client') and server components.
 */

/**
 * Sanitizes post-login redirect URLs to prevent open redirect phishing.
 * Only allows relative local paths starting with '/' and not '//' or '/\'.
 */
export function sanitizeRedirectUrl(url: string | null | undefined, fallback: string = '/account'): string {
  if (!url || typeof url !== 'string') return fallback;
  const trimmed = url.trim();

  // Reject protocol-relative or absolute external URLs
  if (
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('/\\') ||
    trimmed.includes('http:') ||
    trimmed.includes('https:') ||
    trimmed.includes('\\')
  ) {
    return fallback;
  }

  return trimmed;
}

/**
 * Safely stringifies objects for JSON-LD script tags, escaping '<', '>', '&',
 * to prevent premature script element closing and XSS attacks.
 */
export function sanitizeJsonLd(data: Record<string, any>): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}
