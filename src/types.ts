import { t, type Static, type TSchema } from 'elysia';

type Resolve<T extends () => TSchema> = Static<ReturnType<T>>;

export const File = () =>
  t.Object({
    type: t.Literal('file'),
    name: t.String(),
    bytes: t.Number(),
  });

export const Folder = () =>
  t.Object({
    type: t.Literal('folder'),
    name: t.String(),
  });

export const FSObject = () => t.Union([File(), Folder()]);

export const Point2D = () => t.Object({ x: t.Number(), y: t.Number() });

export const KeypressEvent = () =>
  t.Object({
    action: t.Union([t.Literal('down'), t.Literal('up')]),
    key: t.String(),
    keyCode: t.String(),
    modifiers: t.Array(
      t.Union([t.Literal('shift'), t.Literal('control'), t.Literal('meta'), t.Literal('alt')])
    ),
  });

export const TerminalEvent = () => t.Object({
  action: t.Union([t.Literal('open'), t.Literal('sync'), t.Literal('close')]),
  columns: t.Optional(t.Number()),
  lines: t.Optional(t.Number()),
});

export type FSObject = Resolve<typeof FSObject>;
export type FSFile = Resolve<typeof File>;
export type FSFolder = Resolve<typeof Folder>;
export type Point2D = Resolve<typeof Point2D>;
export type KeypressEvent = Resolve<typeof KeypressEvent>;
export type TerminalEvent = Resolve<typeof TerminalEvent>;
