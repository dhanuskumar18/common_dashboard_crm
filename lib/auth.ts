import crypto from "crypto";

export const COOKIE_NAME = "hub_session";
const MAX_AGE_SECONDS = 60 * 60 * 12;

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return s;
}

function sign(data: string): string {
  return crypto.createHmac("sha256", secret()).update(data).digest("base64url");
}

export function createSession(email: string): { token: string; maxAge: number } {
  const payload = Buffer.from(
    JSON.stringify({ email, exp: Date.now() + MAX_AGE_SECONDS * 1000 }),
  ).toString("base64url");
  return { token: `${payload}.${sign(payload)}`, maxAge: MAX_AGE_SECONDS };
}

export function verifySession(token?: string): { email: string } | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!data.exp || data.exp < Date.now()) return null;
    return { email: data.email };
  } catch {
    return null;
  }
}

export function checkCredentials(email: string, password: string): boolean {
  const e = process.env.ADMIN_EMAIL || "";
  const p = process.env.ADMIN_PASSWORD || "";
  if (!e || !p) return false;
  const eq = (x: string, y: string) => {
    const a = Buffer.from(x);
    const b = Buffer.from(y);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  };
  return eq(email.trim().toLowerCase(), e.trim().toLowerCase()) && eq(password, p);
}

/** Returns the session for an API request, or null if unauthenticated. */
export function sessionFromRequest(req: Request): { email: string } | null {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.split(/;\s*/).find((c) => c.startsWith(`${COOKIE_NAME}=`));
  return verifySession(match?.slice(COOKIE_NAME.length + 1));
}
