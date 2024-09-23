import Elysia, { t } from 'elysia';
import { createSession, deleteSession, getSession } from './sessions';

const m: Partial<Record<string, string>> = {};

export const app = new Elysia()
  .get('/', () => 'h')
  .ws('accept', {
    response: t.Union([t.Object({ id: t.String() }), t.Object({ event: t.Literal('disconnect') })]),
    async open(ws) {
      const session = await createSession();
      m[ws.id] = session.id;
      ws.data.params ??= { id: session.id };
      ws.send({ id: session.id });
    },
    async close(ws) {
      const sessionId = m[ws.id];
      if (!sessionId) return;
      const session = await getSession(sessionId);
      if (!session) return;
      ws.publish(`disconnect/${session.id}`, { event: 'disconnect' });
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
