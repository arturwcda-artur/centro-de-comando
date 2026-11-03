// Service worker do Centro de Comando.
// Existe para tornar o app instalável. NÃO guarda páginas nem dados em cache: as informações
// são privadas e devem sempre vir do servidor, já autenticadas.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
  // Sem respondWith: o navegador segue com a requisição normal pela rede.
});
