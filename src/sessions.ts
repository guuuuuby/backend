import type { KeypressEvent, Point2D } from './types';

type OP<P = any> = (id: string, p: P) => void;
type LS = OP<string>;
type MouseClick = OP<{ aux: boolean; point: Point2D }>;
type Keypress = OP<KeypressEvent>;
type RM = OP<string>;

interface OPs {
  ls: LS;
  rm: RM;
  click: MouseClick;
  keypress: Keypress;
}

export class Session implements Session {
  static readonly REQUEST_TIMEOUT = 30_000;

  readonly id: string = crypto.randomUUID();
  readonly #ops: OPs;
  readonly #requests: Record<string, (response: any) => void> = Object.create(null);

  constructor(ops: OPs) {
    this.#ops = ops;
  }

  resolveRequest(id: string, response: any) {
    this.#requests[id](response);
  }

  call<R, O extends keyof OPs>(op: O, arg: Parameters<OPs[O]>[1]): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      const requestId = crypto.randomUUID();

      const timeout = setTimeout(() => {
        reject();
        delete this.#requests[requestId];
      }, Session.REQUEST_TIMEOUT);

      this.#requests[requestId] = (response) => {
        clearTimeout(timeout);
        resolve(response);
        delete this.#requests[requestId];
      };

      this.#ops[op].call(null, requestId, arg as any);
    });
  }

  callRaw<O extends keyof OPs>(op: O, arg: Parameters<OPs[O]>[1]) {
    this.#ops[op].call(null, crypto.randomUUID(), arg as any);
  }
}

const map: Partial<Record<string, Session>> = Object.create(null);

export async function getSession(key: string): Promise<Session | null> {
  return map[key] ?? null;
}

export async function createSession(ops: OPs): Promise<Session> {
  const session = new Session(ops);
  map[session.id] = session;
  return session;
}

export async function deleteSession(key: string) {
  delete map[key];
}
