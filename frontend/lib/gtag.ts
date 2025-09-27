// File: lib/gtag.ts

// This tells TypeScript that the `gtag` function exists on the global `window` object.
declare global {
  interface Window {
    gtag: (
      command: 'config' | 'event',
      action: string,
      params?: { [key: string]: any }
    ) => void;
  }
}

/**
 * Logs a custom event to Google Analytics.
 * @param {string} action - The name of the event (e.g., 'create_invoice').
 * @param {object} [params] - Optional parameters to send with the event.
 */
export const logEvent = (action: string, params?: { [key: string]: any }) => {
  // Check if the gtag function is available to avoid errors.
  if (typeof window.gtag === 'function') {
    window.gtag('event', action, params);
  }
};