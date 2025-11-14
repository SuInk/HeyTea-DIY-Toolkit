function resolveApiRoot() {
  const envBase = (import.meta.env.VITE_API_BASE || '').trim().replace(/\/$/, '');
  if (envBase) {
    return envBase;
  }
  if (typeof window !== 'undefined') {
    return window.location.origin.replace(/\/$/, '');
  }
  return '';
}

const apiRoot = resolveApiRoot();
export const BACKEND_API_BASE = apiRoot ? `${apiRoot}/api` : '/api';
export const CAPTCHA_APP_ID = '197451715';
export const CUP_WIDTH = 596;
export const CUP_HEIGHT = 832;
export const MAX_UPLOAD_BYTES = 200 * 1024;
