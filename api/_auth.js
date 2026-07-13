// Shared session-token helpers for the admin API routes.
// Credentials live in env vars, never in this repo:
//   ADMIN_USERS  = "email:sha256(email:password),email:hash"
//   AUTH_SECRET  = HMAC key for session cookies
const crypto = require("crypto");

const COOKIE = "tm_admin";
const SESSION_DAYS = 7;

function users() {
  return (process.env.ADMIN_USERS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((pair) => {
      const i = pair.indexOf(":");
      return { email: pair.slice(0, i).toLowerCase(), hash: pair.slice(i + 1) };
    });
}

function checkCredentials(email, password) {
  const em = String(email || "").toLowerCase().trim();
  const digest = crypto.createHash("sha256").update(`${em}:${password}`).digest("hex");
  return users().some((u) => {
    if (u.email !== em || u.hash.length !== digest.length) return false;
    return crypto.timingSafeEqual(Buffer.from(u.hash), Buffer.from(digest));
  })
    ? em
    : null;
}

function signToken(email) {
  const payload = Buffer.from(
    JSON.stringify({ e: email, x: Date.now() + SESSION_DAYS * 864e5 })
  ).toString("base64url");
  const sig = crypto
    .createHmac("sha256", process.env.AUTH_SECRET || "")
    .update(payload)
    .digest("hex");
  return `${payload}.${sig}`;
}

function verifyToken(token) {
  if (!token) return null;
  const i = token.lastIndexOf(".");
  if (i < 0) return null;
  const payload = token.slice(0, i);
  const sig = token.slice(i + 1);
  const expected = crypto
    .createHmac("sha256", process.env.AUTH_SECRET || "")
    .update(payload)
    .digest("hex");
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data.e || data.x < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

function tokenFromRequest(req) {
  const cookie = req.headers.cookie || "";
  const m = cookie.match(/(?:^|;\s*)tm_admin=([^;]+)/);
  return m ? m[1] : null;
}

function sessionCookie(token, maxAgeSeconds) {
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

module.exports = { checkCredentials, signToken, verifyToken, tokenFromRequest, sessionCookie, SESSION_DAYS };
