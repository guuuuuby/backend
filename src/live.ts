interface WSData {
  readonly id: string;
  readonly channel: string;
}

Bun.serve<WSData>({
  port: Bun.env.LIVE_PORT ?? 8001,
  fetch(request, server) {
    const url = new URL(request.url);

    server.upgrade(request, {
      data: {
        id: new URL(request.url).pathname.slice(1),
        channel:
          request.headers.get('X-Stream-Channel') ?? url.searchParams.get('channel') ?? 'live',
      } satisfies WSData,
    });
  },
  websocket: {
    open(ws) {
      ws.subscribe(`${ws.data.channel}/${ws.data.id}`);
    },
    message(ws, message) {
      const chunk = message instanceof Buffer ? new Uint8Array(message) : message;
      
      ws.publish(`${ws.data.channel}/${ws.data.id}`, chunk);
    },
  },
});
