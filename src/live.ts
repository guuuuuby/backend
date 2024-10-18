interface WSData {
  readonly id: string;
  readonly channel: string;
}

export const liveServer = Bun.serve<WSData>({
  port: Bun.env.LIVE_PORT ?? 8001,
  fetch(request, server) {
    const url = new URL(request.url);
    const sessionId = url.pathname.replace('live/', '').replace(/(?:^\/)|(?:\/$)/gi, '');

    server.upgrade(request, {
      data: {
        id: sessionId,
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

console.log(`Live server on ${liveServer.url}`)
