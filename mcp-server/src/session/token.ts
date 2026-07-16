import type { SessionState } from './types.js';

const ENC = new TextEncoder();

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    ENC.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

function b64url(buf: ArrayBuffer | Uint8Array): string {
  const view = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return btoa(String.fromCharCode(...view))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function fromB64url(s: string): Uint8Array {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice((s.length + 3) % 4 || 4);
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}

export async function signToken(state: SessionState, secret: string): Promise<string> {
  const payload = b64url(ENC.encode(JSON.stringify(state)));
  const key     = await importKey(secret);
  const sig     = await crypto.subtle.sign('HMAC', key, ENC.encode(payload));
  return `${payload}.${b64url(sig)}`;
}

export async function verifyToken(token: string, secret: string): Promise<SessionState | null> {
  const dot = token.lastIndexOf('.');
  if (dot === -1) return null;

  const payload = token.slice(0, dot);
  const sigB64  = token.slice(dot + 1);

  const key   = await importKey(secret);
  const valid = await crypto.subtle.verify('HMAC', key, new Uint8Array(fromB64url(sigB64)), ENC.encode(payload));
  if (!valid) return null;

  try {
    return JSON.parse(new TextDecoder().decode(fromB64url(payload))) as SessionState;
  } catch {
    return null;
  }
}

export async function updateToken(
  token: string,
  secret: string,
  patch: Partial<SessionState>,
): Promise<string | null> {
  const state = await verifyToken(token, secret);
  if (!state) return null;
  return signToken({ ...state, ...patch, turn_count: (state.turn_count ?? 0) + 1 }, secret);
}
