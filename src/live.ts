interface WSData {
  readonly id: string;
  readonly willStream: boolean;
}

Bun.serve<WSData>({
  port: 8001,
  fetch(request, server) {
    server.upgrade(request, {
      data: {
        id: new URL(request.url).pathname.slice(1),
        willStream: request.headers.get('X-Will-Stream') === 'true',
      } satisfies WSData,
    });
  },
  websocket: {
    open(ws) {
      if (ws.data.willStream) return;

      ws.subscribe(`live/${ws.data.id}`);
    },
    message(ws, message) {
      if (typeof message === 'string') return;

      ws.publishBinary(`live/${ws.data.id}`, message);
    },
  },
});
