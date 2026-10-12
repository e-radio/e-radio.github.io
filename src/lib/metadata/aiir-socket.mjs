export function subscribeAiir(serviceId, onMessage, { WebSocketImpl = WebSocket } = {}) {
  if (!/^\d+$/u.test(String(serviceId || ''))) throw new Error('Invalid AIIR service ID');
  let socket;
  let retryTimer;
  let closed = false;
  let retryMs = 1000;
  const connect = () => {
    if (closed) return;
    socket = new WebSocketImpl('wss://metadata.aiir.net/now-playing');
    socket.addEventListener('open', () => {
      retryMs = 1000;
      socket.send(JSON.stringify({ action: 'subscribe', serviceId: String(serviceId) }));
    });
    socket.addEventListener('message', event => {
      try {
        const payload = JSON.parse(event.data);
        if (String(payload.serviceId) === String(serviceId)) onMessage(payload);
      } catch { /* Ignore malformed messages. */ }
    });
    socket.addEventListener('close', () => {
      if (closed) return;
      retryTimer = setTimeout(connect, retryMs);
      retryMs = Math.min(retryMs * 2, 30000);
    });
  };
  connect();
  return () => {
    closed = true;
    clearTimeout(retryTimer);
    socket?.close();
  };
}
