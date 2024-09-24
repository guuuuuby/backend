Bun.serve<{ id: string }>({
  port: 8001,
  fetch(request, server) {
    server.upgrade(request, {
      data: new URL(request.url).pathname.slice(1),
    });
  },
  websocket: {
    open(ws) {
      console.log('open');
      
      ws.subscribe(`live/${ws.data.id}`);
    },
    message(ws, message) {
      if (typeof message === 'string') return;

      ws.publishBinary(`live/${ws.data.id}`, message);
    },
  },
});
