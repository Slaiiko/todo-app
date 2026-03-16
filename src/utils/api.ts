/**
 * Get the full API URL for an endpoint
 * Uses VITE_API_BASE_URL environment variable if set
 */
export const getAPIUrl = (endpoint: string): string => {
  const base = (import.meta.env.VITE_API_BASE_URL || '').trim();

  if (typeof window !== 'undefined') {
    const currentOrigin = window.location.origin;
    const isCurrentLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);

    if (isCurrentLocal) {
      return `/api${endpoint}`;
    }

    if (base) {
      try {
        const configuredUrl = new URL(base, currentOrigin);
        const isConfiguredLocal = ['localhost', '127.0.0.1'].includes(configuredUrl.hostname);

        if (isConfiguredLocal && isCurrentLocal && configuredUrl.port !== window.location.port) {
          return `${currentOrigin}/api${endpoint}`;
        }

        return `${configuredUrl.origin}/api${endpoint}`;
      } catch {
        // Fallback to same-origin API below.
      }
    }

    return `/api${endpoint}`;
  }

  return `${base}/api${endpoint}`;
};
