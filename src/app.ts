import Elysia, { error, t } from 'elysia';
import { createSession, deleteSession, getSession } from './sessions';
import { FSObject, KeypressEvent, Point2D, TerminalEvent } from './types';
import staticPlugin from '@elysiajs/static';
import { downloadFromWS } from './downloadFromWS';

const m: Partial<Record<string, string>> = {};

export type * from './types';

const stream = async (url: string | URL) => {
  const response = await fetch(url);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
};

export const app = new Elysia()
  .use(
    staticPlugin({
      prefix: '/',
      assets: 'static',
      indexHTML: true,
    })
  )
  .get('/guby-macos', () =>
    stream('https://github.com/guuuuuby/dimon/releases/latest/download/guby-darwin')
  )
  .get('/guby-linux', () =>
    stream('https://github.com/guuuuuby/dimon/releases/latest/download/guby-linux')
  )
  .get('/guby-win32.exe', () =>
    stream('https://github.com/guuuuuby/dimon/releases/latest/download/guby-win32.exe')
  )
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
      t.Object({
        requestId: t.String(),
        request: t.Literal('mouseClick'),
        aux: t.Boolean(),
        point: Point2D(),
      }),
      t.Object({
        requestId: t.String(),
        request: t.Literal('keypress'),
        event: KeypressEvent(),
      }),
      t.Object({
        requestId: t.String(),
        request: t.Literal('rm'),
        path: t.String(),
      }),
      t.Object({
        requestId: t.String(),
        request: t.Literal('mv'),
        url: t.String(),
        destinationUrl: t.String(),
      }),
      t.Object({
        requestId: t.String(),
        request: t.Literal('download'),
        url: t.String(),
      }),
      t.Object({
        requestId: t.String(),
        request: t.Literal('terminal'),
        event: TerminalEvent(),
      }),
    ]),
    body: t.Union([
      t.Object({
        requestId: t.String(),
        event: t.Literal('ls'),
        path: t.String(),
        contents: t.Array(FSObject()),
      }),
      t.Object({
        requestId: t.String(),
        event: t.Literal('rm'),
        success: t.Boolean(),
      }),
      t.Object({
        requestId: t.String(),
        event: t.Literal('mv'),
        success: t.Boolean(),
      }),
    ]),
    async open(ws) {
      const session = await createSession({
        ls: (id, url) => ws.send({ requestId: id, request: 'ls', path: url }),
        click: (id, { aux, point }) =>
          ws.send({ requestId: id, request: 'mouseClick', aux, point }),
        keypress: (id, event) => ws.send({ requestId: id, request: 'keypress', event }),
        rm: (id, path) => ws.send({ requestId: id, request: 'rm', path }),
        mv: (id, args) => ws.send({ requestId: id, request: 'mv', ...args }),
        download: (id, url) => ws.send({ requestId: id, request: 'download', url }),
        terminal: (id, event) => ws.send({ requestId: id, request: 'terminal', event }),
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
      if (!session || 'event' in message === false) return;

      if (message.event === 'ls') {
        session.resolveRequest(message.requestId, message.contents);
      } else if (message.event === 'rm') {
        session.resolveRequest(message.requestId, message.success);
      } else if (message.event === 'mv') {
        session.resolveRequest(message.requestId, message.success);
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
  .post(
    'ls',
    async ({ body: { url, sessionId } }) => {
      const session = await getSession(sessionId);

      if (!session) throw error('Not Found');

      return await session.call('ls', url);
    },
    {
      body: t.Object({
        sessionId: t.String(),
        url: t.String(),
      }),
      response: t.Array(FSObject()),
    }
  )
  .post(
    'click',
    async ({ body: { sessionId, ...calldata } }) => {
      const session = await getSession(sessionId);

      if (!session) throw error('Not Found');

      session.callRaw('click', calldata);
    },
    {
      body: t.Object({
        sessionId: t.String(),
        aux: t.Boolean(),
        point: Point2D(),
      }),
    }
  )
  .post(
    'keypress',
    async ({ body: { sessionId, event } }) => {
      const session = await getSession(sessionId);

      if (!session) throw error('Not Found');

      session.callRaw('keypress', event);
    },
    { body: t.Object({ sessionId: t.String(), event: KeypressEvent() }) }
  )
  .delete(
    'rm',
    async ({ body: { sessionId, url } }) => {
      const session = await getSession(sessionId);

      if (!session) throw error('Not Found');

      return await session.call('rm', url);
    },
    {
      body: t.Object({
        sessionId: t.String(),
        url: t.String(),
      }),
      response: t.Boolean(),
    }
  )
  .put(
    'mv',
    async ({ body: { sessionId, ...args } }) => {
      const session = await getSession(sessionId);

      if (!session) throw error('Not Found');

      return await session.call('mv', args);
    },
    {
      body: t.Object({
        sessionId: t.String(),
        url: t.String(),
        destinationUrl: t.String(),
      }),
      response: t.Boolean(),
    }
  )
  .get(
    'download/:sessionId/*',
    async ({ params: { sessionId }, query: { url } }) => {
      const session = await getSession(sessionId);

      if (!session) throw error('Not Found');

      const requestId = crypto.randomUUID();
      const channel = encodeURIComponent(`${requestId}/${url}`);
      const socketUrl = `ws://localhost:8001/?channel=${channel}&willStream=false`;
      const { stream, contentLength } = await downloadFromWS(socketUrl);

      session.callRaw('download', url, requestId);

      return new Response(stream, {
        headers: {
          'Content-Length': contentLength.toString(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    },
    {
      query: t.Object({ url: t.String() }),
    }
  )
  .put(
    'terminal',
    async ({ body: { sessionId, event } }) => {
      const session = await getSession(sessionId);

      if (!session) throw error('Not Found');

      session.callRaw('terminal', event);
    },
    {
      body: t.Object({
        sessionId: t.String(),
        event: TerminalEvent(),
      }),
    }
  );

export type App = typeof app;
