import Elysia, { t } from 'elysia';
import { createSession, deleteSession, getSession } from './sessions';

export const app = new Elysia()
  .get('/', () => 'h')
  .ws('accept', {
    response: t.Union([t.Object({ id: t.String() }), t.Object({ event: t.Literal('disconnect') })]),
    async open(ws) {
      const session = await createSession(ws.id);
      ws.send({ id: session.id });
    },
    async close(ws) {
      const session = await getSession(ws.id);
      if (!session) return;
      ws.publish(`disconnect/${session.id}`);
      await deleteSession(ws.id);
    },
  })
  .ws('join/:sessionId', {
    response: t.Object({ event: t.Literal('disconnect') }),
    async open(ws) {
      const session = await getSession(ws.data.params.sessionId);

      if (!session) {
        ws.close();
        return;
      }

      ws.subscribe(`disconnect/${session.id}`);
    },
  })
  .group('stream/:sessionId', (group) =>
    group
      .ws('/live', {
        async message(ws, message) {
          const session = await getSession(ws.data.params.sessionId);

          if (!session) {
            ws.close();
            return;
          }

          ws.publish(`live/${session.id}`, message);
        },
      })
      .ws('/', {
        open: (ws) => void ws.subscribe(`live/${ws.data.params.sessionId}`),
      })
  );

export type App = typeof app;
