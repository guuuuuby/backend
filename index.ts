import { serve } from 'bun';

serve({
  fetch(req, server) {
    const url = new URL(req.url).pathname;
    if (url === '/') {
      return new Response(
        Bun.file('./index.html'),
        { headers: { 'Content-Type': 'text/html' } }
      );
    } else if (url === '/live' || url === '/stream') {
      server.upgrade(req);
      return
    }
    return new Response('Not found', { status: 404 });
  },
  websocket: {
    open(ws) {
      ws.subscribe('stream');
    },
    message(ws, message) {
      ws.publish('stream', message);
    },
  },
  port: 3000,
});

console.log("Bun server is running on http://localhost:3000");
