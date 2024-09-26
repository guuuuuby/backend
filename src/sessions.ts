import type { FSObject } from './types';

export interface Session {
  readonly id: string;
  ls(url: string): Promise<FSObject[]>;
}

type LS = (id: string, url: string) => void;

export class Session implements Session {
  readonly id: string = crypto.randomUUID();
  readonly #ls: LS;
  readonly #fsRequests: Record<string, (response: FSObject[]) => void> = Object.create(null);

  constructor(ls: LS) {
    this.#ls = ls;
  }

  resolveRequest(id: string, response: FSObject[]) {
    this.#fsRequests[id](response);
  }

  ls(url: string): Promise<FSObject[]> {
    return new Promise((resolve, reject) => {
      const requestId = crypto.randomUUID();

      const timeout = setTimeout(() => {
        reject();
        delete this.#fsRequests[requestId];
      }, 30_000);

      this.#fsRequests[requestId] = (response) => {
        clearTimeout(timeout);
        resolve(response);
        delete this.#fsRequests[requestId];
      };

      this.#ls(requestId, url);
    });
  }
}

const map: Partial<Record<string, Session>> = Object.create(null);

export async function getSession(key: string): Promise<Session | null> {
  return map[key] ?? null;
}

export async function createSession({ ls }: { ls: LS }): Promise<Session> {
  const id = crypto.randomUUID();
  const session = new Session(ls);
  map[id] = session;
  return session;
}

export async function deleteSession(key: string) {
  delete map[key];
}
