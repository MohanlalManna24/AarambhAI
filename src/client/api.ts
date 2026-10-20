import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let currentCsrfToken = '';
let currentSessionToken = '';

export function setClientSecurityTokens(csrfToken?: string, sessionToken?: string) {
  if (csrfToken) currentCsrfToken = csrfToken;
  if (sessionToken) currentSessionToken = sessionToken;
}

api.interceptors.request.use((config) => {
  if (currentCsrfToken) {
    config.headers['X-CSRF-Token'] = currentCsrfToken;
  }
  if (currentSessionToken) {
    config.headers['Authorization'] = `Bearer ${currentSessionToken}`;
  }
  return config;
});

/**
 * Formats integer paise into Indian Rupee display string (e.g. ₹14,20,000).
 */
export function formatPaiseToInr(paise: number, showDecimals = false): string {
  const rupees = (Number(paise) || 0) / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(rupees);
}

export function formatInrNumber(rupees: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(rupees) || 0);
}

export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function extractErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const apiErr = err.response?.data?.error;
    if (apiErr?.message) {
      if (apiErr.details && typeof apiErr.details === 'object') {
        const firstDetail = Object.values(apiErr.details).flat()[0];
        if (typeof firstDetail === 'string') {
          return `${apiErr.message} (${firstDetail})`;
        }
      }
      return apiErr.message;
    }
  }
  if (err instanceof Error) return err.message;
  return 'An unexpected error occurred. Please try again.';
}
