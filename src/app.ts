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
      console.log('accept', session.id);
    },
    async close(ws) {
      const sessionId = m[ws.id];
      if (!sessionId) return;
      const session = await getSession(sessionId);
      if (!session) return;
      ws.publish(`disconnect/${session.id}`, { event: 'disconnect' });
      await deleteSession(session.id);
      console.log('end accept', session.id);
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
  });

export type App = typeof app;
