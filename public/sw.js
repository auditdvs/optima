// Failover Service Worker
// Redirects to Netlify backup when the main server is down

const BACKUP_URL = 'https://optima-database.netlify.app';
const HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds

self.addEventListener('install', (event) => {
  // Activate immediately, don't wait for old SW to finish
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim all clients immediately
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only intercept navigation requests (page loads, not API calls or assets)
  if (request.mode !== 'navigate') {
    return;
  }

  event.respondWith(
    // Try to fetch from the original server
    fetch(request, { signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT) })
      .then((response) => {
        // If we get a response, return it normally
        if (response.ok || response.type === 'opaqueredirect') {
          return response;
        }

        // If server returns error status (5xx), redirect to backup
        if (response.status >= 500) {
          return Response.redirect(BACKUP_URL + new URL(request.url).pathname, 302);
        }

        return response;
      })
      .catch((error) => {
        // Network error or timeout = server is down
        // Redirect to Netlify backup
        console.warn('[SW Failover] Main server unreachable, redirecting to backup...', error.message);
        return Response.redirect(BACKUP_URL + new URL(request.url).pathname, 302);
      })
  );
});
