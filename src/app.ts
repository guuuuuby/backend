import Elysia, { error, t } from 'elysia';
import { createSession, deleteSession, getSession } from './sessions';
import { FSObject } from './types';

const m: Partial<Record<string, string>> = {};

export type * from './types';

export const app = new Elysia()
  .ws('accept', {
    response: t.Union([
      t.Object({ id: t.String() }),
      t.Object({ event: t.Literal('disconnect') }),
      t.Object({ requestId: t.String(), request: t.Literal('ls'), path: t.String() }),
      t.Object({
        requestId: t.String(),
        event: t.Literal('ls'),
        path: t.String(),
        contents: t.Array(FSObject()),
      }),
    ]),
    body: t.Object({
      requestId: t.String(),
      event: t.Literal('ls'),
      path: t.String(),
      contents: t.Array(FSObject()),
    }),
    async open(ws) {
      const session = await createSession({
        ls: (id, url) => ws.send({ requestId: id, request: 'ls', path: url }),
      });
      m[ws.id] = session.id;
      ws.data.params ??= { id: session.id };
      ws.send({ id: session.id });
      ws.subscribe(`control/${session.id}`);
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
    async message(ws, message) {
      const sessionId = m[ws.id];
      if (!sessionId) return;
      const session = await getSession(sessionId);
      if (!session) return;

      if (message.event === 'ls') {
        session.resolveRequest(message.requestId, message.contents);
      }
    },
  })
  .ws('join/:sessionId', {
    response: t.Union([
      t.Object({ event: t.Literal('disconnect') }),
      t.Object({ request: t.Literal('ls'), path: t.String() }),
      t.Object({ event: t.Literal('ls'), path: t.String(), contents: t.Array(FSObject()) }),
    ]),
    async open(ws) {
      const session = await getSession(ws.data.params.sessionId);

      if (!session) {
        ws.close();
        return;
      }

      ws.subscribe(`disconnect/${session.id}`);
    },
  })
  .get(
    'ls',
    async ({ body: { url, sessionId } }) => {
      const session = await getSession(sessionId);

      if (!session) throw error('Not Found');

      return await session.ls(url);
    },
    {
      body: t.Object({
        sessionId: t.String(),
        url: t.String(),
      }),
      response: t.Array(FSObject()),
    }
  );

export type App = typeof app;
