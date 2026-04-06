// worker/sw.js - Source service worker file for next-pwa
// This file is used as the source for the generated service worker

// Precache manifest injection point - required by next-pwa/workbox
self.__WB_MANIFEST;

// Push notification handler
self.addEventListener("push", function (event) {
  console.log("[Service Worker] Push Received.");

  let title = "Notifikasi Baru";
  let options = {
    body: "Anda menerima pesan baru.",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/badge-72x72.png",
    vibrate: [200, 100, 200],
    tag: "default-notification-tag",
    renotify: true,
    data: {
      url: self.registration.scope,
    },
  };

  if (event.data) {
    const dataText = event.data.text();
    console.log(`[Service Worker] Push had this data: "${dataText}"`);
    try {
      const jsonData = JSON.parse(dataText);
      title = jsonData.title || title;
      options.body = jsonData.body || options.body;
      options.icon = jsonData.icon || options.icon;
      options.badge = jsonData.badge || options.badge;
      options.vibrate = jsonData.vibrate || options.vibrate;
      options.tag = jsonData.tag || options.tag;
      if (jsonData.renotify !== undefined) {
        options.renotify = jsonData.renotify;
      }
      options.data = {
        ...options.data,
        ...(jsonData.data || {}),
        url: (jsonData.data && jsonData.data.url) || options.data.url,
      };
      if (jsonData.image) {
        options.image = jsonData.image;
      }
      if (jsonData.actions) {
        options.actions = jsonData.actions;
      }
    } catch (e) {
      console.error(
        "[Service Worker] Error parsing push data (kemungkinan teks biasa):",
        e
      );
      options.body = dataText;
    }
  } else {
    console.log("[Service Worker] Push event tidak membawa data payload.");
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click handler
self.addEventListener("notificationclick", function (event) {
  console.log("[Service Worker] Notification click Received.");
  event.notification.close();

  const urlToOpen = new URL(
    event.notification.data && event.notification.data.url
      ? event.notification.data.url
      : self.registration.scope,
    self.location.origin
  ).href;

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then(function (clientList) {
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (
            new URL(client.url, self.location.origin).href === urlToOpen &&
            "focus" in client
          ) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Push subscription change handler
self.addEventListener("pushsubscriptionchange", function (event) {
  console.log("[Service Worker]: 'pushsubscriptionchange' event fired.");
});
