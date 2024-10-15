interface WSData {
  readonly id: string;
  readonly willStream: boolean;
  readonly channel: string;
}

Bun.serve<WSData>({
  port: 8001,
  fetch(request, server) {
    const url = new URL(request.url);

    server.upgrade(request, {
      data: {
        id: new URL(request.url).pathname.slice(1),
        willStream:
          (request.headers.get('X-Will-Stream') ?? url.searchParams.get('willStream')) === 'true',
        channel:
          request.headers.get('X-Stream-Channel') ?? url.searchParams.get('channel') ?? 'live',
      } satisfies WSData,
    });
  },
  websocket: {
    open(ws) {
      if (ws.data.willStream) return;

      ws.subscribe(`${ws.data.channel}/${ws.data.id}`);
    },
    message(ws, message) {
      const chunk = message instanceof Buffer ? new Uint8Array(message) : message;
      
      ws.publish(`${ws.data.channel}/${ws.data.id}`, chunk);
    },
  },
});
