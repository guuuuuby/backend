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

export type FSObject = Resolve<typeof FSObject>;
export type FSFile = Resolve<typeof File>;
export type FSFolder = Resolve<typeof Folder>;