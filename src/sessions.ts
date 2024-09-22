export interface Session {
  readonly id: string;
}

const map: Partial<Record<string, Session>> = Object.create(null);

export async function getSession(key: string): Promise<Session | null> {
  return map[key] ?? null;
}

export async function createSession(key: string): Promise<Session> {
  const session: Session = { id: crypto.randomUUID() };
  map[key] = session;
  return session;
}

export async function deleteSession(key: string) {
  delete map[key];
}
