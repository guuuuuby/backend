export interface Session {
  readonly id: string;
}

const map: Partial<Record<string, Session>> = Object.create(null);

export async function getSession(key: string): Promise<Session | null> {
  return map[key] ?? null;
}

export async function createSession(): Promise<Session> {
  const id = crypto.randomUUID();
  const session: Session = { id };
  map[id] = session;
  return session;
}

export async function deleteSession(key: string) {
  delete map[key];
}
