/**
 * Get the full API URL for an endpoint
 * Uses VITE_API_BASE_URL environment variable if set
 */
export const getAPIUrl = (endpoint: string): string => {
  const base = import.meta.env.VITE_API_BASE_URL || '';
  return `${base}/api${endpoint}`;
};
