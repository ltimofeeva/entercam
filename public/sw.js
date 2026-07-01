// Этот сайт больше не использует service worker / офлайн-кеш.
// Скрипт-«убийца»: подхватывает уже установленные у пользователей воркеры
// (в т.ч. от предыдущих версий приложения), захватывает открытые вкладки
// и принудительно перезагружает их со свежими файлами, затем удаляет себя
// и все кеши, чтобы больше не мешать загрузке сайта.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    self.clients
      .claim()
      .then(() => self.clients.matchAll({ type: "window" }))
      .then((clients) =>
        Promise.all(clients.map((client) => client.navigate(client.url)))
      )
      .then(() => self.registration.unregister())
      .then(() => caches.keys())
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
  );
});
