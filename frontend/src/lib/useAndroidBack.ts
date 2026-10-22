/**
 * useAndroidBack — Handles Android hardware/gesture Back button via Capacitor App plugin.
 *
 * Behaviour:
 *  - On a nested route: calls history.back() (same as React Router navigate(-1))
 *  - On the root route (/): moves the app to background via App.minimizeApp()
 *  - On the login page: moves the app to background
 *  - Listeners are cleaned up on unmount to prevent duplicate handlers
 */
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';

// Root paths where Back should background the app instead of navigating
const ROOT_PATHS = ['/', '/login'];

export function useAndroidBack() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cleanup: (() => void) | null = null;

    async function register() {
      try {
        const { App } = await import('@capacitor/app');
        const handle = await App.addListener('backButton', () => {
          // 1. If any modal or dialog is open, close it via Escape or click
          const dialog = document.querySelector('[role="dialog"], [data-modal="true"], .modal-overlay');
          if (dialog) {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
            const closeBtn = dialog.querySelector<HTMLElement>('button[aria-label="Close"], button.btn-ghost, [data-close="modal"]');
            if (closeBtn) closeBtn.click();
            return;
          }

          const isRoot = ROOT_PATHS.includes(location.pathname) || (window.history.length <= 1);

          if (isRoot) {
            // At root: move to background rather than exiting
            App.minimizeApp().catch(() => {
              App.exitApp();
            });
          } else {
            navigate(-1);
          }
        });
        cleanup = () => handle.remove();
      } catch (err) {
        console.warn('[useAndroidBack] Failed to register back listener:', err);
      }
    }

    register();

    return () => {
      if (cleanup) cleanup();
    };
  }, [navigate, location.pathname]);
}
