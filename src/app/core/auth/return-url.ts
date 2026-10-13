/**
 * Solo se vuelve a rutas internas. Una URL como "//sitio-malo.com" o "/\sitio-malo.com"
 * la interpretaría el navegador como otro sitio (redirección abierta).
 */
export function safeReturnUrl(url: string | null | undefined, fallback = '/resumen'): string {
  if (
    !url ||
    !url.startsWith('/') ||
    url.startsWith('//') ||
    // Intencional: rechazar barras invertidas y caracteres de control.
    // eslint-disable-next-line no-control-regex
    /[\\\u0000-\u001f]/.test(url)
  ) {
    return fallback;
  }
  const path = url.split(/[?#]/)[0];
  return path === '/login' ? fallback : url;
}
