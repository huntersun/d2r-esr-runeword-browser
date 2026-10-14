import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router-dom';
import { store } from '@/core/store';
import { startDataSync, startAuth, startBuilds, startFavorites } from '@/core/startup';
import { ThemeInitializer } from '@/features/settings';
import { Toaster } from '@/components/ui/sonner';
import { router } from '@/core/router';
import './index.css';

// After a deploy, a browser that still holds the previous index.html (GitHub Pages caches it for 10 minutes) asks for
// chunk files whose hashes are gone, so every lazily loaded route fails. Vite reports that as `vite:preloadError`;
// reloading once fetches the current index.html. The session flag stops a reload loop when the server itself is broken.
const RELOADED_FLAG = 'chunk-reload';
window.addEventListener('vite:preloadError', (event) => {
  let reloaded = false;
  try {
    reloaded = sessionStorage.getItem(RELOADED_FLAG) !== null;
    if (!reloaded) sessionStorage.setItem(RELOADED_FLAG, String(Date.now()));
  } catch {
    // Storage blocked: reload once anyway; the loop guard is lost but the page is unusable without the chunk.
  }
  if (reloaded) return;
  event.preventDefault();
  window.location.reload();
});

// Clean up legacy TXT data database if it exists
const LEGACY_TXT_DB = 'd2r-esr-txt-data';
if (typeof indexedDB.databases === 'function') {
  indexedDB
    .databases()
    .then((dbs) => {
      if (dbs.some((db) => db.name === LEGACY_TXT_DB)) {
        const req = indexedDB.deleteDatabase(LEGACY_TXT_DB);
        req.onsuccess = () => {
          console.log(`Deleted legacy IndexedDB "${LEGACY_TXT_DB}"`);
        };
        req.onerror = () => {
          console.warn(`Failed to delete legacy IndexedDB "${LEGACY_TXT_DB}"`);
        };
      }
    })
    .catch(() => {
      // Silently ignore — legacy cleanup is best-effort
    });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <Provider store={store}>
      <ThemeInitializer />
      <RouterProvider router={router} />
      <Toaster position="bottom-right" richColors />
    </Provider>
  </StrictMode>
);

void startDataSync();
void startAuth();
void startBuilds();
void startFavorites();
